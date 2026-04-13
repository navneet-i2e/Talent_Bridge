from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import List, Optional

from app.db.database import get_db
from app.core.security import require_role
from app.models.user import User, Job, Application, SeekerProfile, EmployerProfile, Skill
from app.schemas.schemas import AdminUserUpdate, PlatformStats, UserOut, SkillSchema

router = APIRouter(prefix="/api/admin", tags=["Admin"])

require_admin = require_role("admin")


@router.get("/stats", response_model=PlatformStats)
def get_platform_stats(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    return PlatformStats(
        total_users=db.query(User).count(),
        total_seekers=db.query(User).filter(User.role == "seeker").count(),
        total_employers=db.query(User).filter(User.role == "employer").count(),
        total_jobs=db.query(Job).count(),
        total_applications=db.query(Application).count(),
        active_jobs=db.query(Job).filter(Job.status == "active").count(),
        jobs_this_month=db.query(Job).filter(Job.created_at >= month_start).count(),
        applications_this_month=db.query(Application).filter(Application.applied_at >= month_start).count(),
    )


@router.get("/users", response_model=List[UserOut])
def list_all_users(
    role: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    return query.offset((page - 1) * page_size).limit(page_size).all()


@router.patch("/users/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    payload: AdminUserUpdate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=200)
def delete_user(
    user_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"message": f"User {user_id} deleted"}


# ── Skills Management ──────────────────────────────────────────────────────────

@router.get("/skills", response_model=List[SkillSchema])
def list_skills(db: Session = Depends(get_db)):
    """Public endpoint — anyone can fetch all available skills."""
    return db.query(Skill).order_by(Skill.name).all()


@router.post("/skills", response_model=SkillSchema, status_code=201)
def create_skill(
    name: str,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    existing = db.query(Skill).filter(Skill.name.ilike(name)).first()
    if existing:
        raise HTTPException(status_code=409, detail="Skill already exists")
    skill = Skill(name=name.strip().title())
    db.add(skill)
    db.commit()
    db.refresh(skill)
    return skill


@router.delete("/skills/{skill_id}", status_code=200)
def delete_skill(
    skill_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    db.delete(skill)
    db.commit()
    return {"message": "Skill deleted"}


# ── Job moderation ────────────────────────────────────────────────────────────

@router.patch("/jobs/{job_id}/status", status_code=200)
def moderate_job(
    job_id: int,
    status: str,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    job.status = status
    db.commit()
    return {"message": f"Job {job_id} status set to {status}"}