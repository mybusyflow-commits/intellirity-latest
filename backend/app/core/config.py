from pydantic_settings import BaseSettings

# Environment loading.
#
# pydantic-settings reads `.env` into the Settings object, but it does not
# put those values into os.environ. Any module that reads a variable with
# os.getenv (Turnstile, the rate limiter, structured logging, mail) would
# therefore ignore `.env` locally while working on a host that injects real
# environment variables -- a difference that only shows up at the worst
# time. Loading the file first makes one behaviour for both.
#
# override=False is deliberate: a real environment variable always wins, so
# a deployment's configuration can never be shadowed by a stray .env in the
# bundle.
try:
    from dotenv import load_dotenv as _load_dotenv

    _load_dotenv(override=False)
except Exception:  # pragma: no cover - python-dotenv is a hard dependency
    pass


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
    # Razorpay payments. When KEY_ID and KEY_SECRET are set, checkout creates
    # a live Razorpay order and the webhook confirms capture. When unset,
    # checkout stays in dev mode (pending-payment + simulated activation).
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    RAZORPAY_WEBHOOK_SECRET: str = ""
    # Outbound mail for the public contact form. Either transport works;
    # Resend is a single HTTPS call, SMTP covers a company mail relay.
    # Without one, submissions are still persisted, just not announced.
    CONTACT_INBOX: str = "security@intellirity.ai"
    EMAIL_FROM: str = "Intellirity <noreply@intellirity.ai>"
    RESEND_API_KEY: str = ""
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_STARTTLS: bool = True
    # Cloudflare Turnstile secret for the public contact form. Required in
    # production: the form refuses submissions rather than accepting them
    # without a spam check.
    TURNSTILE_SECRET: str = ""
    # Display timezone for human-facing timestamps (reports, mail). All
    # stored timestamps are UTC; this only affects presentation.
    TIMEZONE: str = "Asia/Kolkata"

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
    elif "@localhost" in settings.DATABASE_URL or "@127.0.0.1" in settings.DATABASE_URL:
        problems.append(
            "DATABASE_URL points at localhost in production: the deployment "
            "would run memory-only and lose the ledger on every restart"
        )
    return problems


def production_warnings() -> list[str]:
    """Configuration that is not fatal but will hurt on the first real day.

    Returned separately from the fatal checks so a deployment can boot and
    still be told what is missing, instead of finding out because nobody
    answered a lead.
    """
    if settings.ENVIRONMENT != "production":
        return []
    warnings: list[str] = []
    if not (settings.RESEND_API_KEY or settings.SMTP_HOST):
        warnings.append(
            "no mail transport: contact submissions are stored but never "
            "announced (set RESEND_API_KEY or SMTP_HOST)"
        )
    if not settings.TURNSTILE_SECRET:
        warnings.append("TURNSTILE_SECRET is not set: the contact form rejects every submission")
    if not settings.ALLOWED_ORIGINS:
        warnings.append("ALLOWED_ORIGINS is not set: CORS falls back to localhost origins")
    return warnings
