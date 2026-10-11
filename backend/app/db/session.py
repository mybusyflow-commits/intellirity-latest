from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from app.core.config import settings

def _connect_args() -> dict:
    args: dict = {
        # Fail fast when Postgres is absent (local dev runs memory-first).
        "timeout": 5,
    }
    try:
        from urllib.parse import urlparse

        host = (urlparse(settings.DATABASE_URL).hostname or "").lower()
        # Managed Postgres (Neon et al.) mandates TLS; localhost dev does not.
        if host and host not in ("localhost", "127.0.0.1"):
            args["ssl"] = True
    except Exception:
        pass
    return args


engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.ENVIRONMENT == "development",
    connect_args=_connect_args(),
    # Neon pooler closes idle connections; pre-ping recycles the dead ones
    # transparently instead of failing writes with "connection is closed".
    pool_pre_ping=True,
)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db() -> AsyncSession:
    async with async_session() as session:
        yield session
