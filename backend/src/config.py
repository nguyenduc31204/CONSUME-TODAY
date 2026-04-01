"""
Pydantic Settings — MemoirFinance Backend Configuration
All env vars must be defined here. Loaded from .env or environment.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ────────────────────────────────
    app_env: str = "development"
    app_secret_key: str = "CHANGE_ME_IN_PRODUCTION"
    cors_origins: str = "http://localhost:5173,http://localhost:3000"
    app_base_url: str = "http://localhost:8000"

    # ── Database ────────────────────────────────────
    database_url: str = "postgresql+asyncpg://memoir:memoir@localhost:5432/memoirfinance"
    db_host: str = "localhost"
    db_port: int = 5432
    db_name: str = "memoirfinance"
    db_user: str = "memoir"
    db_password: str = "memoir"

    # ── Auth ────────────────────────────────────────
    google_client_id: str = ""
    google_client_secret: str = ""
    jwt_private_key: str = ""
    jwt_public_key: str = ""
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    # ── Cloudflare R2 / S3 ─────────────────────────
    r2_account_id: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket_name: str = ""
    r2_public_url: str = ""

    # ── AI ─────────────────────────────────────────
    anthropic_api_key: str = ""
    claude_api_url: str = "https://api.anthropic.com"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
