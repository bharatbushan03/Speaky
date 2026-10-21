import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from pydantic import ValidationError

from app.core.errors import APIError
from app.core.security import AuthenticatedUser, get_current_user
from app.db.database import get_user_database
from app.models.schemas import (
    SessionEvaluation,
    SessionConfigResponse,
    EvaluationDraft,
    DimensionScore,
    EvaluationDimension,
    ProgressSummary,
    SessionHistoryItem,
    SessionHistoryFilters,
    TrendPoint,
    RecommendationItem,
)
from app.services.session_service import SessionService
from app.services.evaluation import normalize_evaluation, parse_evaluation_weights
from app.services.evaluation import _has_reliable_fluency_data
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/progress", tags=["progress"])


def get_progress_service(
    user: AuthenticatedUser = Depends(get_current_user),
) -> SessionService:
    """Construct a service with this request's authenticated PostgREST client."""
    return SessionService(
        db=get_user_database(user.access_token),
        user_id=user.user_id,
    )


# ──────────────────────────────────────────────────────────────────────
# Progress Summary Endpoint
# ──────────────────────────────────────────────────────────────────────

@router.get("/summary", response_model=ProgressSummary)
async def get_progress_summary(
    service: SessionService = Depends(get_progress_service),
):
    """Get the authenticated user's progress summary from actual stored data."""
    return await service.get_progress_summary()


# ──────────────────────────────────────────────────────────────────────
# Session History Endpoint
# ──────────────────────────────────────────────────────────────────────

@router.get("/history", response_model=List[SessionHistoryItem])
async def get_session_history(
    mode: Optional[str] = Query(None, description="Filter by practice mode (hr, technical, viva)"),
    topic: Optional[str] = Query(None, description="Filter by topic focus"),
    status: Optional[str] = Query(None, description="Filter by completion status (completed, in_progress, created, cancelled)"),
    limit: int = Query(50, ge=1, le=200, description="Maximum number of sessions to return"),
    offset: int = Query(0, ge=0, description="Number of sessions to skip for pagination"),
    service: SessionService = Depends(get_progress_service),
):
    """Get the authenticated user's session history with filtering and pagination."""
    query_params = {
        "select": "*,session_evaluations(overall_score)",
        "order": "created_at.desc",
        "limit": limit,
        "offset": offset,
    }

    if mode:
        query_params["mode"] = f"eq.{mode}"
    if topic:
        query_params["topic_focus"] = f"eq.{topic}"
    if status:
        query_params["status"] = f"eq.{status}"

    rows = await service.db.request(
        "GET",
        "/rest/v1/sessions",
        params=query_params,
    )

    return [SessionHistoryItem.model_validate(row) for row in rows]


# ──────────────────────────────────────────────────────────────────────
# Detailed Session Report Endpoint
# ──────────────────────────────────────────────────────────────────────

@router.get("/sessions/{session_id}/report", response_model=SessionEvaluation)
async def get_session_report(
    session_id: str,
    service: SessionService = Depends(get_progress_service),
):
    """Get the detailed evaluation report for a specific session."""
    return await service.get_evaluation(session_id)


# ──────────────────────────────────────────────────────────────────────
# Performance Trends Endpoint
# ──────────────────────────────────────────────────────────────────────

@router.get("/trends", response_model=List[TrendPoint])
async def get_performance_trends(
    service: SessionService = Depends(get_progress_service),
):
    """Get performance trends across completed sessions."""
    rows = await service.db.request(
        "GET",
        "/rest/v1/sessions",
        params={
            "select": "*,session_evaluations(overall_score, dimensions, created_at)",
            "status": "eq.completed",
            "order": "created_at",
        },
    )

    return await service.get_performance_trends(rows)


# ──────────────────────────────────────────────────────────────────────
# Personalized Recommendations Endpoint
# ──────────────────────────────────────────────────────────────────────

@router.get("/recommendations", response_model=List[RecommendationItem])
async def get_personalized_recommendations(
    service: SessionService = Depends(get_progress_service),
):
    """Get personalized learning recommendations based on the user's session history."""
    rows = await service.db.request(
        "GET",
        "/rest/v1/sessions",
        params={
            "select": "*,session_evaluations(overall_score, dimensions, answer_evaluations(*,response_evaluations(*,corrections,explanations,strengths,improvements,retry_recommendations))),responses(*,question_id,answer_text)",
            "status": "eq.completed",
            "order": "created_at.desc",
        },
    )

    return await service.get_personalized_recommendations(rows)