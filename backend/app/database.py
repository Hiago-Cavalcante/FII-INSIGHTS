from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings


def normalize_database_url(url: str) -> str:
    """Garante o driver psycopg em URLs Postgres (Neon entrega 'postgresql://')."""
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


def connect_args_for(url: str) -> dict[str, object]:
    """check_same_thread é exclusivo do SQLite; Postgres não aceita esse arg."""
    if url.startswith("sqlite"):
        return {"check_same_thread": False}
    return {}


_db_url = normalize_database_url(settings.database_url)
engine = create_engine(_db_url, connect_args=connect_args_for(_db_url))

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    """Dependency para injetar sessão de banco nos endpoints."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
