"""
AI Service — Groq integration
Model: llama-3.3-70b-versatile

NOTE: The User object passed here must have seeker_profile, employer_profile,
and seeker_profile.skills already eagerly loaded (done in get_current_user).
Do NOT trigger any lazy loads here — the SQLAlchemy session is closed by the
time this code runs inside the async generator / thread executor.
"""

import asyncio
from groq import Groq
from typing import AsyncGenerator
from app.core.config import settings
from app.models.user import User, UserRole

client = Groq(api_key=settings.GROQ_API_KEY)

GROQ_MODEL = "llama-3.3-70b-versatile"


# ── System prompt builders ────────────────────────────────────────────────────

def _build_seeker_context(user: User) -> str:
    """
    Safe: accesses only already-loaded in-memory attributes.
    seeker_profile and its .skills are eagerly loaded by get_current_user.
    """
    profile = user.seeker_profile
    if not profile:
        return "The user is a job seeker but has not yet created their profile."

    # .skills is eagerly loaded — safe to iterate
    try:
        skills = ", ".join([s.name for s in profile.skills]) if profile.skills else "Not specified"
    except Exception:
        skills = "Not specified"

    # .applications is NOT eagerly loaded — don't touch it, use a safe fallback
    app_summary = "Application data unavailable in chat context"

    return f"""USER PROFILE (Job Seeker):
- Name: {profile.full_name}
- Headline: {profile.headline or 'Not set'}
- Location: {profile.location or 'Not specified'}
- Experience: {profile.experience_years} years ({profile.experience_level.value} level)
- Skills: {skills}
- Expected Salary: {'$' + str(profile.expected_salary) + '/yr' if profile.expected_salary else 'Not set'}
- Open to Work: {'Yes' if profile.is_open_to_work else 'No'}
- Resume: {'Uploaded' if profile.resume_url else 'Not uploaded'}
- LinkedIn: {profile.linkedin_url or 'Not linked'}
- GitHub: {profile.github_url or 'Not linked'}""".strip()


def _build_employer_context(user: User) -> str:
    """Safe: employer_profile is eagerly loaded by get_current_user."""
    profile = user.employer_profile
    if not profile:
        return "The user is an employer but has not yet created their company profile."

    return f"""USER PROFILE (Employer):
- Company: {profile.company_name}
- Industry: {profile.industry or 'Not specified'}
- Company Size: {profile.company_size or 'Not specified'}
- Headquarters: {profile.headquarters or 'Not specified'}
- Website: {profile.company_website or 'Not set'}
- Verified: {'Yes' if profile.is_verified else 'No'}""".strip()


def build_system_prompt(user: User) -> str:
    if user.role == UserRole.seeker:
        role_label = "job seeker"
        context = _build_seeker_context(user)
        capabilities = """CAPABILITIES FOR JOB SEEKERS:
- Resume analysis and ATS scoring
- Cover letter generation
- Job recommendations based on profile
- Mock interview practice
- Salary insights and negotiation tips"""
    elif user.role == UserRole.employer:
        role_label = "employer/recruiter"
        context = _build_employer_context(user)
        capabilities = """CAPABILITIES FOR EMPLOYERS:
- Writing compelling job descriptions
- Candidate screening criteria
- Interview question suggestions
- Hiring market insights"""
    else:
        role_label = "platform admin"
        context = "Platform administrator with full access."
        capabilities = "Platform analytics, user management insights, and operational support."

    return f"""You are an advanced AI career assistant for TalentBridge, a job portal platform.

User type: {role_label}

{context}

{capabilities}

Be professional, concise, and helpful. Use markdown formatting where it improves readability.""".strip()


# ── Non-streaming chat ────────────────────────────────────────────────────────

async def get_chat_response(
    user: User,
    conversation_history: list[dict],
    user_message: str,
) -> str:
    system_prompt = build_system_prompt(user)
    messages = [{"role": "system", "content": system_prompt}]
    messages += conversation_history
    messages.append({"role": "user", "content": user_message})

    loop = asyncio.get_event_loop()
    response = await loop.run_in_executor(
        None,
        lambda: client.chat.completions.create(
            model=GROQ_MODEL,
            messages=messages,
            temperature=0.7,
            max_tokens=2048,
        )
    )
    return response.choices[0].message.content


# ── Streaming (SSE) ───────────────────────────────────────────────────────────

async def stream_chat_response(
    user: User,
    conversation_history: list[dict],
    user_message: str,
) -> AsyncGenerator[str, None]:
    """
    Async generator yielding tokens from Groq's streaming API.

    Groq's Python SDK is synchronous, so we run it in a thread executor
    and bridge the chunks into the async world via asyncio.Queue.

    IMPORTANT: build_system_prompt() is called HERE (before entering the
    thread) so all attribute access happens in the calling coroutine,
    not inside the thread where the ORM session is definitely closed.
    """
    # Build prompt in the async context (safe — no lazy loads needed)
    system_prompt = build_system_prompt(user)

    messages = [{"role": "system", "content": system_prompt}]
    messages += conversation_history
    messages.append({"role": "user", "content": user_message})

    queue: asyncio.Queue = asyncio.Queue()
    loop = asyncio.get_event_loop()

    def _run_stream():
        """Blocking function — runs in a thread pool."""
        try:
            stream = client.chat.completions.create(
                model=GROQ_MODEL,
                messages=messages,
                temperature=0.7,
                max_tokens=2048,
                stream=True,
            )
            for chunk in stream:
                delta = chunk.choices[0].delta.content
                if delta:
                    loop.call_soon_threadsafe(queue.put_nowait, delta)
        except Exception as exc:
            loop.call_soon_threadsafe(queue.put_nowait, exc)
        finally:
            loop.call_soon_threadsafe(queue.put_nowait, None)  # sentinel

    loop.run_in_executor(None, _run_stream)

    while True:
        item = await queue.get()
        if item is None:
            break
        if isinstance(item, Exception):
            raise item
        yield item
