# backend/core/config.py

import secrets
from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    # Supabase
    SUPABASE_URL: str
    # SUPABASE_SERVICE_ROLE is the preferred key (bypasses RLS when it's actually the service_role JWT).
    # SUPABASE_ANON_KEY is kept as a fallback for local dev where service_role may not be set.
    SUPABASE_SERVICE_ROLE: Optional[str] = None
    SUPABASE_ANON_KEY: Optional[str] = None
    SUPABASE_KEY: Optional[str] = None  # resolved below from SERVICE_ROLE or ANON_KEY
    SUPABASE_STORAGE_BUCKET: str = "reports"

    # App
    ENVIRONMENT: str = "development"
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"
    LOG_LEVEL: str = "INFO"

    # Auth (API key gating — separate from JWT user auth)
    API_AUTH_ENABLED: bool = False
    API_KEY: Optional[str] = None

    # JWT User Authentication
    JWT_SECRET: str = Field(default_factory=lambda: secrets.token_hex(32))
    JWT_EXPIRE_MINUTES: int = 30

    # Limits
    MAX_UPLOAD_SIZE_MB: int = 10
    RATE_LIMIT_UPLOAD: str = "20/minute"
    RATE_LIMIT_CHECK: str = "30/minute"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True
    )

    @model_validator(mode="after")
    def resolve_supabase_key(self) -> "Settings":
        """
        Resolve SUPABASE_KEY from SERVICE_ROLE or ANON_KEY in priority order.
        This handles the alias approach more robustly than a Field alias.
        """
        if self.SUPABASE_KEY:
            return self  # already set explicitly
        if self.SUPABASE_SERVICE_ROLE:
            self.SUPABASE_KEY = self.SUPABASE_SERVICE_ROLE
        elif self.SUPABASE_ANON_KEY:
            self.SUPABASE_KEY = self.SUPABASE_ANON_KEY
        else:
            raise ValueError(
                "Must set either SUPABASE_SERVICE_ROLE or SUPABASE_ANON_KEY in .env"
            )
        return self

settings = Settings()
