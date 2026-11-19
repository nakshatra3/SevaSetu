from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """All settings come from environment variables or the Backend/.env file.

    Never put real secrets in this file. Copy .env.example to .env instead.
    """

    APP_NAME: str = "SevaSetu API"
    MONGODB_URI: str = "mongodb://localhost:27017"
    MONGODB_DATABASE: str = "volunteer_platform"

    # Required: there is no default on purpose, so a secret is never hardcoded.
    # Generate one with:  python -c "import secrets; print(secrets.token_hex(32))"
    JWT_SECRET_KEY: str = Field(min_length=32)
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120

    # Comma separated list of frontend addresses allowed to call the API.
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Only used by seed.py to create the first admin and demo accounts.
    ADMIN_EMAIL: str = ""
    ADMIN_PASSWORD: str = ""
    DEMO_PASSWORD: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


settings = Settings()
