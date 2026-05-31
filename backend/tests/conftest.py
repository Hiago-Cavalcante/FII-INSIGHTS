from collections.abc import Generator
from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app import models  # noqa: F401 — registra todos os models no Base
from app.database import Base, get_db
from app.main import app
from app.models.fundo import Fundo
from app.models.indicador import Indicador


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


@pytest.fixture
def client_seeded() -> Generator[TestClient, None, None]:
    """TestClient com banco in-memory semeado e get_db sobrescrito."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    SessionTest = sessionmaker(bind=engine)

    seed = [
        ("AAAA11", "Fundo A", "Logística", 0.10, 0.10, 0.92, 18_000_000.0, 0.085, 5_000_000_000.0, 300_000),
        ("BBBB11", "Fundo B", "Recebíveis", 0.13, 0.12, 0.83, 2_000_000.0, 0.13, 1_000_000_000.0, 80_000),
        ("CCCC11", "Fundo C", "Shopping", 0.07, 0.07, 1.05, 600_000.0, 0.16, 800_000_000.0, 120_000),
    ]
    with SessionTest() as db:
        for tk, nome, seg, dy, dy12, pvp, liq, vol, pl, cot in seed:
            f = Fundo(ticker=tk, nome=nome, segmento=seg)
            db.add(f)
            db.flush()
            db.add(
                Indicador(
                    fundo_id=f.id, data_referencia=date(2026, 5, 1),
                    dy_atual=dy, dy_12m=dy12, p_vp=pvp,
                    vacancia_fisica=None, vacancia_financeira=None,
                    liquidez_diaria=liq, volatilidade_12m=vol,
                    patrimonio_liquido=pl, num_cotistas=cot,
                )
            )
        db.commit()

    def _override() -> Generator[Session, None, None]:
        db = SessionTest()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = _override
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()
        Base.metadata.drop_all(engine)
