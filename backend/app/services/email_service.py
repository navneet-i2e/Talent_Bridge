"""
Email Service — Gmail SMTP (100% Free)
Setup: Enable 2FA on Gmail → App Passwords → generate password
Add to .env:
  GMAIL_USER=your@gmail.com
  GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
"""

import smtplib
import asyncio
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional
from app.core.config import settings


def _send_email_sync(to: str, subject: str, html: str, text: str = ""):
    """Synchronous send — run in thread executor to keep FastAPI async."""
    if not settings.GMAIL_USER or not settings.GMAIL_APP_PASSWORD:
        print(f"[EMAIL SKIP] No Gmail config. Would send: {subject} → {to}")
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = f"TalentBridge <{settings.GMAIL_USER}>"
    msg["To"]      = to

    if text:
        msg.attach(MIMEText(text, "plain"))
    msg.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(settings.GMAIL_USER, settings.GMAIL_APP_PASSWORD)
            server.sendmail(settings.GMAIL_USER, to, msg.as_string())
        print(f"[EMAIL OK] {subject} → {to}")
    except Exception as e:
        print(f"[EMAIL ERR] {e}")


async def send_email(to: str, subject: str, html: str, text: str = ""):
    """Async wrapper — non-blocking."""
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _send_email_sync, to, subject, html, text)


# ── Email templates ──────────────────────────────────────────────────────────

def _base_template(content: str, title: str) -> str:
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {{ font-family: 'DM Sans', Arial, sans-serif; background: #f1f5f9; margin: 0; padding: 20px; }}
        .card {{ background: #fff; max-width: 560px; margin: 0 auto; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(5,13,26,0.1); }}
        .header {{ background: #0a1628; padding: 28px 32px; }}
        .header h1 {{ color: #fff; font-size: 20px; margin: 0; }}
        .header p {{ color: rgba(255,255,255,0.45); font-size: 12px; margin: 4px 0 0; }}
        .body {{ padding: 32px; }}
        .body h2 {{ color: #0a1628; font-size: 18px; margin: 0 0 12px; }}
        .body p {{ color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px; }}
        .badge {{ display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }}
        .badge-green {{ background: #E1F5EE; color: #0F6E56; }}
        .badge-blue {{ background: #E6F1FB; color: #185FA5; }}
        .badge-amber {{ background: #FAEEDA; color: #854F0B; }}
        .badge-red {{ background: #FCEBEB; color: #A32D2D; }}
        .btn {{ display: inline-block; background: #163058; color: #fff; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-size: 14px; font-weight: 600; margin-top: 8px; }}
        .footer {{ background: #f8fafc; padding: 20px 32px; text-align: center; }}
        .footer p {{ color: #94a3b8; font-size: 11px; margin: 0; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>TalentBridge</h1>
          <p>AI Job Portal</p>
        </div>
        <div class="body">
          {content}
        </div>
        <div class="footer">
          <p>© 2025 TalentBridge · You're receiving this because you have an account with us.</p>
        </div>
      </div>
    </body>
    </html>
    """


async def send_welcome_email(to: str, name: str, role: str):
    role_label = "job seeker" if role == "seeker" else "employer"
    html = _base_template(f"""
        <h2>Welcome to TalentBridge! 🎉</h2>
        <p>Hi <strong>{name or to.split('@')[0]}</strong>,</p>
        <p>Your account as a <strong>{role_label}</strong> is ready. Here's what you can do:</p>
        {"<p>✅ Complete your profile<br>✅ Browse and apply for jobs<br>✅ Use the AI career coach</p>" if role == "seeker"
          else "<p>✅ Set up your company profile<br>✅ Post job listings<br>✅ Review applications</p>"}
        <a href="http://localhost:5173/dashboard" class="btn">Go to Dashboard →</a>
    """, "Welcome")
    await send_email(to, "Welcome to TalentBridge! 🎉", html)


async def send_application_received_email(to: str, applicant_name: str, job_title: str, company: str):
    html = _base_template(f"""
        <h2>New Application Received</h2>
        <p><strong>{applicant_name}</strong> has applied for your job posting:</p>
        <p style="font-size:16px; font-weight:600; color:#0a1628;">{job_title}</p>
        <p>at <strong>{company}</strong></p>
        <a href="http://localhost:5173/employer/dashboard" class="btn">Review Application →</a>
    """, "New Application")
    await send_email(to, f"New Application: {job_title}", html)


async def send_application_status_email(to: str, applicant_name: str, job_title: str, company: str, new_status: str):
    status_config = {
        "screening": ("Under Review", "badge-blue", "Your application is being reviewed by the hiring team."),
        "interview":  ("Interview Scheduled", "badge-green", "Congratulations! You've been shortlisted for an interview."),
        "offered":    ("Offer Extended 🎉", "badge-green", "Great news — you've received a job offer!"),
        "rejected":   ("Application Closed", "badge-red", "Unfortunately, this application did not move forward."),
    }
    label, badge_class, message = status_config.get(new_status, ("Updated", "badge-blue", "Your application status has been updated."))

    html = _base_template(f"""
        <h2>Application Update</h2>
        <p>Hi <strong>{applicant_name}</strong>,</p>
        <p>Your application for <strong>{job_title}</strong> at <strong>{company}</strong> has been updated:</p>
        <p><span class="badge {badge_class}">{label}</span></p>
        <p>{message}</p>
        <a href="http://localhost:5173/applications" class="btn">View Application →</a>
    """, "Application Update")
    await send_email(to, f"Application Update: {job_title} — {label}", html)


async def send_new_job_match_email(to: str, seeker_name: str, jobs: list):
    jobs_html = "".join([
        f"<p>🔹 <strong>{j['title']}</strong> at {j['company']} · {j.get('location','Remote')}</p>"
        for j in jobs[:5]
    ])
    html = _base_template(f"""
        <h2>New Jobs Match Your Profile! 💼</h2>
        <p>Hi <strong>{seeker_name}</strong>, here are jobs that match your skills:</p>
        {jobs_html}
        <a href="http://localhost:5173/jobs" class="btn">Browse All Jobs →</a>
    """, "Job Matches")
    await send_email(to, f"{len(jobs)} New Jobs Match Your Profile", html)