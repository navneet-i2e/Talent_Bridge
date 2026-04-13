"""
Chat API — manages chat sessions, persists messages, and streams AI responses
using Server-Sent Events (SSE) for real-time token streaming.
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List
import json

from app.db.database import get_db, SessionLocal
from app.core.security import get_current_user
from app.models.user import User, ChatSession, ChatMessage
from app.schemas.schemas import ChatRequest, ChatSessionCreate, ChatSessionOut, ChatMessageOut
from app.services.ai_service import stream_chat_response

router = APIRouter(prefix="/api/chat", tags=["AI Chat"])


# ── Session Management ────────────────────────────────────────────────────────

@router.post("/sessions", response_model=ChatSessionOut, status_code=201)
def create_session(
    payload: ChatSessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = ChatSession(user_id=current_user.id, title=payload.title or "New Conversation")
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("/sessions", response_model=List[ChatSessionOut])
def list_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(ChatSession)
        .filter(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.updated_at.desc())
        .all()
    )


@router.get("/sessions/{session_id}/messages", response_model=List[ChatMessageOut])
def get_session_messages(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    return session.messages


@router.delete("/sessions/{session_id}", status_code=200)
def delete_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    db.delete(session)
    db.commit()
    return {"message": "Session deleted"}


@router.patch("/sessions/{session_id}/title", response_model=ChatSessionOut)
def rename_session(
    session_id: int,
    title: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.title = title
    db.commit()
    db.refresh(session)
    return session


# ── Streaming Chat ────────────────────────────────────────────────────────────

@router.post("/send")
async def send_message(
    payload: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Send a message and stream the AI response via SSE.
    Frontend should consume via fetch with ReadableStream.
    """
    # Verify session ownership
    session = db.query(ChatSession).filter(
        ChatSession.id == payload.session_id,
        ChatSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    # Build conversation history (last 20 messages for context efficiency)
    history_rows = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == payload.session_id)
        .order_by(ChatMessage.created_at.asc())
        .limit(20)
        .all()
    )
    conversation_history = [{"role": m.role, "content": m.content} for m in history_rows]

    # Persist user message immediately
    user_msg = ChatMessage(
        session_id=payload.session_id,
        role="user",
        content=payload.message,
    )
    db.add(user_msg)

    # Auto-title session from first message
    if len(history_rows) == 0 and session.title == "New Conversation":
        title = payload.message[:60] + ("..." if len(payload.message) > 60 else "")
        session.title = title

    db.commit()

    # Capture user_id for use inside the async generator (avoid closed db session)
    user_id = current_user.id
    session_id = payload.session_id
    message = payload.message

    async def event_generator():
        full_response = []
        try:
            async for token in stream_chat_response(
                user=current_user,
                conversation_history=conversation_history,
                user_message=message,
            ):
                full_response.append(token)
                yield f"data: {json.dumps({'token': token})}\n\n"

            # Persist assistant response in a fresh DB session
            assistant_content = "".join(full_response)
            with SessionLocal() as new_db:
                new_db.add(ChatMessage(
                    session_id=session_id,
                    role="assistant",
                    content=assistant_content,
                ))
                # Bump session updated_at
                sess = new_db.query(ChatSession).filter(ChatSession.id == session_id).first()
                if sess:
                    from sqlalchemy.sql import func
                    sess.updated_at = func.now()
                new_db.commit()

            yield f"data: {json.dumps({'done': True})}\n\n"

        except Exception as e:
            error_msg = str(e)
            # Still commit whatever we got
            if full_response:
                assistant_content = "".join(full_response)
                try:
                    with SessionLocal() as err_db:
                        err_db.add(ChatMessage(
                            session_id=session_id,
                            role="assistant",
                            content=assistant_content,
                        ))
                        err_db.commit()
                except Exception:
                    pass
            yield f"data: {json.dumps({'error': error_msg, 'done': True})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
