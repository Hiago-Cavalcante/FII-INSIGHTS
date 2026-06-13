from datetime import date
from types import SimpleNamespace

import pytest

from app.models.fundo import Fundo
from app.models.indicador import Indicador
from app.services.scoring_service import (
    DIMENSOES_FIAGRO,
    DIMENSOES_FII,
    PESOS_DEFAULT,
    PESOS_FIAGRO,
    ScoringService,
    calcular_pontuacoes,
    calcular_score_com_pesos,
    classificar_score,
    pontuar_dy,
    pontuar_dy_fiagro,
    pontuar_liquidez,
    pontuar_percentil,
    pontuar_pvp,
    pontuar_segmento,
    pontuar_vacancia,
    pontuar_volatilidade,
    resolver_perfil,
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
        db_session,
        "SCOR11",
        dy_atual=0.09,
        dy_12m=0.085,
        p_vp=0.93,
        vacancia_fisica=0.025,
        vacancia_financeira=0.031,
        liquidez_diaria=9_863_300.0,
        patrimonio_liquido=7_000_000_000.0,
        num_cotistas=565_330,
    )
    _criar_fundo_com_indicador(
        db_session,
        "SCOR22",
        dy_atual=0.07,
        dy_12m=0.07,
        p_vp=1.10,
        vacancia_fisica=0.08,
        vacancia_financeira=0.10,
        liquidez_diaria=500_000.0,
        patrimonio_liquido=1_000_000_000.0,
        num_cotistas=100_000,
    )
    resultado = ScoringService(db_session).executar()
    assert resultado["calculados"] == 2
    assert resultado["erros"] == 0


def test_scoring_fundo_sem_alguns_indicadores(db_session):
    _criar_fundo_com_indicador(
        db_session,
        "NULL11",
        dy_atual=0.09,
        p_vp=0.93,
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


# ── faixas ainda não cobertas ─────────────────────────────────────────


def test_volatilidade_faixas():
    assert pontuar_volatilidade(0.08) == 5  # <10%
    assert pontuar_volatilidade(0.12) == 4  # 10-15%
    assert pontuar_volatilidade(0.17) == 3  # 15-20%
    assert pontuar_volatilidade(0.25) == 2  # 20-30%
    assert pontuar_volatilidade(0.35) == 1  # >30%
    # fronteiras exatas (limites são "<", então o valor do limite cai na faixa de baixo)
    assert pontuar_volatilidade(0.10) == 4
    assert pontuar_volatilidade(0.15) == 3
    assert pontuar_volatilidade(0.20) == 2
    assert pontuar_volatilidade(0.30) == 1


def test_percentil_lista_vazia_retorna_neutro():
    assert pontuar_percentil(100.0, []) == 3


def test_percentil_faixas():
    todos = [10.0, 20.0, 30.0, 40.0, 50.0, 60.0, 70.0, 80.0, 90.0, 100.0]
    assert pontuar_percentil(10.0, todos) == 1  # rank 0.1
    assert pontuar_percentil(30.0, todos) == 2  # rank 0.3
    assert pontuar_percentil(50.0, todos) == 3  # rank 0.5
    assert pontuar_percentil(70.0, todos) == 4  # rank 0.7
    assert pontuar_percentil(100.0, todos) == 5  # rank 1.0


def test_classificar_score_fronteiras():
    assert classificar_score(80.0) == "Excelente"
    assert classificar_score(79.99) == "Bom"
    assert classificar_score(60.0) == "Bom"
    assert classificar_score(59.99) == "Regular"
    assert classificar_score(40.0) == "Regular"
    assert classificar_score(39.99) == "Evitar"
    assert classificar_score(0.0) == "Evitar"


# ── núcleo crítico: calcular_score_com_pesos (redistribuição por dimensão) ──

_KEYS = list(PESOS_DEFAULT.keys())


def _pont(**vals: float) -> dict[str, float | None]:
    """Monta o dict de pontuações (chaves ausentes ficam None)."""
    return {k: vals.get(k) for k in _KEYS}


def _todos(valor: float) -> dict[str, float | None]:
    return {k: valor for k in _KEYS}


def test_score_todos_cinco_da_100():
    assert calcular_score_com_pesos(_todos(5.0), PESOS_DEFAULT) == pytest.approx(100.0)


def test_score_todos_tres_da_60():
    # pontuação 3/5 em todos → 60% do máximo.
    assert calcular_score_com_pesos(_todos(3.0), PESOS_DEFAULT) == pytest.approx(60.0)


def test_score_caso_misto_valor_exato():
    # Σ peso×(pts/5)×100 (todos presentes, sem redistribuição) = 84.0 (calc. à mão).
    p = _pont(
        dy_atual=5,
        dy_12m=3,
        p_vp=4,
        vacancia_fisica=5,
        vacancia_financeira=5,
        liquidez_diaria=4,
        volatilidade_12m=3,
        patrimonio_liquido=3,
        num_cotistas=4,
        segmento=5,
    )
    assert calcular_score_com_pesos(p, PESOS_DEFAULT) == pytest.approx(84.0)


def test_redistribuicao_dentro_da_dimensao_risco():
    # No Risco só há liquidez (pts=1); ela absorve todo o peso da dimensão (0.40).
    # Demais presentes = 5. Score à mão = 30+15+8+15 = 68.0.
    p = _pont(
        dy_atual=5,
        dy_12m=5,
        p_vp=5,
        liquidez_diaria=1,
        patrimonio_liquido=5,
        num_cotistas=5,
        segmento=5,
    )
    assert calcular_score_com_pesos(p, PESOS_DEFAULT) == pytest.approx(68.0)


def test_dimensao_risco_inteira_ausente_renormaliza():
    # Risco todo nulo → excluído (não contado como zero). Rent=5, Val=5, Estrutura=3.
    # peso_total=0.60 → score à mão = 50+25+15 = 90.0. (Caso documentado no CLAUDE.md.)
    p = _pont(
        dy_atual=5,
        dy_12m=5,
        p_vp=5,
        patrimonio_liquido=3,
        num_cotistas=3,
        segmento=3,
    )
    assert calcular_score_com_pesos(p, PESOS_DEFAULT) == pytest.approx(90.0)


def test_score_sem_pontuacoes_da_zero():
    assert calcular_score_com_pesos(_pont(), PESOS_DEFAULT) == 0.0


def test_score_conservador_com_estrutura_so_segmento_nao_quebra():
    # Regressão: peso_presente == 0 quando só segmento (peso 0 no conservador) está presente
    # na dimensão Estrutura. Antes levantava ZeroDivisionError.
    from app.services.scoring_service import PESOS_POR_PERFIL

    pontuacoes = {
        "dy_atual": 5.0,
        "dy_12m": 5.0,
        "p_vp": 4.0,
        "vacancia_fisica": None,
        "vacancia_financeira": None,
        "liquidez_diaria": 4.0,
        "volatilidade_12m": 5.0,
        "patrimonio_liquido": None,
        "num_cotistas": None,
        "segmento": 3.0,
    }
    score = calcular_score_com_pesos(pontuacoes, PESOS_POR_PERFIL["conservador"])
    assert isinstance(score, float)
    assert 0.0 <= score <= 100.0


# ── RF-14: scoring por classe (FII × FIAGRO) ──────────────────────────


def test_pontuar_dy_fiagro_faixas():
    # Calibrada contra os DYs reais coletados (agro-CRA roda 14-20% com Selic alta).
    assert pontuar_dy_fiagro(0.08) == 1  # <=9% (atipicamente baixo p/ FIAGRO)
    assert pontuar_dy_fiagro(0.09) == 1
    assert pontuar_dy_fiagro(0.11) == 3  # 9-12% (modesto)
    assert pontuar_dy_fiagro(0.12) == 3
    assert pontuar_dy_fiagro(0.14) == 5  # 12-16% (núcleo saudável)
    assert pontuar_dy_fiagro(0.16) == 5
    assert pontuar_dy_fiagro(0.18) == 4  # 16-20% (alto, comum)
    assert pontuar_dy_fiagro(0.20) == 4
    assert pontuar_dy_fiagro(0.22) == 2  # >20% (cautela: risco de crédito/retorno de capital)


def test_pesos_fiagro_somam_um():
    assert abs(sum(PESOS_FIAGRO.values()) - 1.0) < 1e-9


def test_dimensoes_fiagro_sem_vacancia_nem_segmento():
    todos = [i for ind in DIMENSOES_FIAGRO.values() for i in ind]
    assert "vacancia_fisica" not in todos
    assert "vacancia_financeira" not in todos
    assert "segmento" not in todos


def test_score_fiagro_ignora_vacancia_e_segmento():
    # Pontuações máximas só nos indicadores FIAGRO -> score 100;
    # vacância/segmento presentes não devem alterar nada.
    pont = {
        "dy_atual": 5.0,
        "dy_12m": 5.0,
        "p_vp": 5.0,
        "liquidez_diaria": 5.0,
        "volatilidade_12m": 5.0,
        "patrimonio_liquido": 5.0,
        "num_cotistas": 5.0,
        "vacancia_fisica": 1.0,
        "vacancia_financeira": 1.0,
        "segmento": 1.0,
    }
    assert calcular_score_com_pesos(pont, PESOS_FIAGRO, DIMENSOES_FIAGRO) == 100.0


def test_resolver_perfil_fiagro():
    pesos, dims = resolver_perfil("FIAGRO", PESOS_DEFAULT)
    assert pesos is PESOS_FIAGRO
    assert dims is DIMENSOES_FIAGRO


def test_resolver_perfil_fii_usa_pesos_recebidos():
    pesos, dims = resolver_perfil("FII", PESOS_DEFAULT)
    assert pesos is PESOS_DEFAULT
    assert dims is DIMENSOES_FII


def _ns_indicador(**kw: float | None) -> SimpleNamespace:
    base: dict[str, float | None] = dict(
        dy_atual=None,
        dy_12m=None,
        p_vp=None,
        vacancia_fisica=None,
        vacancia_financeira=None,
        liquidez_diaria=None,
        volatilidade_12m=None,
        patrimonio_liquido=None,
        num_cotistas=None,
    )
    base.update(kw)
    return SimpleNamespace(**base)


def test_dy_pontua_por_classe():
    # DY 13% -> FII pune (curva satura em 8-10% e cai depois), FIAGRO premia (5).
    ind = _ns_indicador(dy_atual=0.13)
    fundo_fii = SimpleNamespace(classe="FII", segmento=None)
    fundo_fiagro = SimpleNamespace(classe="FIAGRO", segmento=None)
    p_fii = calcular_pontuacoes(ind, fundo_fii, [], [])
    p_fiagro = calcular_pontuacoes(ind, fundo_fiagro, [], [])
    assert p_fii["dy_atual"] == 2.0  # >12% na curva FII
    assert p_fiagro["dy_atual"] == 5.0  # 10-13% na curva FIAGRO


def test_executar_grava_classe_aplicada(db_session):
    from app.models.scoring import ScoringHistorico

    fii = Fundo(ticker="HGLG11", classe="FII", segmento="Logística")
    fiagro = Fundo(ticker="RZTR11", classe="FIAGRO", segmento="Agro - Terras")
    db_session.add_all([fii, fiagro])
    db_session.flush()
    db_session.add_all(
        [
            Indicador(
                fundo_id=fii.id,
                data_referencia=date(2026, 6, 1),
                dy_atual=0.09,
                p_vp=0.95,
                liquidez_diaria=2_000_000.0,
                volatilidade_12m=0.10,
            ),
            Indicador(
                fundo_id=fiagro.id,
                data_referencia=date(2026, 6, 1),
                dy_atual=0.13,
                p_vp=0.98,
                liquidez_diaria=1_000_000.0,
                volatilidade_12m=0.08,
            ),
        ]
    )
    db_session.commit()

    ScoringService(db_session).executar()
    classes = {s.fundo.ticker: s.classe_aplicada for s in db_session.query(ScoringHistorico).all()}
    assert classes["HGLG11"] == "FII"
    assert classes["RZTR11"] == "FIAGRO"


def test_score_discriminante_fiagro_vs_fii():
    # Mesmo FIAGRO com DY alto pontua melhor sob o perfil FIAGRO do que sob FII.
    ind = _ns_indicador(
        dy_atual=0.13,
        dy_12m=0.13,
        p_vp=0.9,
        liquidez_diaria=2_000_000,
        volatilidade_12m=0.08,
        patrimonio_liquido=1e9,
        num_cotistas=50_000,
    )
    fundo = SimpleNamespace(classe="FIAGRO", segmento="Recebíveis")
    pont = calcular_pontuacoes(ind, fundo, [1e9], [50_000.0])
    pesos_f, dims_f = resolver_perfil("FIAGRO", PESOS_DEFAULT)
    score_fiagro = calcular_score_com_pesos(pont, pesos_f, dims_f)
    score_fii = calcular_score_com_pesos(pont, PESOS_DEFAULT, DIMENSOES_FII)
    assert score_fiagro > score_fii
