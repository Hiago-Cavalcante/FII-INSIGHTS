from datetime import date
from datetime import date as date_type
from datetime import datetime as dt
from decimal import Decimal

import pytest
from sqlalchemy.exc import IntegrityError

from app.models.cluster import Cluster, FundoCluster
from app.models.fundo import Fundo
from app.models.indicador import Indicador
from app.models.perfil import PerfilInvestidor
from app.models.provento import Provento
from app.models.scoring import ScoringHistorico


def test_criar_fundo_minimo(db_session):
    fundo = Fundo(ticker="XPLG11")
    db_session.add(fundo)
    db_session.commit()
    db_session.refresh(fundo)

    assert fundo.id is not None
    assert fundo.ticker == "XPLG11"
    assert fundo.nome is None
    assert fundo.created_at is not None


def test_criar_fundo_completo(db_session):
    fundo = Fundo(
        ticker="HGLG11",
        nome="CSHG Logística",
        segmento="Logística",
        gestora="Credit Suisse Hedging-Griffo",
        data_ipo=date(2010, 2, 3),
    )
    db_session.add(fundo)
    db_session.commit()

    assert fundo.ticker == "HGLG11"
    assert fundo.segmento == "Logística"
    assert fundo.data_ipo == date(2010, 2, 3)


def test_ticker_unico(db_session):
    db_session.add(Fundo(ticker="KNRI11"))
    db_session.commit()

    db_session.add(Fundo(ticker="KNRI11"))
    with pytest.raises(IntegrityError):
        db_session.commit()


def test_criar_indicador_completo(db_session):
    fundo = Fundo(ticker="MXRF11")
    db_session.add(fundo)
    db_session.commit()

    ind = Indicador(
        fundo_id=fundo.id,
        data_referencia=date_type(2026, 5, 1),
        dy_atual=0.12,
        dy_12m=0.11,
        p_vp=0.98,
        vacancia_fisica=0.05,
        vacancia_financeira=0.04,
        liquidez_diaria=5_000_000.0,
        volatilidade_12m=0.12,
        patrimonio_liquido=2_000_000_000.0,
        num_cotistas=180_000,
    )
    db_session.add(ind)
    db_session.commit()
    db_session.refresh(ind)

    assert ind.id is not None
    assert ind.fundo_id == fundo.id
    assert ind.dy_atual == 0.12


def test_criar_indicador_com_nulos(db_session):
    fundo = Fundo(ticker="BCFF11")
    db_session.add(fundo)
    db_session.commit()

    ind = Indicador(fundo_id=fundo.id, data_referencia=date_type(2026, 5, 1))
    db_session.add(ind)
    db_session.commit()

    assert ind.dy_atual is None
    assert ind.p_vp is None


def test_criar_scoring_historico(db_session):
    fundo = Fundo(ticker="BTLG11")
    db_session.add(fundo)
    db_session.commit()

    scoring = ScoringHistorico(
        fundo_id=fundo.id,
        data_execucao=dt(2026, 5, 22, 10, 0, 0),
        score=75.5,
        classificacao="Bom",
    )
    db_session.add(scoring)
    db_session.commit()
    db_session.refresh(scoring)

    assert scoring.id is not None
    assert scoring.score == 75.5
    assert scoring.classificacao == "Bom"


def test_criar_cluster_e_associar_fundo(db_session):
    cluster = Cluster(
        nome_interpretado="Tijolo Conservador",
        perfil_risco="conservador",
        descricao="FIIs de baixa volatilidade com DY moderado",
        dy_medio=0.10,
        volatilidade_media=0.08,
        p_vp_medio=0.95,
        num_fiis=12,
    )
    db_session.add(cluster)
    db_session.commit()

    fundo = Fundo(ticker="ALZR11")
    db_session.add(fundo)
    db_session.commit()

    fc = FundoCluster(
        fundo_id=fundo.id,
        cluster_id=cluster.id,
        data_atribuicao=date_type(2026, 5, 22),
    )
    db_session.add(fc)
    db_session.commit()

    assert fc.fundo_id == fundo.id
    assert fc.cluster_id == cluster.id


def test_criar_perfil_investidor(db_session):
    perfil = PerfilInvestidor(tipo="moderado")
    db_session.add(perfil)
    db_session.commit()
    db_session.refresh(perfil)

    assert perfil.id is not None
    assert len(perfil.id) == 36  # UUID string
    assert perfil.tipo == "moderado"
    assert perfil.pesos_personalizados is None


def test_perfil_com_pesos_customizados(db_session):
    pesos = {"dy_atual": 0.25, "p_vp": 0.20, "vacancia_fisica": 0.10}
    perfil = PerfilInvestidor(tipo="arrojado", pesos_personalizados=pesos)
    db_session.add(perfil)
    db_session.commit()
    db_session.refresh(perfil)

    assert perfil.pesos_personalizados["dy_atual"] == 0.25


def test_fundo_classe_default_fii(db_session):
    fundo = Fundo(ticker="HGLG11")
    db_session.add(fundo)
    db_session.commit()
    db_session.refresh(fundo)
    assert fundo.classe == "FII"


def test_fundo_classe_fiagro(db_session):
    fundo = Fundo(ticker="SPAF11", classe="FIAGRO")
    db_session.add(fundo)
    db_session.commit()
    db_session.refresh(fundo)
    assert fundo.classe == "FIAGRO"


def test_usuario_persistido(db_session):
    from app.models.usuario import Usuario

    u = Usuario(email="a@b.com", senha_hash="hash")
    db_session.add(u)
    db_session.commit()
    db_session.refresh(u)
    assert u.id is not None
    assert u.email == "a@b.com"
    assert u.posicoes == []


def test_posicao_persistida(db_session):
    from app.models.posicao import Posicao
    from app.models.usuario import Usuario

    u = Usuario(email="dono@b.com", senha_hash="h")
    f = Fundo(ticker="HGLG11")
    db_session.add_all([u, f])
    db_session.commit()

    p = Posicao(
        usuario_id=u.id,
        fundo_id=f.id,
        quantidade=10,
        preco_medio=Decimal("100.00"),
        valor_investido=Decimal("1000.00"),
    )
    db_session.add(p)
    db_session.commit()
    db_session.refresh(p)

    assert p.id is not None
    assert p.usuario.email == "dono@b.com"
    assert p.fundo.ticker == "HGLG11"


def test_provento_persiste_e_relaciona_fundo(db_session):
    f = Fundo(ticker="HGLG11", nome="CSHG Log", classe="FII")
    db_session.add(f)
    db_session.flush()
    p = Provento(
        fundo_id=f.id,
        data_com=date(2026, 5, 29),
        data_pagamento=date(2026, 6, 15),
        valor_por_cota=Decimal("1.10"),
        tipo="rendimento",
    )
    db_session.add(p)
    db_session.commit()
    db_session.refresh(p)
    assert p.id is not None
    assert p.fundo.ticker == "HGLG11"
    assert p in f.proventos
