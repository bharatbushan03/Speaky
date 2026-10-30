"""Database clients.

The legacy service-role client remains available for legacy endpoints. New
session endpoints use ``get_user_database`` so every request carries the
signed-in user's Supabase access token and is subject to RLS.
"""

import logging
from typing import Any, Optional

import httpx
from supabase import create_client, Client

from app.core.config import settings
from app.core.errors import APIError

logger = logging.getLogger(__name__)

# Supabase client for database operations
supabase_client: Client = None


def get_supabase_client() -> Client:
    """Get or create Supabase client instance."""
    global supabase_client
    if supabase_client is None:
        if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
            raise APIError(503, "database_not_configured", "Legacy database is not configured")
        supabase_client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_KEY
        )
    return supabase_client


class UserDatabase:
    """PostgREST client that sends the signed-in user's access token.

    The anon key is the API key. The user token is the bearer token, so RLS
    sees auth.uid(). The service-role key is never used here.
    """

    def __init__(self, access_token: str) -> None:
        if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
            raise APIError(503, "database_not_configured", "Database is not configured")
        if not access_token:
            raise APIError(401, "authentication_required", "Please sign in again to continue.")
        self.access_token = access_token

    async def request(
        self,
        method: str,
        path: str,
        *,
        params: Optional[dict[str, Any]] = None,
        json: Optional[dict[str, Any]] = None,
    ) -> Any:
        """Make one user-scoped PostgREST request and normalize failures."""
        headers = {
            "apikey": settings.SUPABASE_ANON_KEY,
            "Authorization": f"Bearer {self.access_token}",
            "Accept": "application/json",
        }
        if json is not None:
            headers["Content-Type"] = "application/json"
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.request(
                    method,
                    f"{settings.SUPABASE_URL.rstrip('/')}{path}",
                    headers=headers,
                    params=params,
                    json=json,
                )
        except httpx.HTTPError:
            logger.exception("Supabase database request failed: %s %s", method, path)
            raise APIError(503, "database_unavailable", "Database service unavailable")

        if response.is_success:
            if not response.content:
                return None
            try:
                return response.json()
            except ValueError:
                raise APIError(502, "invalid_database_response", "Database returned invalid data")

        code, detail = _postgrest_error(response)
        raise APIError(_status_for_database_error(response.status_code, code), code, detail)


def get_user_database(access_token: str) -> UserDatabase:
    """Return a database client that never uses the service-role credential."""
    return UserDatabase(access_token)


def _postgrest_error(response: httpx.Response) -> tuple[str, str]:
    try:
        payload = response.json()
    except ValueError:
        return "database_error", "Database request failed"
    if isinstance(payload, dict):
        message = payload.get("message") or payload.get("details") or payload.get("hint")
        # PostgreSQL's exception message is returned by PostgREST as message.
        if isinstance(message, str):
            known = {
                "session_not_found",
                "question_not_found",
                "invalid_transition",
                "session_incomplete",
                "invalid_input",
                "question_duplicate",
            }
            if message in known:
                return message, _database_detail(message)
        code = payload.get("code")
        if isinstance(code, str) and code:
            return "database_error", "Database request failed"
    return "database_error", "Database request failed"


def _database_detail(code: str) -> str:
    return {
        "session_not_found": "Session not found",
        "question_not_found": "Question does not belong to this session",
        "invalid_transition": "That session state transition is not allowed",
        "session_incomplete": "The session is incomplete",
        "invalid_input": "The session input is invalid",
        "question_duplicate": "The generated question repeats an earlier question",
    }.get(code, "Database request failed")


def _status_for_database_error(status_code: int, code: str) -> int:
    if code in {"session_not_found", "question_not_found"}:
        return 404
    if code in {"invalid_transition", "session_incomplete", "question_duplicate"}:
        return 409
    if code == "invalid_input":
        return 422
    if status_code in {401, 403}:
        return 403
    return 502


async def init_db():
    """Initialize database connection and verify connectivity."""
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        logger.warning("Legacy Supabase service-role database is not configured")
        return
    try:
        client = get_supabase_client()
        # Test connection
        result = client.table("users").select("id").limit(1).execute()
        logger.info("Successfully connected to Supabase")
    except Exception as e:
        logger.warning("Database connection warning: %s", e)
