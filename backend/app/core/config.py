from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://intellirity:intellirity_secret@localhost:5432/intellirity_db"
    SECRET_KEY: str = "dev-secret-key"
    CLERK_SECRET_KEY: str = ""
    CLERK_PUBLISHABLE_KEY: str = ""
    ENVIRONMENT: str = "development"
    API_V1_PREFIX: str = "/api/v1"
    OPENCODEZEN_API_KEY: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
