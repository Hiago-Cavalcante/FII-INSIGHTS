from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app import models  # noqa: F401
from app.database import Base
from app.repositories.fundo_repository import FundoRepository
from scripts.seed_fundos import FUNDOS_SEED, seed


def test_seed_cria_todos_os_fundos():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)

    seed(session_factory=Session)

    with Session() as db:
        repo = FundoRepository(db)
        todos = repo.listar_todos()

    assert len(todos) == len(FUNDOS_SEED)


def test_seed_tem_amostra_de_fiagros():
    # RF-14: o seed precisa de uma amostra de FIAGRO além dos FIIs para o scoring por classe.
    fiagros = [f for f in FUNDOS_SEED if f.get("classe") == "FIAGRO"]
    assert len(fiagros) >= 12
    assert "KNCA11" in {f["ticker"] for f in fiagros}


def test_seed_idempotente():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)

    seed(session_factory=Session)
    seed(session_factory=Session)  # segunda vez não deve duplicar

    with Session() as db:
        repo = FundoRepository(db)
        todos = repo.listar_todos()

    assert len(todos) == len(FUNDOS_SEED)


def test_seed_tem_campos_obrigatorios():
    assert len(FUNDOS_SEED) == 62
    for item in FUNDOS_SEED:
        assert "ticker" in item
        assert "segmento" in item
        assert len(item["ticker"]) <= 10
