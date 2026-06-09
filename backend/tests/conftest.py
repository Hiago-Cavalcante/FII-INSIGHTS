from collections.abc import Generator
from datetime import date, timedelta
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app import models  # noqa: F401 — registra todos os models no Base
from app.database import Base, get_db
from app.main import app
from app.models.fundo import Fundo
from app.models.indicador import Indicador
from app.models.provento import Provento


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
                    fundo_id=f.id,
                    data_referencia=date(2026, 5, 1),
                    dy_atual=dy,
                    dy_12m=dy12,
                    p_vp=pvp,
                    vacancia_fisica=None,
                    vacancia_financeira=None,
                    liquidez_diaria=liq,
                    volatilidade_12m=vol,
                    patrimonio_liquido=pl,
                    num_cotistas=cot,
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


@pytest.fixture
def client_db() -> Generator[TestClient, None, None]:
    """TestClient com DB in-memory vazio e get_db sobrescrito (sem seed)."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    SessionTest = sessionmaker(bind=engine)

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


@pytest.fixture
def client_carteira() -> Generator[tuple[TestClient, object], None, None]:
    """TestClient com fundos semeados + factory de usuário autenticado.

    Uso: client, novo_usuario = client_carteira; headers = novo_usuario("a@b.com").
    """
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    SessionTest = sessionmaker(bind=engine)
    with SessionTest() as db:
        db.add_all(
            [
                Fundo(ticker="HGLG11", nome="CSHG Log", classe="FII"),
                Fundo(ticker="SPAF11", nome="Sparta Fiagro", classe="FIAGRO"),
            ]
        )
        db.commit()

    with SessionTest() as db:
        hglg = db.scalar(select(Fundo).where(Fundo.ticker == "HGLG11"))
        hoje = date.today()
        db.add_all([
            Provento(fundo_id=hglg.id, data_com=hoje - timedelta(days=40), tipo="rendimento",
                     data_pagamento=hoje - timedelta(days=30), valor_por_cota=Decimal("1.0")),
            Provento(fundo_id=hglg.id, data_com=hoje - timedelta(days=10), tipo="rendimento",
                     data_pagamento=hoje - timedelta(days=5), valor_por_cota=Decimal("1.2")),
        ])
        db.commit()

    def _override() -> Generator[Session, None, None]:
        db = SessionTest()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = _override
    client = TestClient(app)

    def novo_usuario(email: str = "a@b.com") -> dict[str, str]:
        r = client.post("/api/v1/auth/register", json={"email": email, "senha": "segredo123"})
        return {"Authorization": f"Bearer {r.json()['access_token']}"}

    try:
        yield client, novo_usuario
    finally:
        app.dependency_overrides.clear()
        Base.metadata.drop_all(engine)
