from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Application Settings
    APP_NAME: str = "SpeakReady AI"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"
    
    # API Settings
    API_V1_PREFIX: str = "/api/v1"
    
    # CORS Settings
    # A comma-separated value keeps .env and container configuration simple.
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:3001"
    
    # Database Settings (Supabase PostgreSQL)
    DATABASE_URL: str = ""
    SUPABASE_URL: str = ""
    # Service-role key is backend-only and is retained only for legacy routes.
    SUPABASE_KEY: str = ""
    # The anon key is safe to use with a user's bearer token for PostgREST/Auth.
    SUPABASE_ANON_KEY: str = ""
    
    # AI Provider Settings. ``mock`` is deterministic and keeps local/offline
    # development usable. ``openai`` uses its official documented API when a
    # backend-only key is configured. Giani is intentionally not enabled: no
    # official public generation API could be verified.
    AI_PROVIDER: str = "mock"  # mock, openai, giani
    AI_REQUEST_TIMEOUT_SECONDS: float = Field(default=20.0, gt=0, le=120)
    EVALUATION_WEIGHTS_JSON: str = (
        '{"grammar":0.15,"vocabulary":0.10,"clarity":0.15,"coherence":0.15,'
        '"relevance":0.15,"interview_technique":0.15,"technical_correctness":0.15,'
        '"spoken_fluency":0.10}'
    )
    
    # OpenAI Settings
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-3.5-turbo"
    
    # Giani AI settings are retained as placeholders only. Do not populate or
    # use them until Giani supplies an official developer API specification.
    GIANI_API_KEY: str = ""
    GIANI_API_URL: str = ""
    GIANI_MODEL: str = ""
    
    # Speech-to-Text Settings
    STT_PROVIDER: str = "openai"  # openai, google, azure
    
    # Audio recording limits
    MAX_AUDIO_URL_LENGTH: int = 1000
    AUDIO_RETENTION_DAYS: int = 30  # Default retention period for transcribed audio
    
    # Transcription language configuration
    STT_LANGUAGE_MAP: dict = {
        "en-US": "en-US",
        "hi-IN": "hi-IN",
        "ta-IN": "ta-IN",
        "te-IN": "te-IN",
        "bn-IN": "bn-IN",
        "kn-IN": "kn-IN",
    }
    
    # Security Settings
    SECRET_KEY: str = Field(default="change-this-in-production", repr=False)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    @property
    def allowed_origins(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]


settings = Settings()
