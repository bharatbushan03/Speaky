import json
import unittest
from datetime import datetime, timezone
from uuid import UUID, uuid4

import httpx
from fastapi.testclient import TestClient

from app.api.endpoints.sessions import get_question_generator, get_session_service
from app.core.config import settings
from app.core.errors import APIError
from app.models.schemas import GeneratedQuestion, QuestionResponse, SessionConfigWithDetails
from app.services.evaluation import AzureOpenAISessionEvaluator, get_session_evaluator
from app.services.question_generation import (
    AzureOpenAIQuestionGenerator,
    MockQuestionGenerator,
    OpenAIQuestionGenerator,
    azure_openai_chat_completions_url,
    get_question_generator as build_question_generator,
)
from app.services.session_service import SessionService
from main import app


def session_payload(
    *,
    session_id: UUID | None = None,
    status: str = "created",
    questions: list[dict] | None = None,
    responses: list[dict] | None = None,
) -> dict:
    session_id = session_id or uuid4()
    now = datetime.now(timezone.utc).isoformat()
    return {
        "id": str(session_id),
        "user_id": str(uuid4()),
        "mode": "technical",
        "job_role": "Backend engineer",
        "subject": None,
        "proficiency_level": "advanced",
        "difficulty": "hard",
        "interaction_mode": "text",
        "question_count": 3,
        "explanation_language": "english",
        "topic_focus": "distributed systems",
        "status": status,
        "current_question_index": 0,
        "started_at": now if status == "in_progress" else None,
        "completed_at": now if status == "completed" else None,
        "created_at": now,
        "updated_at": now,
        "questions": questions or [],
        "responses": responses or [],
    }


def question_payload(session_id: str, order_index: int, text: str) -> dict:
    return {
        "id": str(uuid4()),
        "session_id": session_id,
        "text": text,
        "context": "context",
        "hints": ["hint"],
        "order_index": order_index,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


class QuestionSchemaTests(unittest.TestCase):
    def test_generated_question_keeps_private_criteria_separate(self):
        question = GeneratedQuestion(
            text="Explain caching.",
            hints=["State a trade-off."],
            evaluation_criteria=["Correctness", "Trade-offs"],
        )
        self.assertEqual(question.evaluation_criteria, ["Correctness", "Trade-offs"])
        self.assertNotIn("evaluation_criteria", QuestionResponse.model_fields)
        self.assertNotIn("unexpected", GeneratedQuestion.model_fields)

    def test_provider_output_rejects_extra_or_oversized_fields(self):
        with self.assertRaises(ValueError):
            GeneratedQuestion(text="Question", unexpected="value")
        with self.assertRaises(ValueError):
            GeneratedQuestion(text="Question", evaluation_criteria=["x" * 501])
        with self.assertRaises(ValueError):
            GeneratedQuestion(text="Question", hints=[" "])


class MockProviderTests(unittest.IsolatedAsyncioTestCase):
    async def test_generates_relevant_follow_up_from_saved_answer(self):
        session_id = str(uuid4())
        first = question_payload(session_id, 0, "How do you design an API?")
        answer = {
            "id": str(uuid4()),
            "session_id": session_id,
            "question_id": first["id"],
            "answer_text": "I use versioning and explicit contracts.",
            "interaction_mode": "text",
            "transcript_edited": False,
            "audio_url": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        session = SessionConfigWithDetails.model_validate(
            session_payload(questions=[first], responses=[answer])
        )
        generated = await MockQuestionGenerator().generate_question(session)
        self.assertIn("follow-up", generated.text.lower())
        self.assertTrue(generated.evaluation_criteria)
        self.assertTrue(generated.hints)


class OpenAIProviderTests(unittest.IsolatedAsyncioTestCase):
    @staticmethod
    def session() -> SessionConfigWithDetails:
        return SessionConfigWithDetails.model_validate(session_payload())

    async def test_validates_one_question_from_official_chat_response_shape(self):
        def handler(request: httpx.Request) -> httpx.Response:
            body = json.loads(request.content)
            self.assertEqual(body["model"], "test-model")
            self.assertEqual(body["response_format"], {"type": "json_object"})
            self.assertTrue(request.headers["authorization"].startswith("Bearer "))
            return httpx.Response(
                200,
                json={
                    "choices": [
                        {
                            "message": {
                                "content": json.dumps(
                                    {
                                        "text": "Describe a resilient deployment.",
                                        "context": None,
                                        "hints": ["Mention rollback."],
                                        "evaluation_criteria": ["Covers failure recovery"],
                                    }
                                )
                            }
                        }
                    ]
                },
            )

        provider = OpenAIQuestionGenerator(
            api_key="test-secret",
            model="test-model",
            transport=httpx.MockTransport(handler),
        )
        result = await provider.generate_question(self.session())
        self.assertEqual(result.text, "Describe a resilient deployment.")
        self.assertEqual(result.evaluation_criteria, ["Covers failure recovery"])

    async def test_maps_rate_limit_timeout_and_malformed_output(self):
        async def assert_error(response_or_exception, code, status):
            def handler(request: httpx.Request) -> httpx.Response:
                if isinstance(response_or_exception, Exception):
                    raise response_or_exception
                return response_or_exception

            provider = OpenAIQuestionGenerator(
                api_key="test-secret",
                model="test-model",
                timeout=0.1,
                transport=httpx.MockTransport(handler),
            )
            with self.assertRaises(APIError) as caught:
                await provider.generate_question(self.session())
            self.assertEqual(caught.exception.code, code)
            self.assertEqual(caught.exception.status_code, status)

        await assert_error(httpx.Response(429), "provider_rate_limited", 429)
        await assert_error(httpx.ReadTimeout("timed out"), "provider_timeout", 504)
        await assert_error(
            httpx.Response(200, json={"choices": []}),
            "provider_invalid_response",
            502,
        )


class AzureOpenAIProviderTests(unittest.IsolatedAsyncioTestCase):
    @staticmethod
    def session() -> SessionConfigWithDetails:
        return SessionConfigWithDetails.model_validate(session_payload())

    def test_normalizes_supported_endpoint_shapes(self):
        self.assertEqual(
            azure_openai_chat_completions_url("https://resource.openai.azure.com"),
            "https://resource.openai.azure.com/openai/v1/chat/completions",
        )
        self.assertEqual(
            azure_openai_chat_completions_url("https://foundry.example/openai/v1/"),
            "https://foundry.example/openai/v1/chat/completions",
        )

    async def test_uses_azure_api_key_and_deployment(self):
        def handler(request: httpx.Request) -> httpx.Response:
            body = json.loads(request.content)
            self.assertEqual(
                str(request.url),
                "https://resource.openai.azure.com/openai/v1/chat/completions",
            )
            self.assertEqual(body["model"], "foundry-deployment")
            self.assertEqual(request.headers["api-key"], "azure-secret")
            self.assertNotIn("authorization", request.headers)
            return httpx.Response(
                200,
                json={
                    "choices": [
                        {
                            "message": {
                                "content": json.dumps(
                                    {
                                        "text": "Describe a resilient deployment.",
                                        "context": None,
                                        "hints": ["Mention rollback."],
                                        "evaluation_criteria": ["Covers failure recovery"],
                                    }
                                )
                            }
                        }
                    ]
                },
            )

        provider = AzureOpenAIQuestionGenerator(
            api_key="azure-secret",
            endpoint="https://resource.openai.azure.com",
            deployment="foundry-deployment",
            transport=httpx.MockTransport(handler),
        )
        result = await provider.generate_question(self.session())
        self.assertEqual(result.text, "Describe a resilient deployment.")


class ProviderFactoryTests(unittest.IsolatedAsyncioTestCase):
    async def test_giani_fails_closed_without_inventing_an_endpoint(self):
        original_provider = settings.AI_PROVIDER
        try:
            settings.AI_PROVIDER = "giani"
            with self.assertRaises(APIError) as caught:
                await build_question_generator().generate_question(
                    SessionConfigWithDetails.model_validate(session_payload())
                )
            self.assertEqual(caught.exception.code, "giani_api_not_configured")
        finally:
            settings.AI_PROVIDER = original_provider

    async def test_builds_azure_openai_provider_from_foundry_settings(self):
        original = {
            "AI_PROVIDER": settings.AI_PROVIDER,
            "AZURE_OPENAI_ENDPOINT": settings.AZURE_OPENAI_ENDPOINT,
            "AZURE_OPENAI_API_KEY": settings.AZURE_OPENAI_API_KEY,
            "AZURE_OPENAI_DEPLOYMENT": settings.AZURE_OPENAI_DEPLOYMENT,
        }
        try:
            settings.AI_PROVIDER = "azure_openai"
            settings.AZURE_OPENAI_ENDPOINT = "https://resource.openai.azure.com"
            settings.AZURE_OPENAI_API_KEY = "azure-secret"
            settings.AZURE_OPENAI_DEPLOYMENT = "foundry-deployment"
            provider = build_question_generator()
            self.assertIsInstance(provider, AzureOpenAIQuestionGenerator)
            self.assertIsInstance(get_session_evaluator(), AzureOpenAISessionEvaluator)
        finally:
            for name, value in original.items():
                setattr(settings, name, value)


class SessionPersistenceTests(unittest.IsolatedAsyncioTestCase):
    async def test_generated_question_uses_atomic_rpc_without_provider_ids(self):
        class FakeDatabase:
            def __init__(self):
                self.request_args = None

            async def request(self, method, path, *, params=None, json=None):
                self.request_args = (method, path, params, json)
                payload = session_payload()
                payload["questions"] = [question_payload(payload["id"], 0, "First")]
                return payload

        database = FakeDatabase()
        generated = GeneratedQuestion(
            text="Next question",
            evaluation_criteria=["Reasoning"],
        )
        result = await SessionService(database, str(uuid4())).persist_generated_question(
            uuid4(), 0, generated
        )
        self.assertEqual(database.request_args[1], "/rest/v1/rpc/persist_generated_question")
        body = database.request_args[3]
        self.assertEqual(body["p_order_index"], 0)
        self.assertNotIn("id", body["p_question"])
        self.assertNotIn("session_id", body["p_question"])
        self.assertEqual(result.questions[0].order_index, 0)


class GenerationEndpointTests(unittest.TestCase):
    def setUp(self):
        self.session_id = uuid4()
        self.session = SessionConfigWithDetails.model_validate(
            session_payload(session_id=self.session_id)
        )
        self.service = self.FakeService(self.session)
        self.provider = self.FakeProvider()
        app.dependency_overrides[get_session_service] = lambda: self.service
        app.dependency_overrides[get_question_generator] = lambda: self.provider
        self.client = TestClient(app)

    def tearDown(self):
        app.dependency_overrides.clear()

    class FakeProvider:
        def __init__(self):
            self.calls = 0

        async def generate_question(self, session):
            self.calls += 1
            return GeneratedQuestion(text="Generated question", evaluation_criteria=["Reasoning"])

    class FakeService:
        def __init__(self, session):
            self.session = session
            self.persisted = None

        async def get_session(self, session_id):
            return self.session

        async def persist_generated_question(self, session_id, order_index, question):
            self.persisted = (session_id, order_index, question)
            return self.session

        async def start_session(self, session_id):
            return self.session

    def test_empty_session_calls_provider_and_persistence(self):
        response = self.client.post(f"/api/v1/sessions/{self.session_id}/questions/generate")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.provider.calls, 1)
        self.assertEqual(self.service.persisted[1], 0)

    def test_complete_session_does_not_call_provider(self):
        questions = [
            question_payload(str(self.session_id), index, f"Question {index}")
            for index in range(3)
        ]
        self.service.session = SessionConfigWithDetails.model_validate(
            session_payload(session_id=self.session_id, questions=questions)
        )
        response = self.client.post(f"/api/v1/sessions/{self.session_id}/questions/generate")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.provider.calls, 0)
        self.assertIsNone(self.service.persisted)

    def test_provider_failure_is_returned_without_persistence(self):
        class FailingProvider:
            async def generate_question(self, session):
                raise APIError(504, "provider_timeout", "The AI provider timed out")

        self.provider = FailingProvider()
        app.dependency_overrides[get_question_generator] = lambda: self.provider
        response = self.client.post(f"/api/v1/sessions/{self.session_id}/questions/generate")
        self.assertEqual(response.status_code, 504)
        self.assertEqual(response.json()["code"], "provider_timeout")
        self.assertIsNone(self.service.persisted)


if __name__ == "__main__":
    unittest.main()
