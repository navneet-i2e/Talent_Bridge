# backend/app/api/ai_inline.py  (NEW FILE)
# One-shot AI endpoints — no chat session needed
# Used for: cover letter, JD generation, interview questions

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from groq import Groq

from app.db.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User, Job
from app.core.config import settings

router = APIRouter(prefix="/api/ai", tags=["AI Inline"])
client = Groq(api_key=settings.GROQ_API_KEY)
MODEL  = "llama-3.3-70b-versatile"


def _call_groq(system: str, user_msg: str, max_tokens: int = 1024) -> str:
    resp = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system",  "content": system},
            {"role": "user",    "content": user_msg},
        ],
        temperature=0.7,
        max_tokens=max_tokens,
    )
    return resp.choices[0].message.content


# ── Cover Letter ──────────────────────────────────────────────────────────────

class CoverLetterRequest(BaseModel):
    job_id: int
    extra_notes: Optional[str] = None   # user can add "mention my AWS project"

@router.post("/cover-letter")
def generate_cover_letter(
    payload: CoverLetterRequest,
    current_user: User = Depends(require_role("seeker")),
    db: Session = Depends(get_db),
):
    job = db.query(Job).filter(Job.id == payload.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    profile = current_user.seeker_profile
    skills = ", ".join([s.name for s in profile.skills]) if profile and profile.skills else "Not specified"

    system = """You are an expert career coach and professional writer.
Write compelling, authentic cover letters that get interviews.
Be specific, concise, and human. Never use clichés like "I am writing to apply".
Format: 3 tight paragraphs. No salutation header needed."""

    user_msg = f"""Write a cover letter for:

JOB: {job.title} at {job.employer.company_name if job.employer else 'the company'}
DESCRIPTION: {(job.description or '')[:600]}
REQUIRED SKILLS: {', '.join([s.name for s in job.required_skills]) if job.required_skills else 'Not listed'}

CANDIDATE:
- Name: {profile.full_name if profile else current_user.email}
- Headline: {profile.headline or 'Professional'}
- Experience: {profile.experience_years or 0} years
- Skills: {skills}
- Location: {profile.location or 'Not specified'}

{f'Additional notes: {payload.extra_notes}' if payload.extra_notes else ''}

Write the cover letter now:"""

    try:
        text = _call_groq(system, user_msg, max_tokens=600)
        return {"cover_letter": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")


# ── Job Description Generator (for employers) ─────────────────────────────────

class JDRequest(BaseModel):
    title: str
    experience_level: str = "mid"
    key_skills: Optional[list] = []
    extra_context: Optional[str] = None

@router.post("/generate-jd")
def generate_job_description(
    payload: JDRequest,
    current_user: User = Depends(require_role("employer")),
):
    system = """You are an expert HR professional and technical writer.
Write compelling job descriptions that attract top talent.
Be specific about responsibilities and requirements. Avoid generic filler.
Format: Overview (2 sentences) → Responsibilities (5-6 bullets) → Requirements (5-6 bullets) → Nice to have (3 bullets)."""

    user_msg = f"""Write a job description for:
Title: {payload.title}
Level: {payload.experience_level}
Key Skills: {', '.join(payload.key_skills) if payload.key_skills else 'Not specified'}
{f'Context: {payload.extra_context}' if payload.extra_context else ''}"""

    try:
        text = _call_groq(system, user_msg, max_tokens=800)
        return {"job_description": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")


# ── Interview Questions ────────────────────────────────────────────────────────

class InterviewQRequest(BaseModel):
    role: str
    level: str = "mid"
    focus: str = "technical"   # technical | behavioral | mixed

@router.post("/interview-questions")
def generate_interview_questions(
    payload: InterviewQRequest,
    current_user: User = Depends(get_current_user),
):
    system = "You are an expert technical interviewer. Generate targeted, insightful interview questions."

    user_msg = f"""Generate 8 interview questions for a {payload.level}-level {payload.role}.
Focus: {payload.focus}
Mix difficulty levels. Include 2 scenario-based questions.
Format each question on a new line with number prefix."""

    try:
        text = _call_groq(system, user_msg, max_tokens=600)
        return {"questions": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")


# ── Improved system prompt for chat ──────────────────────────────────────────
# ADD TO: backend/app/services/ai_service.py
# Replace the last line of build_system_prompt() return statement:

IMPROVED_SYSTEM_PROMPT_SUFFIX = """
RESPONSE STYLE:
- Use **bold** for key terms and headings
- Use bullet points for lists, numbered lists for steps
- Use tables for comparisons
- For resume feedback: always structure as ### Strengths / ### Improvements / ### ATS Tips
- For salary info: give specific ranges with context
- Be direct, specific, and actionable — never vague
- Sound like a knowledgeable career advisor, not a generic chatbot
- Keep responses focused — don't pad with filler phrases
- If asked something outside career/jobs, politely redirect

PERSONA: You are "Talent", TalentBridge's expert AI career coach.
You have deep knowledge of hiring, resumes, interviews, salary negotiation, and career growth.
You know the user's profile and use it to give personalized advice."""