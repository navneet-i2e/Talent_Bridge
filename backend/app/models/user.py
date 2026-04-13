"""
All SQLAlchemy ORM models for the Job Portal.
Import order matters — define parent tables before children.
"""

from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime,
    ForeignKey, Enum, Float, Table
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base
import enum
from datetime import datetime


# ── Enums ────────────────────────────────────────────────────────────────────

class UserRole(str, enum.Enum):
    seeker = "seeker"
    employer = "employer"
    admin = "admin"


class JobType(str, enum.Enum):
    full_time = "full_time"
    part_time = "part_time"
    contract = "contract"
    internship = "internship"
    remote = "remote"
    hybrid = "hybrid"


class JobStatus(str, enum.Enum):
    active = "active"
    closed = "closed"
    draft = "draft"


class ApplicationStatus(str, enum.Enum):
    applied    = "applied"
    screening  = "screening"        # was under_review
    interview  = "interview"        # was interview_scheduled  
    offered    = "offered"          # was hired
    rejected   = "rejected"
    withdrawn  = "withdrawn"


class ExperienceLevel(str, enum.Enum):
    entry = "entry"
    mid = "mid"
    senior = "senior"
    lead = "lead"
    executive = "executive"


# ── Association table: seeker ↔ skills ──────────────────────────────────────

seeker_skills = Table(
    "seeker_skills",
    Base.metadata,
    Column("seeker_id", Integer, ForeignKey("seeker_profiles.id"), primary_key=True),
    Column("skill_id", Integer, ForeignKey("skills.id"), primary_key=True),
)

# Association table: job ↔ skills
job_skills = Table(
    "job_skills",
    Base.metadata,
    Column("job_id", Integer, ForeignKey("jobs.id"), primary_key=True),
    Column("skill_id", Integer, ForeignKey("skills.id"), primary_key=True),
)


# ── Skill ─────────────────────────────────────────────────────────────────────

class Skill(Base):
    __tablename__ = "skills"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)

    seekers = relationship("SeekerProfile", secondary=seeker_skills, back_populates="skills")
    jobs = relationship("Job", secondary=job_skills, back_populates="required_skills")


# ── User ──────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.seeker)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    seeker_profile = relationship("SeekerProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    employer_profile = relationship("EmployerProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")


# ── Seeker Profile ────────────────────────────────────────────────────────────

class SeekerProfile(Base):
    __tablename__ = "seeker_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)

    full_name = Column(String(255), nullable=False)
    phone = Column(String(20))
    location = Column(String(255))
    bio = Column(Text)
    headline = Column(String(255))          # e.g. "Senior Python Developer"
    experience_years = Column(Float, default=0)
    experience_level = Column(Enum(ExperienceLevel), default=ExperienceLevel.entry)
    resume_url = Column(String(500))        # local path
    avatar_url = Column(String(500))
    linkedin_url = Column(String(500))
    github_url = Column(String(500))
    portfolio_url = Column(String(500))
    expected_salary = Column(Integer)       # in USD/year
    is_open_to_work = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="seeker_profile")
    skills = relationship("Skill", secondary=seeker_skills, back_populates="seekers")
    applications = relationship("Application", back_populates="seeker", cascade="all, delete-orphan")
    saved_jobs = relationship("SavedJob", back_populates="seeker", cascade="all, delete-orphan")


# ── Employer Profile ──────────────────────────────────────────────────────────

class EmployerProfile(Base):
    __tablename__ = "employer_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)

    company_name = Column(String(255), nullable=False)
    company_website = Column(String(500))
    industry = Column(String(255))
    company_size = Column(String(50))       # e.g. "1-10", "11-50", "51-200"
    founded_year = Column(Integer)
    description = Column(Text)
    logo_url = Column(String(500))
    headquarters = Column(String(255))
    contact_email = Column(String(255))
    contact_phone = Column(String(20))
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="employer_profile")
    jobs = relationship("Job", back_populates="employer", cascade="all, delete-orphan")


# ── Job ───────────────────────────────────────────────────────────────────────

class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    employer_id = Column(Integer, ForeignKey("employer_profiles.id"), nullable=False)

    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=False)
    responsibilities = Column(Text)
    qualifications = Column(Text)
    location = Column(String(255))
    is_remote = Column(Boolean, default=False)
    job_type = Column(Enum(JobType), default=JobType.full_time)
    experience_level = Column(Enum(ExperienceLevel), default=ExperienceLevel.mid)
    salary_min = Column(Integer)
    salary_max = Column(Integer)
    salary_currency = Column(String(10), default="USD")
    status = Column(Enum(JobStatus), default=JobStatus.active)
    application_deadline = Column(DateTime(timezone=True))
    views_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    employer = relationship("EmployerProfile", back_populates="jobs")
    required_skills = relationship("Skill", secondary=job_skills, back_populates="jobs")
    applications = relationship("Application", back_populates="job", cascade="all, delete-orphan")
    saved_by = relationship("SavedJob", back_populates="job", cascade="all, delete-orphan")


# ── Application ───────────────────────────────────────────────────────────────

class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    seeker_id = Column(Integer, ForeignKey("seeker_profiles.id"), nullable=False)

    cover_letter = Column(Text)
    resume_url = Column(String(500))        # can override profile resume
    status = Column(Enum(ApplicationStatus), default=ApplicationStatus.applied)
    employer_notes = Column(Text)           # internal notes by employer
    ai_score = Column(Float)                # AI-computed match score 0–100
    ai_summary = Column(Text)              # AI-generated candidate summary
    applied_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    job = relationship("Job", back_populates="applications")
    seeker = relationship("SeekerProfile", back_populates="applications")


# ── Saved Jobs ────────────────────────────────────────────────────────────────

class SavedJob(Base):
    __tablename__ = "saved_jobs"

    id = Column(Integer, primary_key=True, index=True)
    seeker_id = Column(Integer, ForeignKey("seeker_profiles.id"), nullable=False)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    saved_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    seeker = relationship("SeekerProfile", back_populates="saved_jobs")
    job = relationship("Job", back_populates="saved_by")


# ── Chat Session ──────────────────────────────────────────────────────────────

class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), default="New Conversation")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan", order_by="ChatMessage.created_at")


# ── Chat Message ──────────────────────────────────────────────────────────────

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"), nullable=False)
    role = Column(String(20), nullable=False)    # "user" | "assistant"
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    session = relationship("ChatSession", back_populates="messages")
    
class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
 
    id         = Column(Integer, primary_key=True, index=True)
    token      = Column(String(255), unique=True, nullable=False, index=True)
    user_id    = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used       = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
 
    user = relationship("User", backref="reset_tokens")

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
 
    id         = Column(Integer, primary_key=True, index=True)
    token      = Column(String(255), unique=True, nullable=False, index=True)
    user_id    = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
 
    user = relationship("User", backref="refresh_tokens")