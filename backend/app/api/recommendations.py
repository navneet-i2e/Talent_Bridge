# backend/app/api/recommendations.py  (NEW FILE)
# Pure skill-match algorithm — no external API, completely free

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from pydantic import BaseModel
from typing import List
from datetime import datetime, timedelta

from app.db.database import get_db
from app.core.security import require_role
from app.models.user import User, Job, JobStatus, SeekerProfile, job_skills

router = APIRouter(prefix="/api/recommendations", tags=["Recommendations"])


class JobRecommendation(BaseModel):
    id: int
    title: str
    company_name: str
    location: str | None
    job_type: str
    is_remote: bool
    salary_min: int | None
    salary_max: int | None
    match_score: int          # 0-100
    matched_skills: List[str]
    missing_skills: List[str]
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("", response_model=List[JobRecommendation])
def get_recommendations(
    limit: int = 10,
    current_user: User = Depends(require_role("seeker")),
    db: Session = Depends(get_db),
):
    """
    Return job recommendations ranked by skill match score.
    Algorithm:
      - Get seeker's skills
      - Find active jobs posted in last 60 days
      - Score each job: matched_skills / total_required_skills * 100
      - Bonus: salary match, experience level match, remote preference
      - Return top N sorted by score
    """
    profile: SeekerProfile = current_user.seeker_profile
    if not profile:
        return []

    seeker_skill_ids  = {s.id for s in (profile.skills or [])}
    seeker_skill_names = {s.name.lower() for s in (profile.skills or [])}

    if not seeker_skill_ids:
        # No skills → return latest jobs
        jobs = (
            db.query(Job)
            .options(joinedload(Job.employer), joinedload(Job.required_skills))
            .filter(Job.status == JobStatus.active)
            .order_by(Job.created_at.desc())
            .limit(limit)
            .all()
        )
        return [_build_rec(j, 0, [], []) for j in jobs]

    # Get all active jobs from last 60 days with skills loaded
    cutoff = datetime.utcnow() - timedelta(days=60)
    jobs = (
        db.query(Job)
        .options(joinedload(Job.employer), joinedload(Job.required_skills))
        .filter(
            Job.status == JobStatus.active,
            Job.created_at >= cutoff,
        )
        .all()
    )

    scored = []
    for job in jobs:
        required_skill_names = {s.name.lower() for s in (job.required_skills or [])}
        required_skill_ids   = {s.id for s in (job.required_skills or [])}

        if not required_skill_ids:
            # Job has no required skills — partial match
            matched, missing = [], []
            base_score = 30
        else:
            matched_ids   = seeker_skill_ids & required_skill_ids
            matched_names = [s.name for s in job.required_skills if s.id in matched_ids]
            missing_names = [s.name for s in job.required_skills if s.id not in seeker_skill_ids]
            matched = matched_names
            missing = missing_names
            base_score = int((len(matched_ids) / len(required_skill_ids)) * 70)

        bonus = 0

        # Experience level bonus (+10)
        if profile.experience_level and job.experience_level:
            if profile.experience_level == job.experience_level:
                bonus += 10

        # Salary match bonus (+10)
        if profile.expected_salary and job.salary_min and job.salary_max:
            if job.salary_min <= profile.expected_salary <= job.salary_max:
                bonus += 10
            elif profile.expected_salary >= job.salary_min:
                bonus += 5

        # Remote preference bonus (+10) — assume seeker prefers remote if open_to_work
        if job.is_remote and profile.is_open_to_work:
            bonus += 5

        # Location match (+5)
        if profile.location and job.location:
            if profile.location.lower().split(",")[0] in job.location.lower():
                bonus += 5

        score = min(base_score + bonus, 100)

        # Only include if score >= 20 (at least some relevance)
        if score >= 20:
            scored.append((job, score, matched, missing))

    # Sort by score desc, then by date desc
    scored.sort(key=lambda x: (-x[1], -x[0].created_at.timestamp()))

    return [_build_rec(j, s, m, mis) for j, s, m, mis in scored[:limit]]


def _build_rec(job: Job, score: int, matched: list, missing: list) -> dict:
    return {
        "id":            job.id,
        "title":         job.title,
        "company_name":  job.employer.company_name if job.employer else "Unknown",
        "location":      job.location,
        "job_type":      job.job_type,
        "is_remote":     job.is_remote,
        "salary_min":    job.salary_min,
        "salary_max":    job.salary_max,
        "match_score":   score,
        "matched_skills": matched,
        "missing_skills": missing,
        "created_at":    job.created_at,
    }