# backend/app/api/ats.py  (NEW FILE)
# Add to main.py: app.include_router(ats.router)

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import tempfile, os

from app.db.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User, Job
from app.services.ats_service import parse_resume, score_resume_against_job

router = APIRouter(prefix="/api/ats", tags=["ATS"])


class ATSScoreResponse(BaseModel):
    score: int
    grade: str
    matched_skills: list
    missing_skills: list
    feedback: list
    improvements: list
    breakdown: dict


@router.post("/score", response_model=ATSScoreResponse)
async def score_resume(
    job_id: int = Query(..., description="Job to score against"),
    file: UploadFile = File(None, description="Upload PDF (or uses profile resume if not provided)"),
    current_user: User = Depends(require_role("seeker")),
    db: Session = Depends(get_db),
):
    """
    Score a resume PDF against a specific job posting.
    If no file is uploaded, uses the seeker's stored resume URL.
    """
    # Get job details
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    required_skills = [s.name for s in job.required_skills] if job.required_skills else []

    # Determine which PDF to parse
    if file and file.filename.endswith(".pdf"):
        # Use uploaded file
        content = await file.read()
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        try:
            resume_data = parse_resume(tmp_path)
        finally:
            os.unlink(tmp_path)

    elif current_user.seeker_profile and current_user.seeker_profile.resume_url:
        # Use stored resume
        resume_path = current_user.seeker_profile.resume_url.replace("/uploads/", "./app/uploads/")
        if not os.path.exists(resume_path):
            raise HTTPException(status_code=404, detail="Resume file not found. Please upload your resume first.")
        resume_data = parse_resume(resume_path)
    else:
        raise HTTPException(status_code=400, detail="No resume found. Upload a PDF or add resume to your profile.")

    if "error" in resume_data:
        raise HTTPException(status_code=422, detail=resume_data["error"])

    # Score it
    result = score_resume_against_job(
        resume_data=resume_data,
        job_title=job.title,
        job_description=job.description or "",
        required_skills=required_skills,
    )

    return result


@router.post("/parse")
async def parse_resume_only(
    file: UploadFile = File(...),
    current_user: User = Depends(require_role("seeker")),
):
    """Parse resume and return extracted data (no scoring)."""
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    content = await file.read()
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        data = parse_resume(tmp_path)
    finally:
        os.unlink(tmp_path)

    if "error" in data:
        raise HTTPException(status_code=422, detail=data["error"])

    # Don't return raw_text in response (too large)
    data.pop("raw_text", None)
    return data