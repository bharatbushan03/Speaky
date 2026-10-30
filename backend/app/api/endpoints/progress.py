import logging
from typing import List, Optional
from datetime import date, datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from app.core.errors import APIError
from app.core.security import AuthenticatedUser, get_current_user
from app.db.database import get_user_database
from app.models.schemas import (
    SessionEvaluation,
    ProgressSummary,
    SessionHistoryItem,
    TrendPoint,
    RecommendationItem,
)
from app.services.session_service import SessionService

logger = logging.getLogger(__name__)

router = APIRouter(tags=["progress"])


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
    start_date: Optional[date] = Query(None, description="Only sessions created on or after this date"),
    end_date: Optional[date] = Query(None, description="Only sessions created on or before this date"),
    limit: int = Query(50, ge=1, le=200, description="Maximum number of sessions to return"),
    offset: int = Query(0, ge=0, description="Number of sessions to skip for pagination"),
    service: SessionService = Depends(get_progress_service),
):
    """Get the authenticated user's session history with filtering and pagination."""
    query_params: dict[str, object] = {
        "select": "*,session_evaluations(overall_score)",
        "user_id": f"eq.{service.user_id}",
        "order": "created_at.desc",
        "limit": limit,
        "offset": offset,
    }

    if mode:
        if mode not in {"hr", "technical", "viva"}:
            raise APIError(422, "invalid_input", "Unknown practice mode")
        query_params["mode"] = f"eq.{mode}"
    if topic:
        cleaned = "".join(ch for ch in topic if ch.isalnum() or ch in " ._-")[:80].strip()
        if cleaned:
            query_params["topic_focus"] = f"ilike.*{cleaned}*"
    if status:
        if status not in {"completed", "in_progress", "created", "cancelled"}:
            raise APIError(422, "invalid_input", "Unknown session status")
        query_params["status"] = f"eq.{status}"
    start_bound = f"{start_date.isoformat()}T00:00:00Z" if start_date else None
    # Exclusive upper bound so the full end date is included.
    end_bound = f"{(end_date + timedelta(days=1)).isoformat()}T00:00:00Z" if end_date else None
    if start_bound and end_bound:
        query_params["and"] = f"(created_at.gte.{start_bound},created_at.lt.{end_bound})"
    elif start_bound:
        query_params["created_at"] = f"gte.{start_bound}"
    elif end_bound:
        query_params["created_at"] = f"lt.{end_bound}"

    rows = await service.db.request(
        "GET",
        "/rest/v1/sessions",
        params=query_params,
    ) or []

    history: list[SessionHistoryItem] = []
    for row in rows:
        eval_raw = row.get("session_evaluations")
        evaluation = eval_raw[0] if isinstance(eval_raw, list) and eval_raw else eval_raw if isinstance(eval_raw, dict) else {}
        created_at = row.get("created_at")
        started_at = row.get("started_at")
        completed_at = row.get("completed_at")
        duration_minutes = None
        if started_at and completed_at:
            try:
                start = datetime.fromisoformat(started_at.replace("Z", "+00:00"))
                end = datetime.fromisoformat(completed_at.replace("Z", "+00:00"))
                duration_minutes = max(0, round((end - start).total_seconds() / 60))
            except ValueError:
                logger.warning("Invalid session timestamps returned for history row")
        history.append(SessionHistoryItem(
            session_id=str(row.get("id")),
            mode=row.get("mode", "unknown"),
            topic=row.get("topic_focus"),
            status=row.get("status", "unknown"),
            question_count=int(row.get("question_count", 0)),
            started_at=started_at,
            completed_at=completed_at,
            overall_score=evaluation.get("overall_score") if isinstance(evaluation, dict) else None,
            date=str(created_at)[:10] if created_at else "",
            duration_minutes=duration_minutes,
        ))
    return history


# ──────────────────────────────────────────────────────────────────────
# Detailed Session Report Endpoint
# ──────────────────────────────────────────────────────────────────────

@router.get("/sessions/{session_id}/report", response_model=SessionEvaluation)
async def get_session_report(
    session_id: UUID,
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
            "user_id": f"eq.{service.user_id}",
            "status": "eq.completed",
            "order": "created_at",
            "limit": 100,
        },
    ) or []

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
            "select": "*,session_evaluations(overall_score, dimensions, response_evaluations(*,corrections,explanations,strengths,improvements,retry_recommendations)),session_responses(*,question_id,answer_text)",
            "user_id": f"eq.{service.user_id}",
            "status": "eq.completed",
            "order": "created_at.desc",
            "limit": 50,
        },
    ) or []

    return await service.get_personalized_recommendations(rows)
