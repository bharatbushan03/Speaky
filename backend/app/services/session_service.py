from typing import Any, List, Optional, Dict, Tuple, Union, Protocol
from uuid import UUID
from datetime import datetime, timedelta

import json

from app.core.errors import APIError
from app.models.schemas import (
    EvaluationDraft,
    SessionEvaluation,
    GeneratedQuestion,
    QuestionBatchCreate,
    ResponseSubmit,
    SessionConfigCreate,
    SessionConfigResponse,
    SessionConfigUpdate,
    SessionConfigWithDetails,
    ProgressSummary,
    SessionHistoryItem,
    SessionHistoryFilters,
    TrendPoint,
    RecommendationItem,
    DimensionScore,
    EvaluationDimension,
)


class SessionDatabase(Protocol):
    """Async PostgREST client authenticated with the current user's access token."""

    async def request(
        self,
        method: str,
        path: str,
        *,
        params: Optional[dict] = None,
        json: Optional[dict] = None,
    ) -> Any:
        ...


class SessionService:
    """User-scoped session reads and atomic, SQL-authoritative mutations.

    The database wrapper maps PostgREST/SQL failures to APIError. Mutations
    deliberately use a single RPC, allowing SQL to enforce ownership, question
    counts, answer upserts, transitions, and idempotent completion atomically.
    """

    def __init__(self, db: SessionDatabase, user_id: str):
        self.db = db
        self.user_id = user_id

    @staticmethod
    def _with_sorted_details(data: dict) -> SessionConfigWithDetails:
        session = SessionConfigWithDetails.model_validate(data)
        session.questions.sort(key=lambda question: question.order_index)
        question_order = {
            question.id: question.order_index for question in session.questions
        }
        session.responses.sort(
            key=lambda response: (
                question_order.get(response.question_id, session.question_count),
                response.id,
            )
        )
        return session

    async def _mutate(
        self,
        action: str,
        session_id: Optional[UUID],
        payload: dict,
    ) -> SessionConfigWithDetails:
        data = await self.db.request(
            "POST",
            "/rest/v1/rpc/manage_practice_session",
            json={
                "p_action": action,
                "p_session_id": str(session_id) if session_id is not None else None,
                "p_payload": payload,
            },
        )
        return self._with_sorted_details(data)

    async def create_session(
        self, session_data: SessionConfigCreate
    ) -> SessionConfigWithDetails:
        """Create configuration only; no questions or AI feedback are generated."""
        return await self._mutate("create", None, session_data.model_dump(mode="json"))

    async def get_user_sessions(
        self, limit: int = 10, offset: int = 0
    ) -> List[SessionConfigResponse]:
        if not 1 <= limit <= 100 or offset < 0:
            raise APIError(
                status_code=422,
                code="invalid_input",
                detail="limit must be between 1 and 100 and offset must be nonnegative",
            )
        rows = await self.db.request(
            "GET",
            "/rest/v1/sessions",
            params={
                "select": "*",
                "user_id": f"eq.{self.user_id}",
                "order": "created_at.desc",
                "limit": limit,
                "offset": offset,
            },
        )
        return [SessionConfigResponse.model_validate(row) for row in rows]

    async def get_session(self, session_id: UUID) -> SessionConfigWithDetails:
        rows = await self.db.request(
            "GET",
            "/rest/v1/sessions",
            params={
                "select": "*,questions:session_questions(*),responses:session_responses(*)",
                "id": f"eq.{session_id}",
                "user_id": f"eq.{self.user_id}",
            },
        )
        if not rows:
            raise APIError(
                status_code=404,
                code="session_not_found",
                detail="Session not found",
            )
        return self._with_sorted_details(rows[0])

    async def update_session(
        self, session_id: UUID, session_data: SessionConfigUpdate
    ) -> SessionConfigWithDetails:
        # Preserve explicit null topic_focus while excluding omitted patch fields.
        return await self._mutate(
            "update", session_id, session_data.model_dump(mode="json", exclude_unset=True)
        )

    async def set_questions(
        self, session_id: UUID, questions: QuestionBatchCreate
    ) -> SessionConfigWithDetails:
        """Persist the static bank only while created, as checked by the RPC."""
        return await self._mutate("questions", session_id, questions.model_dump(mode="json"))

    async def persist_generated_question(
        self,
        session_id: UUID,
        order_index: int,
        question: GeneratedQuestion,
    ) -> SessionConfigWithDetails:
        """Persist one generated question using the expected sequence index.

        The database RPC locks the session and returns an existing row when a
        retry races with a successful write for the same index. Provider IDs
        are never accepted from the client or provider.
        """
        data = await self.db.request(
            "POST",
            "/rest/v1/rpc/persist_generated_question",
            json={
                "p_session_id": str(session_id),
                "p_order_index": order_index,
                "p_question": question.model_dump(mode="json"),
            },
        )
        return self._with_sorted_details(data)

    async def start_session(self, session_id: UUID) -> SessionConfigWithDetails:
        """Start a session after its first question has been persisted."""
        data = await self.db.request(
            "POST",
            "/rest/v1/rpc/start_practice_session",
            json={"p_session_id": str(session_id)},
        )
        return self._with_sorted_details(data)

    async def submit_response(
        self, session_id: UUID, response: ResponseSubmit
    ) -> SessionConfigWithDetails:
        """Upsert an answer for a question belonging to this session."""
        return await self._mutate("response", session_id, response.model_dump(mode="json"))

    async def complete_session(self, session_id: UUID) -> SessionConfigWithDetails:
        """Complete once every configured question is answered; repeat calls are safe."""
        return await self._mutate("complete", session_id, {})

    async def get_evaluation(self, session_id: UUID) -> SessionEvaluation:
        """Read the latest report through the authenticated user's RLS context."""
        rows = await self.db.request(
            "GET",
            "/rest/v1/session_evaluations",
            params={
                "select": "*,answer_evaluations:response_evaluations(*)",
                "session_id": f"eq.{session_id}",
            },
        )
        if not rows:
            raise APIError(
                status_code=404,
                code="evaluation_not_found",
                detail="No evaluation is available for this session",
            )
        return SessionEvaluation.model_validate(rows[0])

    async def persist_evaluation(
        self,
        session_id: UUID,
        evaluation: EvaluationDraft,
        explanation_language: str,
    ) -> SessionEvaluation:
        """Persist one report and its response-linked child evaluations atomically."""
        payload = evaluation.model_dump(mode="json")
        payload["explanation_language"] = explanation_language
        data = await self.db.request(
            "POST",
            "/rest/v1/rpc/persist_session_evaluation",
            json={
                "p_session_id": str(session_id),
                "p_evaluation": payload,
            },
        )
        return SessionEvaluation.model_validate(data)

    async def get_progress_summary(self) -> ProgressSummary:
        """Compute the authenticated user's progress summary from stored data."""
        # New sessions are owned by Supabase Auth and do not update the legacy
        # user_progress table. Read the session tables directly so analytics are
        # consistent with the practice flow.
        sessions_rows = await self.db.request(
            "GET",
            "/rest/v1/sessions",
            params={
                "select": "*,session_evaluations(id, overall_score, dimensions, created_at),session_responses(id)",
                "status": "eq.completed",
                "order": "created_at.desc",
                "limit": 500,
            },
        )
        # Calculate scores, dimensions, and question counts in one pass over
        # the bounded embedded result instead of issuing one query per session.
        total_questions = 0
        score_sum = 0.0
        score_count = 0
        grammar_scores: list[float] = []
        vocabulary_scores: list[float] = []
        fluency_scores: list[float] = []

        practice_dates: set[str] = set()
        for session_row in sessions_rows:
            created_at = session_row.get("created_at")
            if created_at:
                practice_dates.add(str(created_at)[:10])
            eval_row = session_row.get("session_evaluations")
            if eval_row and len(eval_row) > 0:
                eval_data = eval_row[0]
                overall = eval_data.get("overall_score")
                if overall is not None:
                    score_sum += float(overall)
                    score_count += 1

            total_questions += len(session_row.get("session_responses") or [])

            # Collect dimension scores from evaluations
            if eval_row and len(eval_row) > 0:
                dims = eval_row[0].get("dimensions")
                if dims:
                    for dim_name, dim_data in dims.items():
                        if isinstance(dim_data, dict) and dim_data.get("available") and dim_data.get("score") is not None:
                            score = float(dim_data["score"])
                            if dim_name == "grammar":
                                grammar_scores.append(score)
                            elif dim_name == "vocabulary":
                                vocabulary_scores.append(score)
                            elif dim_name == "spoken_fluency":
                                fluency_scores.append(score)

        avg_score = round(score_sum / score_count, 2) if score_count > 0 else None
        avg_grammar = round(sum(grammar_scores) / len(grammar_scores), 2) if grammar_scores else None
        avg_vocab = round(sum(vocabulary_scores) / len(vocabulary_scores), 2) if vocabulary_scores else None
        avg_fluency = round(sum(fluency_scores) / len(fluency_scores), 2) if fluency_scores else None

        # Derive streaks from the new session dates. A current streak includes
        # today or yesterday, which avoids resetting a streak before a user has
        # had a chance to practise today.
        from datetime import date
        ordered_dates = sorted((date.fromisoformat(value) for value in practice_dates), reverse=True)
        current_streak = 0
        if ordered_dates:
            today = date.today()
            if ordered_dates[0] in {today, today - timedelta(days=1)}:
                cursor = ordered_dates[0]
                for practice_date in ordered_dates:
                    if practice_date == cursor:
                        current_streak += 1
                        cursor -= timedelta(days=1)
                    elif practice_date < cursor:
                        break
        longest_streak = 0
        running_streak = 0
        previous = None
        for practice_date in sorted(ordered_dates):
            if previous is not None and practice_date == previous + timedelta(days=1):
                running_streak += 1
            else:
                running_streak = 1
            longest_streak = max(longest_streak, running_streak)
            previous = practice_date
        last_practice_date = ordered_dates[0].isoformat() if ordered_dates else None

        # Count sessions by mode
        sessions_by_mode: Dict[str, int] = {}
        for session_row in sessions_rows:
            mode = session_row.get("mode", "unknown")
            sessions_by_mode[mode] = sessions_by_mode.get(mode, 0) + 1

        return ProgressSummary(
            total_sessions=len(sessions_rows),
            total_questions=total_questions,
            average_score=avg_score,
            grammar_score=avg_grammar,
            vocabulary_score=avg_vocab,
            fluency_score=avg_fluency,
            pronunciation_score=None,
            current_streak=current_streak,
            longest_streak=longest_streak,
            last_practice_date=last_practice_date,
            sessions_by_mode=sessions_by_mode,
        )

    async def get_performance_trends(
        self, sessions_rows: list[dict]
    ) -> List[TrendPoint]:
        """Compute performance trends from pre-fetched session rows."""
        points: List[TrendPoint] = []

        for session_row in sessions_rows:
            created_at = session_row.get("created_at")
            if not created_at:
                continue

            eval_row = session_row.get("session_evaluations")
            overall = None
            grammar = None
            vocabulary = None
            fluency = None

            if eval_row and len(eval_row) > 0:
                eval_data = eval_row[0]
                overall = eval_data.get("overall_score")

                dims = eval_data.get("dimensions")
                if isinstance(dims, dict):
                    for dim_name, dim_data in dims.items():
                        if isinstance(dim_data, dict) and dim_data.get("available") and dim_data.get("score") is not None:
                            score = float(dim_data["score"])
                            if dim_name == "grammar":
                                grammar = score
                            elif dim_name == "vocabulary":
                                vocabulary = score
                            elif dim_name == "spoken_fluency":
                                fluency = score

            # Format date for trend point
            date_str = created_at[:10] if isinstance(created_at, str) else str(created_at)[:10]

            points.append(
                TrendPoint(
                    date=date_str,
                    score=overall,
                    grammar=grammar,
                    vocabulary=vocabulary,
                    fluency=fluency,
                )
            )

        # Sort by date
        points.sort(key=lambda p: p.date)
        return points

    async def get_personalized_recommendations(
        self, sessions_rows: list[dict]
    ) -> List[RecommendationItem]:
        """Generate personalized learning recommendations from session data."""
        recommendations: List[RecommendationItem] = []

        # Collect all answer evaluations across sessions
        all_answer_evaluations: list[dict] = []
        all_responses: list[dict] = []

        for session_row in sessions_rows:
            eval_row = session_row.get("session_evaluations")
            if eval_row and len(eval_row) > 0:
                eval_data = eval_row[0]
                ae_list = eval_data.get("answer_evaluations", [])
                # Get the response_evaluations for each answer evaluation
                for ae in ae_list:
                    response_id = ae.get("response_id")
                    question_id = ae.get("question_id")
                    # Fetch the response details
                    resp_rows = await self.db.request(
                        "GET",
                        "/rest/v1/session_responses",
                        params={
                            "select": "*",
                            "id": f"eq.{response_id}",
                            "session_id": f"eq.{session_row.get('id')}",
                        },
                    )
                    if resp_rows:
                        all_responses.append(resp_rows[0])

                    # Fetch the response_evaluations
                    rp_rows = await self.db.request(
                        "GET",
                        "/rest/v1/response_evaluations",
                        params={
                            "select": "*",
                            "evaluation_id": f"eq.{eval_data.get('id')}",
                            "response_id": f"eq.{response_id}",
                        },
                    )
                    eval_copy = dict(ae)
                    if rp_rows:
                        eval_copy["corrections"] = rp_rows[0].get("corrections", [])
                        eval_copy["explanations"] = rp_rows[0].get("explanations", [])
                        eval_copy["strengths"] = rp_rows[0].get("strengths", [])
                        eval_copy["improvements"] = rp_rows[0].get("improvements", [])
                        eval_copy["retry_recommendations"] = rp_rows[0].get("retry_recommendations", [])
                    all_answer_evaluations.append(eval_copy)

        # Analyze recurring grammar mistakes
        grammar_mistakes: Dict[str, int] = {}
        for ae in all_answer_evaluations:
            corrections = ae.get("corrections", [])
            for correction in corrections:
                cat = correction.get("category", "")
                if cat == "grammar":
                    original = correction.get("original", "").lower().strip()
                    if original:
                        grammar_mistakes[original] = grammar_mistakes.get(original, 0) + 1

        # Generate recommendations based on analysis
        if grammar_mistakes:
            top_mistakes = sorted(grammar_mistakes.items(), key=lambda x: x[1], reverse=True)[:3]
            for mistake, count in top_mistakes:
                recommendations.append(
                    RecommendationItem(
                        id=f"grammar_{mistake[:30]}",
                        type="grammar",
                        title=f"Practise recurring grammar mistake: '{mistake}'",
                        reason=f"This mistake appeared {count} time(s) across your sessions. Focus on this pattern in your next practice.",
                        action_href="/practice/grammar",
                    )
                )

        # Check for sessions with low scores for retry recommendations
        low_score_sessions = []
        for session_row in sessions_rows:
            eval_row = session_row.get("session_evaluations")
            if eval_row and len(eval_row) > 0:
                overall = eval_row[0].get("overall_score")
                if overall is not None and float(overall) < 7.0:
                    low_score_sessions.append(session_row.get("id"))

        if low_score_sessions:
            recommendations.append(
                RecommendationItem(
                    id="retry_low_scores",
                    type="retry",
                    title="Repeat sessions with lower scores",
                    reason=f"You have {len(low_score_sessions)} session(s) with scores below 7.0. Re-attempting these will help track improvement.",
                    action_href=None,
                )
            )

        # Vocabulary expansion recommendation
        vocab_scores = []
        for session_row in sessions_rows:
            eval_row = session_row.get("session_evaluations")
            if eval_row and len(eval_row) > 0:
                dims = eval_row[0].get("dimensions", {})
                vocab = dims.get("vocabulary", {}).get("score")
                if vocab is not None:
                    vocab_scores.append(float(vocab))

        if vocab_scores and sum(1 for s in vocab_scores if s < 7.0) > len(vocab_scores) * 0.5:
            recommendations.append(
                RecommendationItem(
                    id="vocabulary_expansion",
                    type="vocabulary",
                    title="Expand vocabulary for your preferred topics",
                    reason="More than half of your evaluated dimensions show vocabulary scores below 7.0. Consider focusing on topic-specific vocabulary expansion.",
                    action_href="/practice/vocabulary",
                )
            )

        # Fluency recommendation if data available
        fluency_scores = []
        for session_row in sessions_rows:
            eval_row = session_row.get("session_evaluations")
            if eval_row and len(eval_row) > 0:
                dims = eval_row[0].get("dimensions", {})
                flu = dims.get("spoken_fluency", {})
                if flu.get("available") and flu.get("score") is not None:
                    fluency_scores.append(float(flu["score"]))

        if fluency_scores and sum(1 for s in fluency_scores if s < 7.0) > len(fluency_scores) * 0.5:
            recommendations.append(
                RecommendationItem(
                    id="fluency_practice",
                    type="fluency",
                    title="Work on pronunciation and fluency",
                    reason=f"More than half of your sessions show fluency scores below 7.0. Consider practice with voice recording for timing feedback.",
                    action_href="/practice/fluency",
                )
            )

        # Structure improvement recommendation
        recommendations.append(
            RecommendationItem(
                id="structure_improvement",
                type="structure",
                title="Improve answer structure for interview/viva questions",
                reason="Structured answers with a clear point, evidence, and result pattern consistently score higher across practice modes.",
                action_href="/practice",
            )
        )

        # Sort by relevance and return top 5
        return recommendations[:5]
