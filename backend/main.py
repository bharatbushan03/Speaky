import logging
import time
import uuid
from contextlib import asynccontextmanager
from collections import defaultdict, deque

from fastapi import FastAPI, HTTPException, Request
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.api.routes import api_router
from app.core.errors import APIError
from app.core.config import settings
from app.db.database import init_db

logging.basicConfig(level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO))
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting SpeakReady AI Backend")
    if settings.is_production:
        if settings.DEBUG or settings.SECRET_KEY == "change-this-in-production":
            raise RuntimeError("Production requires DEBUG=False and a non-default SECRET_KEY")
        if not settings.allowed_origins or any(not origin.startswith("https://") for origin in settings.allowed_origins):
            raise RuntimeError("Production ALLOWED_ORIGINS must contain only HTTPS origins")
        if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
            raise RuntimeError("Production requires SUPABASE_URL and SUPABASE_ANON_KEY")
    await init_db()
    yield
    # Shutdown
    logger.info("Shutting down SpeakReady AI Backend")


app = FastAPI(
    title="SpeakReady AI API",
    description="AI-powered English communication coaching platform API",
    version="0.1.0",
    lifespan=lifespan,
)

_rate_limit_events: dict[str, deque[float]] = defaultdict(deque)


@app.middleware("http")
async def request_safety_middleware(request: Request, call_next):
    """Apply bounded request sizes and a small per-client abuse guard.

    This in-process limiter protects a single worker from accidental bursts.
    Production deployments should also configure an edge/WAF rate limit because
    multiple workers or replicas do not share this memory.
    """
    request.state.request_id = request.headers.get("x-request-id", str(uuid.uuid4()))[:100]
    content_length = request.headers.get("content-length")
    if content_length:
        try:
            if int(content_length) > settings.MAX_REQUEST_BODY_BYTES:
                return JSONResponse(
                    status_code=413,
                    content={"detail": "Request body is too large", "code": "request_too_large", "request_id": _request_id(request)},
                )
        except ValueError:
            return JSONResponse(
                status_code=400,
                content={"detail": "Invalid Content-Length header", "code": "invalid_request", "request_id": _request_id(request)},
            )

    now = time.monotonic()
    key = request.client.host if request.client else "unknown"
    events = _rate_limit_events[key]
    while events and now - events[0] >= settings.RATE_LIMIT_WINDOW_SECONDS:
        events.popleft()
    if len(events) >= settings.RATE_LIMIT_REQUESTS:
        return JSONResponse(
            status_code=429,
            headers={"Retry-After": str(settings.RATE_LIMIT_WINDOW_SECONDS)},
            content={"detail": "Too many requests", "code": "rate_limited", "request_id": _request_id(request)},
        )
    events.append(now)
    response = await call_next(request)
    response.headers["X-Request-ID"] = _request_id(request)
    return response


def _request_id(request: Request) -> str:
    return getattr(request.state, "request_id", request.headers.get("x-request-id", str(uuid.uuid4()))[:100])


@app.exception_handler(APIError)
async def api_error_handler(request: Request, exc: APIError) -> JSONResponse:
    request_id = _request_id(request)
    body: dict[str, object] = {"detail": exc.detail, "code": exc.code, "request_id": request_id}
    if exc.errors is not None:
        body["errors"] = exc.errors
    return JSONResponse(status_code=exc.status_code, content=body)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    # Do not echo ``input`` or Pydantic context: request bodies can contain
    # passwords, bearer-adjacent metadata, or other user-controlled secrets.
    safe_errors = [
        {key: error[key] for key in ("type", "loc", "msg") if key in error}
        for error in exc.errors()
    ]
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Request validation failed",
            "code": "validation_error",
            "errors": jsonable_encoder(safe_errors),
            "request_id": _request_id(request),
        },
    )


@app.exception_handler(HTTPException)
async def http_error_handler(request: Request, exc: HTTPException) -> JSONResponse:
    code_by_status = {
        400: "bad_request",
        401: "authentication_required",
        403: "forbidden",
        404: "not_found",
        409: "conflict",
        500: "internal_error",
    }
    detail = exc.detail if isinstance(exc.detail, str) else "Request failed"
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": detail,
            "code": code_by_status.get(exc.status_code, "request_error"),
            "request_id": _request_id(request),
        },
        headers=exc.headers,
    )


@app.exception_handler(Exception)
async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = _request_id(request)
    logger.exception("Unhandled API error request_id=%s method=%s path=%s", request_id, request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "code": "internal_error",
            "request_id": _request_id(request),
        },
    )

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)

# Include API routes
app.include_router(api_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {
        "message": "Welcome to SpeakReady AI API",
        "version": settings.APP_VERSION,
        "status": "healthy",
    }


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": settings.APP_NAME, "version": settings.APP_VERSION}
