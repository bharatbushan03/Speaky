import unittest
from datetime import datetime, timezone
from uuid import UUID, uuid4

from fastapi.testclient import TestClient

from app.api.endpoints.sessions import get_session_service
from app.core.errors import APIError
from app.models.schemas import SessionConfigWithDetails
from app.services.session_service import SessionService
from app.services.ai_interfaces import UnconfiguredQuestionGenerator
from main import app


def detail_payload(session_id: UUID | None = None) -> dict:
    session_id = session_id or uuid4()
    now = datetime.now(timezone.utc).isoformat()
    question_id = uuid4()
    return {
        "id": str(session_id),
        "user_id": str(uuid4()),
        "mode": "hr",
        "job_role": "Software engineer",
        "subject": None,
        "proficiency_level": "intermediate",
        "difficulty": "medium",
        "interaction_mode": "text",
        "question_count": 3,
        "explanation_language": "english",
        "topic_focus": None,
        "status": "created",
        "current_question_index": 0,
        "started_at": None,
        "completed_at": None,
        "created_at": now,
        "updated_at": now,
        "questions": [
            {
                "id": str(question_id),
                "session_id": str(session_id),
                "text": "Tell me about yourself.",
                "context": None,
                "hints": None,
                "order_index": 0,
                "created_at": now,
            }
        ],
        "responses": [],
    }


class FakeSessionService:
    def __init__(self):
        self.created = None

    async def create_session(self, payload):
        self.created = payload
        return SessionConfigWithDetails.model_validate(detail_payload())


class SessionApiTests(unittest.TestCase):
    def setUp(self):
        self.service = FakeSessionService()
        app.dependency_overrides[get_session_service] = lambda: self.service
        self.client = TestClient(app)

    def tearDown(self):
        app.dependency_overrides.clear()

    def test_create_session_forwards_validated_configuration(self):
        response = self.client.post(
            "/api/v1/sessions/",
            json={
                "mode": "technical",
                "job_role": " Backend engineer ",
                "question_count": 3,
                "interaction_mode": "voice",
                "difficulty": "hard",
                "proficiency_level": "advanced",
                "explanation_language": "english",
            },
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(self.service.created.job_role, "Backend engineer")
        self.assertEqual(response.json()["status"], "created")

    def test_create_session_rejects_missing_mode_specific_input(self):
        response = self.client.post(
            "/api/v1/sessions/",
            json={"mode": "viva", "question_count": 3},
        )

        self.assertEqual(response.status_code, 422)
        self.assertEqual(response.json()["code"], "validation_error")

    def test_session_routes_require_authentication_when_not_overridden(self):
        app.dependency_overrides.clear()
        response = self.client.get("/api/v1/sessions/")
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["code"], "authentication_required")

    def test_feedback_routes_require_authentication(self):
        app.dependency_overrides.clear()
        response = self.client.post(
            "/api/v1/feedback/analyze",
            json={"text": "A short answer", "session_type": "interview"},
        )
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["code"], "authentication_required")


class SessionServiceAuthorizationTests(unittest.IsolatedAsyncioTestCase):
    async def test_reads_filter_by_authenticated_user(self):
        class FakeDatabase:
            def __init__(self):
                self.request_args = None

            async def request(self, method, path, *, params=None, json=None):
                self.request_args = (method, path, params, json)
                return []

        database = FakeDatabase()
        await SessionService(database, "auth-user-uuid").get_user_sessions()
        self.assertEqual(database.request_args[2]["user_id"], "eq.auth-user-uuid")

    async def test_expected_database_errors_are_not_rewritten(self):
        class FailingDatabase:
            async def request(self, method, path, *, params=None, json=None):
                raise APIError(409, "session_incomplete", "The session is incomplete")

        with self.assertRaisesRegex(APIError, "The session is incomplete"):
            await SessionService(FailingDatabase(), str(uuid4())).complete_session(uuid4())

    async def test_create_uses_authenticated_rpc_without_user_id_override(self):
        class FakeDatabase:
            def __init__(self):
                self.payload = None

            async def request(self, method, path, *, params=None, json=None):
                self.payload = json
                return detail_payload()

        database = FakeDatabase()
        from app.models.schemas import SessionConfigCreate

        await SessionService(database, "auth-user-uuid").create_session(
            SessionConfigCreate(mode="viva", subject="Physics", question_count=3)
        )
        self.assertEqual(database.payload["p_action"], "create")
        self.assertIsNone(database.payload["p_session_id"])
        self.assertNotIn("user_id", database.payload["p_payload"])

    async def test_detail_children_are_sorted_before_return(self):
        payload = detail_payload()
        first = payload["questions"][0]
        second = dict(first, id=str(uuid4()), order_index=2, text="Second")
        third = dict(first, id=str(uuid4()), order_index=1, text="Middle")
        payload["questions"] = [second, first, third]

        class FakeDatabase:
            async def request(self, method, path, *, params=None, json=None):
                return [payload]

        detail = await SessionService(FakeDatabase(), payload["user_id"]).get_session(
            UUID(payload["id"])
        )
        self.assertEqual([item.order_index for item in detail.questions], [0, 1, 2])

    async def test_ai_generation_boundary_is_not_a_fake_provider(self):
        with self.assertRaises(APIError) as caught:
            await UnconfiguredQuestionGenerator().generate_questions(None)
        self.assertEqual(caught.exception.status_code, 501)
        self.assertEqual(caught.exception.code, "question_generation_not_configured")


if __name__ == "__main__":
    unittest.main()
