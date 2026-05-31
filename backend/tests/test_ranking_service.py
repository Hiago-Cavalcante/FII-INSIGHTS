from datetime import date

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app import models  # noqa: F401
from app.database import Base
from app.models.fundo import Fundo
from app.models.indicador import Indicador
from app.services.ranking_service import RankingItem, montar_ranking
from app.services.scoring_service import PESOS_DEFAULT, PESOS_POR_PERFIL


def _session() -> Session:
    engine = create_engine(
        "sqlite:///:memory:", connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)()


def _semear(db: Session) -> None:
    # Valores em unidades CRUAS, como o coletor grava.
    fundos = [
        ("AAAA11", "Fundo A", "Logística", 0.10, 0.10, 0.92, 18_000_000.0, 0.085, 5_000_000_000.0, 300_000),
        ("BBBB11", "Fundo B", "Recebíveis", 0.13, 0.12, 0.83, 2_000_000.0, 0.13, 1_000_000_000.0, 80_000),
        ("CCCC11", "Fundo C", "Shopping", 0.07, 0.07, 1.05, 600_000.0, 0.16, 800_000_000.0, 120_000),
    ]
    for tk, nome, seg, dy, dy12, pvp, liq, vol, pl, cot in fundos:
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


def test_montar_ranking_retorna_um_item_por_fundo_ordenado_por_score():
    db = _session()
    _semear(db)
    itens = montar_ranking(db, PESOS_DEFAULT)
    assert len(itens) == 3
    assert all(isinstance(i, RankingItem) for i in itens)
    scores = [i.score for i in itens]
    assert scores == sorted(scores, reverse=True)


def test_montar_ranking_converte_para_unidades_de_display():
    db = _session()
    _semear(db)
    item = next(i for i in montar_ranking(db, PESOS_DEFAULT) if i.ticker == "AAAA11")
    assert item.dy_atual == 10.0            # 0.10 * 100
    assert item.volatilidade_12m == 8.5     # 0.085 * 100
    assert item.liquidez_diaria == 18.0     # 18_000_000 / 1e6
    assert item.patrimonio_liquido == 5.0   # 5e9 / 1e9
    assert item.num_cotistas == 300.0       # 300_000 / 1000
    assert item.p_vp == 0.92                # sem conversão


def test_montar_ranking_nao_persiste_scoring():
    db = _session()
    _semear(db)
    montar_ranking(db, PESOS_DEFAULT)
    from app.models.scoring import ScoringHistorico
    assert db.query(ScoringHistorico).count() == 0


def test_montar_ranking_aceita_pesos_de_preset():
    db = _session()
    _semear(db)
    itens = montar_ranking(db, PESOS_POR_PERFIL["conservador"])
    assert len(itens) == 3
    assert all(0 <= i.score <= 100 for i in itens)
