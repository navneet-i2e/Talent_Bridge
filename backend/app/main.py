"""
TalentBridge Job Portal — FastAPI Backend
Entry point: uvicorn main:app --reload
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from app.api import ats
from app.core.config import settings
from app.db.database import engine, Base
from app.api import notifications, recommendations
# Import all models so SQLAlchemy registers them before create_all
from app.models import user  # noqa: F401

# Import routers
from app.api import auth, profile, jobs, applications, chat, admin

# ── Create tables ─────────────────────────────────────────────────────────────
Base.metadata.create_all(bind=engine)

# ── App instance ──────────────────────────────────────────────────────────────
app = FastAPI(
    title="TalentBridge API",
    description="AI-Powered Job Portal Backend",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static files (uploaded resumes, logos, avatars) ───────────────────────────
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(jobs.router)
app.include_router(applications.router)
app.include_router(chat.router)
app.include_router(admin.router)
app.include_router(ats.router)
app.include_router(notifications.router)
app.include_router(recommendations.router)


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["System"])
def health_check():
    return {
        "status": "healthy",
        "app": "TalentBridge API",
        "version": "1.0.0",
    }


@app.get("/", tags=["System"])
def root():
    return {"message": "Welcome to TalentBridge API. Visit /docs for the interactive API reference."}