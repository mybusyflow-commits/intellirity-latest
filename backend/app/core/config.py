from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://intellirity:intellirity_secret@localhost:5432/intellirity_db"

    from pydantic import field_validator

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def _normalize_url(cls, v):
        # Neon dashboards hand out plain postgresql:// URLs with libpq-style
        # query params. Our engine is async: force the asyncpg dialect (or
        # SQLAlchemy falls back to the uninstalled psycopg2 driver and boot
        # crashes) and strip params asyncpg.connect() does not accept
        # (sslmode/channel_binding are translated to connect_args instead).
        if not isinstance(v, str):
            return v
        if v.startswith("postgresql://"):
            v = v.replace("postgresql://", "postgresql+asyncpg://", 1)
        try:
            from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode

            parts = urlsplit(v)
            q = [(k, val) for k, val in parse_qsl(parts.query) if k not in ("sslmode", "channel_binding")]
            v = urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(q), parts.fragment))
        except Exception:
            pass
        return v
    SECRET_KEY: str = "dev-secret-key"
    # Dedicated key for signing proof-of-intent certificates. When empty the
    # app falls back to SECRET_KEY — set a real one in production.
    VPI_SIGNING_KEY: str = ""
    CLERK_SECRET_KEY: str = ""
    CLERK_PUBLISHABLE_KEY: str = ""
    ENVIRONMENT: str = "development"
    API_V1_PREFIX: str = "/api/v1"
    OPENCODEZEN_API_KEY: str = ""
    # Production CORS: comma-separated allowed origins. Default is the
    # localhost set for dev. On deploy, set this to your real domains ONLY
    # (frontend URL + custom domain) — never "*" and never localhost.
    ALLOWED_ORIGINS: str = ""
    # Machine API keys for the SDKs and MCP server. Comma separated.
    # Store SHA-256 hashes in production (INTELLIRITY_API_KEY_HASHES).
    INTELLIRITY_API_KEYS: str = ""
    INTELLIRITY_API_KEY_HASHES: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()


def validate_production_secrets() -> list[str]:
    """Return the list of insecure defaults in a production deployment.

    Called at boot so a misconfigured production deploy fails loudly
    instead of running with a publicly-known signing key.
    """
    problems: list[str] = []
    if settings.ENVIRONMENT != "production":
        return problems
    if not settings.CLERK_SECRET_KEY and not settings.INTELLIRITY_API_KEY_HASHES \
            and not settings.INTELLIRITY_API_KEYS:
        problems.append(
            "no authentication configured: set CLERK_SECRET_KEY (users) "
            "and/or INTELLIRITY_API_KEY_HASHES (machines)"
        )
    if settings.SECRET_KEY == "dev-secret-key":
        problems.append("SECRET_KEY is still the default dev value")
    if not settings.VPI_SIGNING_KEY:
        problems.append("VPI_SIGNING_KEY is not set (proof-of-intent keys fall back to SECRET_KEY)")
    if not settings.DATABASE_URL:
        problems.append("DATABASE_URL is not set (running memory-only)")
    return problems
