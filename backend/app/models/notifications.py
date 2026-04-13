# ══════════════════════════════════════════════════════
# backend/app/models/notifications.py  (NEW FILE)
# ══════════════════════════════════════════════════════

from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type       = Column(String(50), nullable=False)   # application_received | status_changed | new_job_match
    title      = Column(String(255), nullable=False)
    message    = Column(Text, nullable=False)
    link       = Column(String(255), nullable=True)   # frontend route to navigate to
    is_read    = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", backref="notifications")