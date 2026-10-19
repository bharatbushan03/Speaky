from fastapi import APIRouter, HTTPException, status, Query
from typing import List
from app.models.schemas import PracticeSessionCreate, PracticeSessionResponse, UserProgress
from app.services.session_service import SessionService

router = APIRouter()
session_service = SessionService()


@router.post("/", response_model=PracticeSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(session_data: PracticeSessionCreate, user_id: str = Query(...)):
    """Create a new practice session with AI feedback."""
    try:
        session = await session_service.create_session(user_id, session_data)
        return session
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create session: {str(e)}"
        )


@router.get("/{session_id}", response_model=PracticeSessionResponse)
async def get_session(session_id: str):
    """Get a specific practice session."""
    session = await session_service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return session


@router.get("/user/{user_id}", response_model=List[PracticeSessionResponse])
async def get_user_sessions(user_id: str, limit: int = Query(10, ge=1, le=100)):
    """Get all sessions for a user."""
    sessions = await session_service.get_user_sessions(user_id, limit)
    return sessions


@router.get("/user/{user_id}/progress", response_model=UserProgress)
async def get_user_progress(user_id: str):
    """Get user's progress and statistics."""
    progress = await session_service.get_user_progress(user_id)
    return progress
