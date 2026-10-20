import logging
import uuid
from contextlib import asynccontextmanager

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


def _request_id(request: Request) -> str:
    existing = request.headers.get("x-request-id")
    return existing[:100] if existing else str(uuid.uuid4())


@app.exception_handler(APIError)
async def api_error_handler(request: Request, exc: APIError) -> JSONResponse:
    request_id = _request_id(request)
    body = {"detail": exc.detail, "code": exc.code, "request_id": request_id}
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
    logger.exception("Unhandled API error")
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
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {
        "message": "Welcome to SpeakReady AI API",
        "version": "0.1.0",
        "status": "healthy",
    }


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "speakready-ai-backend"}
