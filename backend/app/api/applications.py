from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks,Query
from sqlalchemy.orm import Session, joinedload
from typing import List
from pydantic import BaseModel
from app.db.database import get_db
from app.core.security import require_role
from app.models.user import User, Application, Job, ApplicationStatus
from app.schemas.schemas import ApplicationCreate, ApplicationStatusUpdate, ApplicationOut

# ✅ Email imports
from app.services.email_service import (
    send_application_received_email,
    send_application_status_email
)

router = APIRouter(prefix="/api/applications", tags=["Applications"])

class PaginatedApplications(BaseModel):
    items: list
    total: int
    page: int
    page_size: int
    total_pages: int
 
    class Config:
        from_attributes = True
# ── Seeker ────────────────────────────────────────────────────────────────────

@router.post("", response_model=ApplicationOut, status_code=201)
def apply_to_job(
    payload: ApplicationCreate,
    background_tasks: BackgroundTasks,   # ✅ ADDED
    current_user: User = Depends(require_role("seeker")),
    db: Session = Depends(get_db),
):
    if not current_user.seeker_profile:
        raise HTTPException(status_code=400, detail="Create a seeker profile before applying.")

    job = db.query(Job).filter(Job.id == payload.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != "active":
        raise HTTPException(status_code=400, detail="This job is no longer accepting applications")

    existing = db.query(Application).filter(
        Application.job_id == payload.job_id,
        Application.seeker_id == current_user.seeker_profile.id,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="You have already applied to this job")

    application = Application(
        job_id=payload.job_id,
        seeker_id=current_user.seeker_profile.id,
        cover_letter=payload.cover_letter,
        resume_url=current_user.seeker_profile.resume_url,
    )
    db.add(application)
    db.commit()
    db.refresh(application)

    # ✅ Send email to employer (background)
    try:
        employer = db.query(User).filter(
            User.id == job.employer.user_id
        ).first()

        if employer:
            background_tasks.add_task(
                send_application_received_email,
                to=employer.email,
                applicant_name=current_user.seeker_profile.full_name or current_user.email,
                job_title=job.title,
                company=job.employer.company_name,
            )
    except Exception as e:
        print(f"[EMAIL ERROR - APPLY] {e}")

    return application


@router.get("/my-applications")
def get_my_applications(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    status: str = Query(None, description="Filter by status"),
    current_user: User = Depends(require_role("seeker")),
    db: Session = Depends(get_db),
):
    q = (
        db.query(Application)
        .options(joinedload(Application.job).joinedload(Job.employer))
        .filter(Application.seeker_id == current_user.seeker_profile.id)  # ✅ FIXED

    )
 
    if status:
        q = q.filter(Application.status == status)
 
    total = q.count()
    items = (
        q.order_by(Application.applied_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
 
    return {
        "items":       items,
        "total":       total,
        "page":        page,
        "page_size":   page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }

@router.delete("/{application_id}", status_code=200)
def withdraw_application(
    application_id: int,
    current_user: User = Depends(require_role("seeker")),
    db: Session = Depends(get_db),
):
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    if app.seeker_id != current_user.seeker_profile.id:
        raise HTTPException(status_code=403, detail="Not your application")
    if app.status in (ApplicationStatus.hired, ApplicationStatus.rejected):
        raise HTTPException(status_code=400, detail="Cannot withdraw a finalized application")

    app.status = ApplicationStatus.withdrawn
    db.commit()
    return {"message": "Application withdrawn successfully"}


# ── Employer ──────────────────────────────────────────────────────────────────

@router.get("/job/{job_id}", response_model=List[ApplicationOut])
def get_applications_for_job(
    job_id: int,
    current_user: User = Depends(require_role("employer")),
    db: Session = Depends(get_db),
):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.employer_id != current_user.employer_profile.id:
        raise HTTPException(status_code=403, detail="Not your job")

    apps = (
        db.query(Application)
        .options(joinedload(Application.seeker))
        .filter(Application.job_id == job_id)
        .order_by(Application.applied_at.desc())
        .all()
    )
    return apps


@router.patch("/{application_id}/status", response_model=ApplicationOut)
def update_application_status(
    application_id: int,
    payload: ApplicationStatusUpdate,
    background_tasks: BackgroundTasks,   # ✅ ADDED
    current_user: User = Depends(require_role("employer")),
    db: Session = Depends(get_db),
):
    app = (
        db.query(Application)
        .options(joinedload(Application.job))
        .filter(Application.id == application_id)
        .first()
    )
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    if app.job.employer_id != current_user.employer_profile.id:
        raise HTTPException(status_code=403, detail="Not your job's application")

    app.status = payload.status
    if payload.employer_notes:
        app.employer_notes = payload.employer_notes

    db.commit()
    db.refresh(app)

    # ✅ Send email to applicant (background)
    try:
        applicant = db.query(User).filter(
            User.id == app.seeker_id
        ).first()

        if applicant:
            seeker_name = (
                applicant.seeker_profile.full_name
                if applicant.seeker_profile
                else applicant.email
            )

            background_tasks.add_task(
                send_application_status_email,
                to=applicant.email,
                applicant_name=seeker_name,
                job_title=app.job.title,
                company=app.job.employer.company_name,
                new_status=payload.status,
            )
    except Exception as e:
        print(f"[EMAIL ERROR - STATUS] {e}")

    return app


@router.get("/{application_id}", response_model=ApplicationOut)
def get_application_detail(
    application_id: int,
    current_user: User = Depends(require_role("employer", "seeker", "admin")),
    db: Session = Depends(get_db),
):
    app = (
        db.query(Application)
        .options(joinedload(Application.job), joinedload(Application.seeker))
        .filter(Application.id == application_id)
        .first()
    )
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    return app