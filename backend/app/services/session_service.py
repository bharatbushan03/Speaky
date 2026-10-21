from typing import Any, List, Optional, Protocol
from uuid import UUID

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
