from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://intellirity:intellirity_secret@localhost:5432/intellirity_db"
    SECRET_KEY: str = "dev-secret-key"
    CLERK_SECRET_KEY: str = ""
    CLERK_PUBLISHABLE_KEY: str = ""
    ENVIRONMENT: str = "development"
    API_V1_PREFIX: str = "/api/v1"
    OPENCODEZEN_API_KEY: str = ""
    # Production CORS: comma-separated allowed origins. Default is the
    # localhost set for dev. On deploy, set this to your real domains ONLY
    # (frontend URL + custom domain) — never "*" and never localhost.
    ALLOWED_ORIGINS: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
