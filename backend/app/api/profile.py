import os, shutil, uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.security import get_current_user, require_role
from app.core.config import settings
from app.models.user import User, UserRole, SeekerProfile, EmployerProfile, Skill
from app.schemas.schemas import (
    SeekerProfileCreate, SeekerProfileUpdate, SeekerProfileOut,
    EmployerProfileCreate, EmployerProfileUpdate, EmployerProfileOut,
)

router = APIRouter(prefix="/api/profile", tags=["Profiles"])

ALLOWED_RESUME_TYPES = {"application/pdf", "application/msword",
                         "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}


# ── Seeker Profile ─────────────────────────────────────────────────────────────

@router.post("/seeker", response_model=SeekerProfileOut, status_code=201)
def create_seeker_profile(
    payload: SeekerProfileCreate,
    current_user: User = Depends(require_role("seeker")),
    db: Session = Depends(get_db),
):
    if current_user.seeker_profile:
        raise HTTPException(status_code=409, detail="Seeker profile already exists. Use PATCH to update.")

    profile = SeekerProfile(
        user_id=current_user.id,
        full_name=payload.full_name,
        phone=payload.phone,
        location=payload.location,
        bio=payload.bio,
        headline=payload.headline,
        experience_years=payload.experience_years or 0,
        experience_level=payload.experience_level,
        linkedin_url=payload.linkedin_url,
        github_url=payload.github_url,
        portfolio_url=payload.portfolio_url,
        expected_salary=payload.expected_salary,
        is_open_to_work=payload.is_open_to_work,
    )

    if payload.skill_ids:
        skills = db.query(Skill).filter(Skill.id.in_(payload.skill_ids)).all()
        profile.skills = skills

    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@router.get("/seeker/me", response_model=SeekerProfileOut)
def get_my_seeker_profile(
    current_user: User = Depends(require_role("seeker")),
):
    if not current_user.seeker_profile:
        raise HTTPException(status_code=404, detail="Seeker profile not found. Create one first.")
    return current_user.seeker_profile


@router.get("/seeker/{user_id}", response_model=SeekerProfileOut)
def get_seeker_profile_by_user(user_id: int, db: Session = Depends(get_db)):
    profile = db.query(SeekerProfile).filter(SeekerProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Seeker profile not found")
    return profile


@router.patch("/seeker", response_model=SeekerProfileOut)
def update_seeker_profile(
    payload: SeekerProfileUpdate,
    current_user: User = Depends(require_role("seeker")),
    db: Session = Depends(get_db),
):
    profile = current_user.seeker_profile
    if not profile:
        raise HTTPException(status_code=404, detail="Seeker profile not found. Create one first.")

    update_data = payload.model_dump(exclude_unset=True, exclude={"skill_ids"})
    for field, value in update_data.items():
        setattr(profile, field, value)

    if payload.skill_ids is not None:
        skills = db.query(Skill).filter(Skill.id.in_(payload.skill_ids)).all()
        profile.skills = skills

    db.commit()
    db.refresh(profile)
    return profile


@router.post("/seeker/upload-resume", response_model=SeekerProfileOut)
async def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(require_role("seeker")),
    db: Session = Depends(get_db),
):
    if file.content_type not in ALLOWED_RESUME_TYPES:
        raise HTTPException(status_code=400, detail="Only PDF and Word documents are allowed.")

    profile = current_user.seeker_profile
    if not profile:
        raise HTTPException(status_code=404, detail="Create seeker profile before uploading resume.")

    # Delete old resume
    if profile.resume_url and os.path.exists(profile.resume_url):
        os.remove(profile.resume_url)

    ext = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4()}{ext}"
    save_path = os.path.join(settings.UPLOAD_DIR, "resumes", filename)
    os.makedirs(os.path.dirname(save_path), exist_ok=True)

    with open(save_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    profile.resume_url = save_path
    db.commit()
    db.refresh(profile)
    return profile


@router.post("/seeker/upload-avatar", response_model=SeekerProfileOut)
async def upload_seeker_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(require_role("seeker")),
    db: Session = Depends(get_db),
):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, or WebP images allowed.")

    profile = current_user.seeker_profile
    if not profile:
        raise HTTPException(status_code=404, detail="Create seeker profile first.")

    ext = os.path.splitext(file.filename)[1] or ".jpg"
    filename = f"{uuid.uuid4()}{ext}"
    save_path = os.path.join(settings.UPLOAD_DIR, "avatars", filename)
    os.makedirs(os.path.dirname(save_path), exist_ok=True)

    with open(save_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    profile.avatar_url = save_path
    db.commit()
    db.refresh(profile)
    return profile


# ── Employer Profile ──────────────────────────────────────────────────────────

@router.post("/employer", response_model=EmployerProfileOut, status_code=201)
def create_employer_profile(
    payload: EmployerProfileCreate,
    current_user: User = Depends(require_role("employer")),
    db: Session = Depends(get_db),
):
    if current_user.employer_profile:
        raise HTTPException(status_code=409, detail="Employer profile already exists. Use PATCH to update.")

    profile = EmployerProfile(user_id=current_user.id, **payload.model_dump())
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@router.get("/employer/me", response_model=EmployerProfileOut)
def get_my_employer_profile(current_user: User = Depends(require_role("employer"))):
    if not current_user.employer_profile:
        raise HTTPException(status_code=404, detail="Employer profile not found.")
    return current_user.employer_profile


@router.get("/employer/{user_id}", response_model=EmployerProfileOut)
def get_employer_profile_by_user(user_id: int, db: Session = Depends(get_db)):
    profile = db.query(EmployerProfile).filter(EmployerProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Employer profile not found")
    return profile


@router.patch("/employer", response_model=EmployerProfileOut)
def update_employer_profile(
    payload: EmployerProfileUpdate,
    current_user: User = Depends(require_role("employer")),
    db: Session = Depends(get_db),
):
    profile = current_user.employer_profile
    if not profile:
        raise HTTPException(status_code=404, detail="Employer profile not found.")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)

    db.commit()
    db.refresh(profile)
    return profile


@router.post("/employer/upload-logo", response_model=EmployerProfileOut)
async def upload_company_logo(
    file: UploadFile = File(...),
    current_user: User = Depends(require_role("employer")),
    db: Session = Depends(get_db),
):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, or WebP images allowed.")

    profile = current_user.employer_profile
    if not profile:
        raise HTTPException(status_code=404, detail="Create employer profile first.")

    ext = os.path.splitext(file.filename)[1] or ".png"
    filename = f"{uuid.uuid4()}{ext}"
    save_path = os.path.join(settings.UPLOAD_DIR, "logos", filename)
    os.makedirs(os.path.dirname(save_path), exist_ok=True)

    with open(save_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    profile.logo_url = save_path
    db.commit()
    db.refresh(profile)
    return profile