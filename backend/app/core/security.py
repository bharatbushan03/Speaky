"""Authentication helpers.

Session endpoints authenticate with Supabase Auth rather than accepting a
caller-supplied user id.  The backend validates the bearer token by asking
Supabase Auth for the current user; the token is never logged or returned.
"""

import logging
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional

import httpx
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings
from app.core.errors import APIError

logger = logging.getLogger(__name__)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class AuthenticatedUser:
    user_id: str
    access_token: str
    email: Optional[str] = None


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> AuthenticatedUser:
    """Resolve and validate a Supabase Auth bearer token.

    Calling Supabase's `/auth/v1/user` endpoint avoids keeping a JWT signing
    secret in this application and works with Supabase's current JWT settings.
    The anon key is intentionally required here; the service-role key is never
    used for user-scoped authorization.
    """
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise APIError(401, "authentication_required", "Authentication is required")
    if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
        logger.error("Supabase Auth is not configured for authenticated API requests")
        raise APIError(
            503,
            "authentication_not_configured",
            "Authentication is not configured on the server",
        )

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/user",
                headers={
                    "apikey": settings.SUPABASE_ANON_KEY,
                    "Authorization": f"Bearer {credentials.credentials}",
                },
            )
    except httpx.HTTPError:
        logger.exception("Supabase Auth request failed")
        raise APIError(503, "authentication_unavailable", "Authentication service unavailable")

    if response.status_code != 200:
        raise APIError(401, "invalid_token", "Invalid or expired authentication token")

    try:
        payload = response.json()
        user_id = payload["id"]
    except (ValueError, KeyError, TypeError):
        logger.error("Supabase Auth returned an invalid user payload")
        raise APIError(503, "authentication_unavailable", "Authentication service returned invalid data")

    return AuthenticatedUser(
        user_id=str(user_id),
        access_token=credentials.credentials,
        email=payload.get("email"),
    )


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password."""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """Decode and verify a JWT access token."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None
