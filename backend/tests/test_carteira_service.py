from decimal import Decimal

import pytest

from app.models.fundo import Fundo
from app.models.usuario import Usuario
from app.services.carteira_service import (
    TickerNaoEncontrado,
    registrar_aporte,
    resumo_carteira,
)


def _usuario_e_fundos(db):
    u = Usuario(email="a@b.com", senha_hash="h")
    fii = Fundo(ticker="HGLG11", classe="FII")
    fiagro = Fundo(ticker="SPAF11", classe="FIAGRO")
    db.add_all([u, fii, fiagro])
    db.commit()
    return u


def test_primeiro_aporte_cria_posicao(db_session):
    u = _usuario_e_fundos(db_session)
    p = registrar_aporte(db_session, u.id, "HGLG11", 10, Decimal("100.00"))
    assert p.quantidade == 10
    assert p.preco_medio == Decimal("100.00")
    assert p.valor_investido == Decimal("1000.00")


def test_segundo_aporte_recalcula_media_ponderada(db_session):
    u = _usuario_e_fundos(db_session)
    registrar_aporte(db_session, u.id, "HGLG11", 10, Decimal("100.00"))
    p = registrar_aporte(db_session, u.id, "HGLG11", 10, Decimal("120.00"))
    assert p.quantidade == 20
    assert p.preco_medio == Decimal("110.00")
    assert p.valor_investido == Decimal("2200.00")


def test_media_ponderada_quantidades_diferentes(db_session):
    u = _usuario_e_fundos(db_session)
    registrar_aporte(db_session, u.id, "HGLG11", 10, Decimal("100.00"))
    p = registrar_aporte(db_session, u.id, "HGLG11", 5, Decimal("130.00"))
    assert p.quantidade == 15
    assert p.preco_medio == Decimal("110.00")


def test_ticker_fora_do_catalogo(db_session):
    u = _usuario_e_fundos(db_session)
    with pytest.raises(TickerNaoEncontrado):
        registrar_aporte(db_session, u.id, "ZZZZ99", 1, Decimal("1.00"))


def test_resumo_total_e_por_classe(db_session):
    u = _usuario_e_fundos(db_session)
    registrar_aporte(db_session, u.id, "HGLG11", 10, Decimal("100.00"))  # FII 1000
    registrar_aporte(db_session, u.id, "SPAF11", 5, Decimal("200.00"))  # FIAGRO 1000
    r = resumo_carteira(db_session, u.id)
    assert r["total_investido"] == Decimal("2000.00")
    assert r["por_classe"]["FII"] == Decimal("1000.00")
    assert r["por_classe"]["FIAGRO"] == Decimal("1000.00")
    assert r["num_posicoes"] == 2


def test_resumo_carteira_vazia(db_session):
    u = _usuario_e_fundos(db_session)
    r = resumo_carteira(db_session, u.id)
    assert r["total_investido"] == Decimal("0.00")
    assert r["num_posicoes"] == 0
