from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    # Application Settings
    APP_NAME: str = "SpeakReady AI"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True
    
    # API Settings
    API_V1_PREFIX: str = "/api/v1"
    
    # CORS Settings
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
    ]
    
    # Database Settings (Supabase PostgreSQL)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    
    # AI Provider Settings (Configurable - can switch between providers)
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "openai")  # openai, giani, anthropic, etc.
    
    # OpenAI Settings
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")
    
    # Giani AI Settings (to be configured once API is verified)
    GIANI_API_KEY: str = os.getenv("GIANI_API_KEY", "")
    GIANI_API_URL: str = os.getenv("GIANI_API_URL", "")
    GIANI_MODEL: str = os.getenv("GIANI_MODEL", "")
    
    # Speech-to-Text Settings
    STT_PROVIDER: str = os.getenv("STT_PROVIDER", "openai")  # openai, google, azure
    
    # Security Settings
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-this-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
