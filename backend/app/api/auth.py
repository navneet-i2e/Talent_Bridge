"""
backend/app/api/auth.py — COMPLETE REPLACEMENT
Adds: forgot-password + reset-password endpoints
Uses: DB-stored reset token (no email service required to work)
"""

from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
import secrets

from app.db.database import get_db
from app.core.security import hash_password, verify_password, create_access_token, get_current_user
from app.models.user import User, UserRole
from app.schemas.schemas import RegisterRequest, LoginRequest, TokenResponse, UserOut
from app.db.database import Base

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


# ── Password Reset Token model (add to models/user.py OR keep here) ──────────
# ADD this class to app/models/user.py:
#
# class PasswordResetToken(Base):
#     __tablename__ = "password_reset_tokens"
#     id         = Column(Integer, primary_key=True)
#     token      = Column(String(255), unique=True, nullable=False, index=True)
#     user_id    = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
#     expires_at = Column(DateTime, nullable=False)
#     used       = Column(Boolean, default=False)
#     created_at = Column(DateTime, default=datetime.utcnow)
#     user       = relationship("User", backref="reset_tokens")
#
# Then import it here:
from app.models.user import PasswordResetToken


# ── Register ──────────────────────────────────────────────────────────────────

@router.post("/register", response_model=TokenResponse, status_code=201)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return TokenResponse(access_token=token, user_id=user.id, role=user.role, email=user.email)


# ── Login ─────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated. Contact support.")

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return TokenResponse(access_token=token, user_id=user.id, role=user.role, email=user.email)


# ── Forgot Password ───────────────────────────────────────────────────────────

@router.post("/forgot-password")
def forgot_password(email: str, db: Session = Depends(get_db)):
    """
    Generate a password reset token.
    In production: send token via email.
    In dev: token is returned in response (remove this in prod!).
    """
    user = db.query(User).filter(User.email == email).first()

    # Always return success (don't reveal if email exists)
    if not user:
        return {"message": "If that email exists, a reset link has been sent."}

    # Delete any existing unused tokens for this user
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used == False,
    ).delete()

    raw_token = secrets.token_urlsafe(32)
    reset_token = PasswordResetToken(
        token=raw_token,
        user_id=user.id,
        expires_at=datetime.utcnow() + timedelta(hours=1),
    )
    db.add(reset_token)
    db.commit()

    # TODO production: send email with reset link
    # await send_password_reset_email(user.email, raw_token)

    return {
        "message": "Reset token generated successfully.",
        # REMOVE THIS IN PRODUCTION — only for dev convenience:
        "reset_token": raw_token,
        "expires_in": "1 hour",
        "instructions": f"POST /api/auth/reset-password with token='{raw_token}' and new_password='...'",
    }


# ── Reset Password ────────────────────────────────────────────────────────────

@router.post("/reset-password")
def reset_password(token: str, new_password: str, db: Session = Depends(get_db)):
    """Use reset token to set a new password."""
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    db_token = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == token,
        PasswordResetToken.used == False,
    ).first()

    if not db_token:
        raise HTTPException(status_code=400, detail="Invalid or already used reset token")

    if db_token.expires_at < datetime.utcnow():
        db.delete(db_token)
        db.commit()
        raise HTTPException(status_code=400, detail="Reset token has expired. Request a new one.")

    # Update password
    user = db.query(User).filter(User.id == db_token.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = hash_password(new_password)
    db_token.used = True
    db.commit()

    return {"message": "Password reset successfully. You can now log in with your new password."}


# ── Me / Change Password ──────────────────────────────────────────────────────

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/change-password", status_code=200)
def change_password(
    old_password: str,
    new_password: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Old password is incorrect")
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    current_user.hashed_password = hash_password(new_password)
    db.commit()
    return {"message": "Password changed successfully"}