from datetime import date

from app.models.fundo import Fundo
from app.models.indicador import Indicador
from app.services.scoring_service import (
    ScoringService,
    classificar_score,
    pontuar_dy,
    pontuar_liquidez,
    pontuar_pvp,
    pontuar_segmento,
    pontuar_vacancia,
)


def test_dy_faixas():
    assert pontuar_dy(0.05) == 1
    assert pontuar_dy(0.07) == 3
    assert pontuar_dy(0.09) == 5
    assert pontuar_dy(0.11) == 4
    assert pontuar_dy(0.13) == 2


def test_pvp_faixas():
    assert pontuar_pvp(0.75) == 5
    assert pontuar_pvp(0.87) == 4
    assert pontuar_pvp(1.00) == 3
    assert pontuar_pvp(1.10) == 2
    assert pontuar_pvp(1.25) == 1


def test_vacancia_faixas():
    assert pontuar_vacancia(0.03) == 5
    assert pontuar_vacancia(0.07) == 4
    assert pontuar_vacancia(0.12) == 3
    assert pontuar_vacancia(0.20) == 2
    assert pontuar_vacancia(0.30) == 1


def test_liquidez_faixas():
    assert pontuar_liquidez(50_000) == 1
    assert pontuar_liquidez(200_000) == 2
    assert pontuar_liquidez(700_000) == 3
    assert pontuar_liquidez(2_000_000) == 4
    assert pontuar_liquidez(10_000_000) == 5


def test_segmento_scores():
    assert pontuar_segmento("Logística") == 5
    assert pontuar_segmento("Lajes Corporativas") == 4
    assert pontuar_segmento("Shopping") == 4
    assert pontuar_segmento("Renda Urbana") == 3
    assert pontuar_segmento("Híbrido") == 3
    assert pontuar_segmento("Fundo de Fundos") == 2
    assert pontuar_segmento("Recebíveis") == 2
    assert pontuar_segmento(None) is None
    assert pontuar_segmento("Outro Qualquer") == 3


def test_classificar_score():
    assert classificar_score(85.0) == "Excelente"
    assert classificar_score(80.0) == "Excelente"
    assert classificar_score(75.0) == "Bom"
    assert classificar_score(60.0) == "Bom"
    assert classificar_score(55.0) == "Regular"
    assert classificar_score(40.0) == "Regular"
    assert classificar_score(39.9) == "Evitar"


def _criar_fundo_com_indicador(db_session, ticker, segmento="Logística", **campos):
    fundo = Fundo(ticker=ticker, segmento=segmento)
    db_session.add(fundo)
    db_session.flush()
    ind = Indicador(fundo_id=fundo.id, data_referencia=date(2026, 5, 26), **campos)
    db_session.add(ind)
    db_session.commit()
    return fundo, ind


def test_scoring_service_calcula_e_salva(db_session):
    _criar_fundo_com_indicador(
        db_session, "SCOR11",
        dy_atual=0.09, dy_12m=0.085, p_vp=0.93,
        vacancia_fisica=0.025, vacancia_financeira=0.031,
        liquidez_diaria=9_863_300.0, patrimonio_liquido=7_000_000_000.0,
        num_cotistas=565_330,
    )
    _criar_fundo_com_indicador(
        db_session, "SCOR22",
        dy_atual=0.07, dy_12m=0.07, p_vp=1.10,
        vacancia_fisica=0.08, vacancia_financeira=0.10,
        liquidez_diaria=500_000.0, patrimonio_liquido=1_000_000_000.0,
        num_cotistas=100_000,
    )
    resultado = ScoringService(db_session).executar()
    assert resultado["calculados"] == 2
    assert resultado["erros"] == 0


def test_scoring_fundo_sem_alguns_indicadores(db_session):
    _criar_fundo_com_indicador(
        db_session, "NULL11",
        dy_atual=0.09, p_vp=0.93,
    )
    resultado = ScoringService(db_session).executar()
    assert resultado["calculados"] == 1
    assert resultado["erros"] == 0


def test_scoring_nao_processa_fundo_sem_indicadores(db_session):
    fundo = Fundo(ticker="VOID11", segmento="Logística")
    db_session.add(fundo)
    db_session.commit()
    resultado = ScoringService(db_session).executar()
    assert resultado["calculados"] == 0
    assert resultado["sem_dados"] == 1
