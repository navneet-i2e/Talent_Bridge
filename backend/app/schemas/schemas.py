"""
Pydantic v2 schemas — request/response validation for all endpoints.
"""

from pydantic import BaseModel, EmailStr, field_validator, model_validator
from typing import Optional, List
from datetime import datetime
from app.models.user import UserRole, JobType, JobStatus, ApplicationStatus, ExperienceLevel


# ── Shared ────────────────────────────────────────────────────────────────────

class SkillSchema(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


# ── Auth ──────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    role: UserRole = UserRole.seeker

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str = ""
    user_id: int
    role: str
    email: str


class UserOut(BaseModel):
    id: int
    email: str
    role: UserRole
    is_active: bool
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ── Seeker Profile ─────────────────────────────────────────────────────────────

class SeekerProfileCreate(BaseModel):
    full_name: str
    phone: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    headline: Optional[str] = None
    experience_years: Optional[float] = 0
    experience_level: Optional[ExperienceLevel] = ExperienceLevel.entry
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    expected_salary: Optional[int] = None
    is_open_to_work: Optional[bool] = True
    skill_ids: Optional[List[int]] = []


class SeekerProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    headline: Optional[str] = None
    experience_years: Optional[float] = None
    experience_level: Optional[ExperienceLevel] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    expected_salary: Optional[int] = None
    is_open_to_work: Optional[bool] = None
    skill_ids: Optional[List[int]] = None


class SeekerProfileOut(BaseModel):
    id: int
    user_id: int
    full_name: str
    phone: Optional[str]
    location: Optional[str]
    bio: Optional[str]
    headline: Optional[str]
    experience_years: float
    experience_level: ExperienceLevel
    resume_url: Optional[str]
    avatar_url: Optional[str]
    linkedin_url: Optional[str]
    github_url: Optional[str]
    portfolio_url: Optional[str]
    expected_salary: Optional[int]
    is_open_to_work: bool
    skills: List[SkillSchema] = []
    created_at: datetime

    class Config:
        from_attributes = True


# ── Employer Profile ──────────────────────────────────────────────────────────

class EmployerProfileCreate(BaseModel):
    company_name: str
    company_website: Optional[str] = None
    industry: Optional[str] = None
    company_size: Optional[str] = None
    founded_year: Optional[int] = None
    description: Optional[str] = None
    headquarters: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None


class EmployerProfileUpdate(BaseModel):
    company_name: Optional[str] = None
    company_website: Optional[str] = None
    industry: Optional[str] = None
    company_size: Optional[str] = None
    founded_year: Optional[int] = None
    description: Optional[str] = None
    headquarters: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None


class EmployerProfileOut(BaseModel):
    id: int
    user_id: int
    company_name: str
    company_website: Optional[str]
    industry: Optional[str]
    company_size: Optional[str]
    founded_year: Optional[int]
    description: Optional[str]
    logo_url: Optional[str]
    headquarters: Optional[str]
    contact_email: Optional[str]
    contact_phone: Optional[str]
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ── Job ───────────────────────────────────────────────────────────────────────

class JobCreate(BaseModel):
    title: str
    description: str
    responsibilities: Optional[str] = None
    qualifications: Optional[str] = None
    location: Optional[str] = None
    is_remote: bool = False
    job_type: JobType = JobType.full_time
    experience_level: ExperienceLevel = ExperienceLevel.mid
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    salary_currency: str = "USD"
    application_deadline: Optional[datetime] = None
    skill_ids: Optional[List[int]] = []


class JobUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    responsibilities: Optional[str] = None
    qualifications: Optional[str] = None
    location: Optional[str] = None
    is_remote: Optional[bool] = None
    job_type: Optional[JobType] = None
    experience_level: Optional[ExperienceLevel] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    status: Optional[JobStatus] = None
    application_deadline: Optional[datetime] = None
    skill_ids: Optional[List[int]] = None


class JobOut(BaseModel):
    id: int
    title: str
    description: str
    responsibilities: Optional[str]
    qualifications: Optional[str]
    location: Optional[str]
    is_remote: bool
    job_type: JobType
    experience_level: ExperienceLevel
    salary_min: Optional[int]
    salary_max: Optional[int]
    salary_currency: str
    status: JobStatus
    application_deadline: Optional[datetime]
    views_count: int
    required_skills: List[SkillSchema] = []
    employer: Optional[EmployerProfileOut] = None
    created_at: datetime

    class Config:
        from_attributes = True


class JobListOut(BaseModel):
    jobs: List[JobOut]
    total: int
    page: int
    page_size: int
    total_pages: int


# ── Application ───────────────────────────────────────────────────────────────

class ApplicationCreate(BaseModel):
    job_id: int
    cover_letter: Optional[str] = None


class ApplicationStatusUpdate(BaseModel):
    status: ApplicationStatus
    employer_notes: Optional[str] = None


class ApplicationOut(BaseModel):
    id: int
    job_id: int
    seeker_id: int
    cover_letter: Optional[str]
    resume_url: Optional[str]
    status: ApplicationStatus
    employer_notes: Optional[str]
    ai_score: Optional[float]
    ai_summary: Optional[str]
    applied_at: datetime
    updated_at: Optional[datetime]
    job: Optional[JobOut] = None
    seeker: Optional[SeekerProfileOut] = None

    class Config:
        from_attributes = True


# ── Chat ──────────────────────────────────────────────────────────────────────

class ChatSessionCreate(BaseModel):
    title: Optional[str] = "New Conversation"


class ChatSessionOut(BaseModel):
    id: int
    user_id: int
    title: str
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class ChatMessageOut(BaseModel):
    id: int
    session_id: int
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class ChatRequest(BaseModel):
    session_id: int
    message: str


# ── Admin ─────────────────────────────────────────────────────────────────────

class AdminUserUpdate(BaseModel):
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None
    role: Optional[UserRole] = None


class PlatformStats(BaseModel):
    total_users: int
    total_seekers: int
    total_employers: int
    total_jobs: int
    total_applications: int
    active_jobs: int
    jobs_this_month: int
    applications_this_month: int