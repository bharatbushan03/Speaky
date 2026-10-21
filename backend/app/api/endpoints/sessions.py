import logging
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from pydantic import ValidationError

from app.core.errors import APIError
from app.core.security import AuthenticatedUser, get_current_user
from app.db.database import get_user_database
from app.models.schemas import (
    EvaluationDraft,
    SessionEvaluation,
    QuestionBatchCreate,
    ResponseSubmit,
    SessionConfigCreate,
    SessionConfigResponse,
    SessionConfigUpdate,
    SessionConfigWithDetails,
)
from app.services.session_service import SessionService
from app.services.ai_interfaces import QuestionGenerator, SessionEvaluator
from app.services.question_generation import get_question_generator
from app.services.evaluation import (
    get_session_evaluator,
    normalize_evaluation,
    parse_evaluation_weights,
)
from app.core.config import settings

logger = logging.getLogger(__name__)

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


@router.post(
    "/{session_id}/questions/generate",
    response_model=SessionConfigWithDetails,
)
async def generate_question(
    session_id: UUID,
    service: SessionService = Depends(get_session_service),
    generator: QuestionGenerator = Depends(get_question_generator),
):
    """Generate and persist the next question for an owned session.

    The stored session is the source of truth for role/subject, difficulty,
    prior questions, and prior answers. A complete set is returned unchanged,
    making browser retries safe and avoiding another provider call.
    """
    session = await service.get_session(session_id)
    if session.status in {"completed", "cancelled"}:
        raise APIError(409, "invalid_transition", "Questions cannot be generated for a terminal session")
    if len(session.questions) >= session.question_count:
        return session

    try:
        question = await generator.generate_question(session)
    except APIError:
        raise
    except Exception as exc:
        logger.exception("Question provider failed without a stable APIError")
        raise APIError(503, "provider_unavailable", "The AI provider is unavailable") from exc

    return await service.persist_generated_question(
        session_id,
        len(session.questions),
        question,
    )


@router.post("/{session_id}/start", response_model=SessionConfigWithDetails)
async def start_session(
    session_id: UUID,
    service: SessionService = Depends(get_session_service),
):
    """Enter in-progress state after at least the first question is ready."""
    return await service.start_session(session_id)


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


@router.get("/{session_id}/evaluation", response_model=SessionEvaluation)
async def get_session_evaluation(
    session_id: UUID,
    service: SessionService = Depends(get_session_service),
):
    """Return the persisted report for an owned completed session."""
    return await service.get_evaluation(session_id)


@router.post("/{session_id}/evaluate", response_model=SessionEvaluation)
async def evaluate_session(
    session_id: UUID,
    service: SessionService = Depends(get_session_service),
    evaluator: SessionEvaluator = Depends(get_session_evaluator),
):
    """Evaluate and persist every answer in an owned completed session.

    Existing reports are returned idempotently. A provider failure never writes
    a partial report, so the browser can safely retry the same request.
    """
    session = await service.get_session(session_id)
    if session.status != "completed":
        raise APIError(
            409,
            "evaluation_not_allowed",
            "Only completed sessions can be evaluated",
        )

    try:
        return await service.get_evaluation(session_id)
    except APIError as exc:
        if exc.code != "evaluation_not_found":
            raise

    try:
        draft = EvaluationDraft.model_validate(await evaluator.evaluate_session(session))
        draft = normalize_evaluation(
            session,
            draft,
            parse_evaluation_weights(settings.EVALUATION_WEIGHTS_JSON),
        )
        return await service.persist_evaluation(
            session_id,
            draft,
            session.explanation_language.value,
        )
    except APIError:
        raise
    except ValidationError as exc:
        raise APIError(
            502,
            "provider_invalid_response",
            "The AI provider returned invalid evaluation data",
        ) from exc
    except Exception as exc:
        logger.exception("Session evaluator failed without a stable APIError")
        raise APIError(503, "provider_unavailable", "The AI provider is unavailable") from exc
