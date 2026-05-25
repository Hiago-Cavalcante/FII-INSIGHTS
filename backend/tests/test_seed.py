from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app import models  # noqa: F401
from app.database import Base
from app.repositories.fundo_repository import FundoRepository
from scripts.seed_fundos import FUNDOS_SEED, seed


def test_seed_cria_50_fundos():
    engine = create_engine(
        "sqlite:///:memory:", connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)

    seed(session_factory=Session)

    with Session() as db:
        repo = FundoRepository(db)
        todos = repo.listar_todos()

    assert len(todos) == 50


def test_seed_idempotente():
    engine = create_engine(
        "sqlite:///:memory:", connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)

    seed(session_factory=Session)
    seed(session_factory=Session)  # segunda vez não deve duplicar

    with Session() as db:
        repo = FundoRepository(db)
        todos = repo.listar_todos()

    assert len(todos) == 50


def test_seed_tem_campos_obrigatorios():
    assert len(FUNDOS_SEED) == 50
    for item in FUNDOS_SEED:
        assert "ticker" in item
        assert "segmento" in item
        assert len(item["ticker"]) <= 10
