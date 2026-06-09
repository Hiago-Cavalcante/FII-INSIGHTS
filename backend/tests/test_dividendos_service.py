from datetime import date, timedelta
from decimal import Decimal

from app.models.fundo import Fundo
from app.models.posicao import Posicao
from app.models.provento import Provento
from app.services.dividendos_service import calcular_dividendos

HOJE = date(2026, 6, 1)


def _fundo(db, ticker: str, classe: str = "FII") -> int:
    f = Fundo(ticker=ticker, nome=ticker, classe=classe)
    db.add(f)
    db.flush()
    return f.id


def test_renda_mensal_media_12m_so_rendimento(db_session):
    fid = _fundo(db_session, "HGLG11")
    db_session.add(Posicao(usuario_id=1, fundo_id=fid, quantidade=10,
                           preco_medio=Decimal("100.00"), valor_investido=Decimal("1000.00")))
    # dois rendimentos na janela: média (1.0 + 1.2)/2 = 1.1 → ×10 = 11.00
    db_session.add(Provento(fundo_id=fid, data_com=HOJE - timedelta(days=40), tipo="rendimento",
                            data_pagamento=HOJE - timedelta(days=30), valor_por_cota=Decimal("1.0")))
    db_session.add(Provento(fundo_id=fid, data_com=HOJE - timedelta(days=10), tipo="rendimento",
                            data_pagamento=HOJE - timedelta(days=5), valor_por_cota=Decimal("1.2")))
    # amortização é ignorada
    db_session.add(Provento(fundo_id=fid, data_com=HOJE - timedelta(days=12), tipo="amortizacao",
                            data_pagamento=HOJE - timedelta(days=6), valor_por_cota=Decimal("5.0")))
    # rendimento antigo (fora dos 12m) é ignorado
    db_session.add(Provento(fundo_id=fid, data_com=HOJE - timedelta(days=500), tipo="rendimento",
                            data_pagamento=HOJE - timedelta(days=490), valor_por_cota=Decimal("9.9")))
    db_session.commit()

    r = calcular_dividendos(db_session, usuario_id=1, hoje=HOJE)
    assert r["renda_mensal"] == Decimal("11.00")
    assert r["renda_anual"] == Decimal("132.00")
    assert r["yield_on_cost"] == 0.132  # 132 / 1000
    assert r["por_fundo"][0]["ticker"] == "HGLG11"
    assert r["por_fundo"][0]["sem_dados"] is False
    assert r["por_fundo"][0]["percentual"] == 1.0


def test_fundo_sem_proventos_marca_sem_dados(db_session):
    fid = _fundo(db_session, "XPML11")
    db_session.add(Posicao(usuario_id=1, fundo_id=fid, quantidade=5,
                           preco_medio=Decimal("100.00"), valor_investido=Decimal("500.00")))
    db_session.commit()
    r = calcular_dividendos(db_session, usuario_id=1, hoje=HOJE)
    assert r["renda_mensal"] == Decimal("0.00")
    assert r["por_fundo"][0]["sem_dados"] is True


def test_carteira_vazia(db_session):
    r = calcular_dividendos(db_session, usuario_id=999, hoje=HOJE)
    assert r["renda_mensal"] == Decimal("0.00")
    assert r["renda_anual"] == Decimal("0.00")
    assert r["yield_on_cost"] is None
    assert r["por_fundo"] == []
