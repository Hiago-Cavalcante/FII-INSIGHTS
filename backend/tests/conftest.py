from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app import models  # noqa: F401 — registra todos os models no Base
from app.database import Base
from app.main import app


@pytest.fixture
def client() -> TestClient:
    """Retorna TestClient do FastAPI para testes de integração."""
    return TestClient(app)


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    """Banco SQLite em memória isolado por teste."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(engine)
    SessionTest = sessionmaker(bind=engine)
    session = SessionTest()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(engine)
