from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from app.core.security import AuthenticatedUser, get_current_user
from app.db.database import get_user_database
from app.models.schemas import (
    QuestionBatchCreate,
    ResponseSubmit,
    SessionConfigCreate,
    SessionConfigResponse,
    SessionConfigUpdate,
    SessionConfigWithDetails,
)
from app.services.session_service import SessionService

router = APIRouter()


def get_session_service(
    user: AuthenticatedUser = Depends(get_current_user),
) -> SessionService:
    """Construct a service with this request's authenticated PostgREST client."""
    return SessionService(
        db=get_user_database(user.access_token),
        user_id=user.user_id,
    )


@router.post(
    "/", response_model=SessionConfigWithDetails, status_code=status.HTTP_201_CREATED
)
async def create_session(
    session_data: SessionConfigCreate,
    service: SessionService = Depends(get_session_service),
):
    """Create an owned session in created status, without generating questions."""
    return await service.create_session(session_data)


@router.get("/", response_model=List[SessionConfigResponse])
async def get_user_sessions(
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    service: SessionService = Depends(get_session_service),
):
    """List the authenticated user's sessions, newest first."""
    return await service.get_user_sessions(limit=limit, offset=offset)


@router.get("/{session_id}", response_model=SessionConfigWithDetails)
async def get_session(
    session_id: UUID,
    service: SessionService = Depends(get_session_service),
):
    """Read an owned session with questions ordered by order_index."""
    return await service.get_session(session_id)


@router.patch("/{session_id}", response_model=SessionConfigWithDetails)
async def update_session(
    session_id: UUID,
    session_data: SessionConfigUpdate,
    service: SessionService = Depends(get_session_service),
):
    """Patch status, question index, or topic; SQL enforces valid transitions."""
    return await service.update_session(session_id, session_data)


@router.put("/{session_id}/questions", response_model=SessionConfigWithDetails)
async def set_questions(
    session_id: UUID,
    questions: QuestionBatchCreate,
    service: SessionService = Depends(get_session_service),
):
    """Set exactly question_count static questions while the session is created."""
    return await service.set_questions(session_id, questions)


@router.post("/{session_id}/responses", response_model=SessionConfigWithDetails)
async def submit_response(
    session_id: UUID,
    response: ResponseSubmit,
    service: SessionService = Depends(get_session_service),
):
    """Submit or replace a text answer or voice transcript for a session question."""
    return await service.submit_response(session_id, response)


@router.post("/{session_id}/complete", response_model=SessionConfigWithDetails)
async def complete_session(
    session_id: UUID,
    service: SessionService = Depends(get_session_service),
):
    """Complete an answered session idempotently; no request body is required."""
    return await service.complete_session(session_id)
