"""Supabase Auth bearer tokens.

The API does not issue its own passwords or JWTs. A request is authenticated
only when Supabase Auth accepts the caller's access token.
"""

import logging
from dataclasses import dataclass
from typing import Optional

import httpx
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import settings
from app.core.errors import APIError

logger = logging.getLogger(__name__)

bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class AuthenticatedUser:
    user_id: str
    access_token: str
    email: Optional[str] = None


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> AuthenticatedUser:
    """Validate the Supabase access token and return the Auth user id."""
    if credentials is None or credentials.scheme.lower() != "bearer" or not credentials.credentials:
        raise APIError(401, "authentication_required", "Please sign in again to continue.")

    if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
        raise APIError(503, "auth_not_configured", "Sign-in is not configured.")

    token = credentials.credentials
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/user",
                headers={
                    "apikey": settings.SUPABASE_ANON_KEY,
                    "Authorization": f"Bearer {token}",
                },
            )
    except httpx.HTTPError:
        logger.exception("Supabase auth request failed")
        raise APIError(503, "auth_unavailable", "Sign-in service is unavailable.")

    if response.status_code != 200:
        raise APIError(401, "authentication_required", "Please sign in again to continue.")

    try:
        payload = response.json()
    except ValueError:
        raise APIError(502, "invalid_auth_response", "Sign-in service returned invalid data.")

    user_id = payload.get("id") if isinstance(payload, dict) else None
    if not isinstance(user_id, str) or not user_id:
        raise APIError(401, "authentication_required", "Please sign in again to continue.")

    email = payload.get("email") if isinstance(payload, dict) else None
    return AuthenticatedUser(
        user_id=user_id,
        access_token=token,
        email=email if isinstance(email, str) else None,
    )
