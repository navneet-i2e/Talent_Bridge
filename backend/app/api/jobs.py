from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_
from typing import Optional, List
from app.db.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User, Job, SavedJob, EmployerProfile, JobStatus, JobType, ExperienceLevel
from app.schemas.schemas import JobCreate, JobUpdate, JobOut, JobListOut

router = APIRouter(prefix="/api/jobs", tags=["Jobs"])


# ── Public: Search & Browse ───────────────────────────────────────────────────

@router.get("", response_model=JobListOut)
def list_jobs(
    search: Optional[str] = Query(None, description="Search in title and description"),
    location: Optional[str] = Query(None),
    job_type: Optional[JobType] = Query(None),
    experience_level: Optional[ExperienceLevel] = Query(None),
    is_remote: Optional[bool] = Query(None),
    salary_min: Optional[int] = Query(None),
    salary_max: Optional[int] = Query(None),
    skill_ids: Optional[List[int]] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Public job listing with full filtering support."""
    query = (
        db.query(Job)
        .options(joinedload(Job.employer), joinedload(Job.required_skills))
        .filter(Job.status == JobStatus.active)
    )

    if search:
        query = query.filter(
            or_(Job.title.ilike(f"%{search}%"), Job.description.ilike(f"%{search}%"))
        )
    if location:
        query = query.filter(Job.location.ilike(f"%{location}%"))
    if job_type:
        query = query.filter(Job.job_type == job_type)
    if experience_level:
        query = query.filter(Job.experience_level == experience_level)
    if is_remote is not None:
        query = query.filter(Job.is_remote == is_remote)
    if salary_min is not None:
        query = query.filter(Job.salary_max >= salary_min)
    if salary_max is not None:
        query = query.filter(Job.salary_min <= salary_max)
    if skill_ids:
        from app.models.user import job_skills
        query = query.join(job_skills).filter(job_skills.c.skill_id.in_(skill_ids))

    total = query.count()
    jobs = query.order_by(Job.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return JobListOut(
        jobs=jobs,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.get("/{job_id}", response_model=JobOut)
def get_job(job_id: int, db: Session = Depends(get_db)):
    """Get a single job by ID and increment view count."""
    job = (
        db.query(Job)
        .options(joinedload(Job.employer), joinedload(Job.required_skills))
        .filter(Job.id == job_id)
        .first()
    )
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    job.views_count += 1
    db.commit()
    db.refresh(job)
    return job


# ── Employer: Manage Jobs ─────────────────────────────────────────────────────

@router.post("", response_model=JobOut, status_code=201)
def create_job(
    payload: JobCreate,
    current_user: User = Depends(require_role("employer")),
    db: Session = Depends(get_db),
):
    if not current_user.employer_profile:
        raise HTTPException(status_code=400, detail="Create an employer profile first.")

    from app.models.user import Skill

    job_data = payload.model_dump(exclude={"skill_ids"})
    job = Job(employer_id=current_user.employer_profile.id, **job_data)

    if payload.skill_ids:
        skills = db.query(Skill).filter(Skill.id.in_(payload.skill_ids)).all()
        job.required_skills = skills

    db.add(job)
    db.commit()
    db.refresh(job)
    return job


@router.patch("/{job_id}", response_model=JobOut)
def update_job(
    job_id: int,
    payload: JobUpdate,
    current_user: User = Depends(require_role("employer")),
    db: Session = Depends(get_db),
):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.employer_id != current_user.employer_profile.id:
        raise HTTPException(status_code=403, detail="You can only edit your own jobs")

    from app.models.user import Skill

    update_data = payload.model_dump(exclude_unset=True, exclude={"skill_ids"})
    for field, value in update_data.items():
        setattr(job, field, value)

    if payload.skill_ids is not None:
        skills = db.query(Skill).filter(Skill.id.in_(payload.skill_ids)).all()
        job.required_skills = skills

    db.commit()
    db.refresh(job)
    return job


@router.delete("/{job_id}", status_code=204)
def delete_job(
    job_id: int,
    current_user: User = Depends(require_role("employer")),
    db: Session = Depends(get_db),
):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.employer_id != current_user.employer_profile.id:
        raise HTTPException(status_code=403, detail="Not your job")

    db.delete(job)
    db.commit()


@router.get("/employer/my-jobs", response_model=List[JobOut])
def get_my_jobs(
    current_user: User = Depends(require_role("employer")),
    db: Session = Depends(get_db),
):
    if not current_user.employer_profile:
        return []
    jobs = (
        db.query(Job)
        .options(joinedload(Job.required_skills))
        .filter(Job.employer_id == current_user.employer_profile.id)
        .order_by(Job.created_at.desc())
        .all()
    )
    return jobs


# ── Seeker: Save / Unsave Jobs ────────────────────────────────────────────────

@router.post("/{job_id}/save", status_code=201)
def save_job(
    job_id: int,
    current_user: User = Depends(require_role("seeker")),
    db: Session = Depends(get_db),
):
    if not current_user.seeker_profile:
        raise HTTPException(status_code=400, detail="Create a seeker profile first.")

    existing = db.query(SavedJob).filter(
        SavedJob.seeker_id == current_user.seeker_profile.id,
        SavedJob.job_id == job_id,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Job already saved")

    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    saved = SavedJob(seeker_id=current_user.seeker_profile.id, job_id=job_id)
    db.add(saved)
    db.commit()
    return {"message": "Job saved successfully"}


@router.delete("/{job_id}/save", status_code=200)
def unsave_job(
    job_id: int,
    current_user: User = Depends(require_role("seeker")),
    db: Session = Depends(get_db),
):
    if not current_user.seeker_profile:
        raise HTTPException(status_code=400, detail="Seeker profile not found.")

    saved = db.query(SavedJob).filter(
        SavedJob.seeker_id == current_user.seeker_profile.id,
        SavedJob.job_id == job_id,
    ).first()
    if not saved:
        raise HTTPException(status_code=404, detail="Job not in saved list")

    db.delete(saved)
    db.commit()
    return {"message": "Job removed from saved list"}


@router.get("/seeker/saved", response_model=List[JobOut])
def get_saved_jobs(
    current_user: User = Depends(require_role("seeker")),
    db: Session = Depends(get_db),
):
    if not current_user.seeker_profile:
        return []
    saved = (
        db.query(SavedJob)
        .filter(SavedJob.seeker_id == current_user.seeker_profile.id)
        .all()
    )
    return [s.job for s in saved]