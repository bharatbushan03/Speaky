import logging
from typing import List, Optional
from datetime import date, datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, Query
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
    date_filters = []
    if start_date:
        date_filters.append(f"gte.{start_date.isoformat()}T00:00:00Z")
    if end_date:
        # Use an exclusive upper bound so the full end date is included.
        date_filters.append(f"lt.{(end_date + timedelta(days=1)).isoformat()}T00:00:00Z")
    if date_filters:
        query_params["created_at"] = ",".join(date_filters)

    rows = await service.db.request(
        "GET",
        "/rest/v1/sessions",
        params=query_params,
    )

    history: list[SessionHistoryItem] = []
    for row in rows:
        evaluation_rows = row.get("session_evaluations") or []
        evaluation = evaluation_rows[0] if isinstance(evaluation_rows, list) and evaluation_rows else {}
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
            overall_score=evaluation.get("overall_score"),
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
            "status": "eq.completed",
            "order": "created_at",
            "limit": 100,
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
            "limit": 50,
        },
    )

    return await service.get_personalized_recommendations(rows)
