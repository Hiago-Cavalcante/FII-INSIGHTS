import pytest

from app.services.volatilidade import calcular_volatilidade_anualizada


def test_serie_conhecida_valor_esperado():
    # ddof=1, anualizado * sqrt(252); valor pré-computado.
    serie = [100.0, 101.0, 99.0, 102.0, 98.0, 103.0]
    assert calcular_volatilidade_anualizada(serie) == pytest.approx(0.577411, abs=1e-5)


def test_serie_constante_volatilidade_zero():
    assert calcular_volatilidade_anualizada([50.0, 50.0, 50.0, 50.0]) == pytest.approx(0.0)


def test_serie_curta_demais_retorna_none():
    assert calcular_volatilidade_anualizada([100.0]) is None
    assert calcular_volatilidade_anualizada([100.0, 101.0]) is None
    assert calcular_volatilidade_anualizada([]) is None


def test_janela_limita_aos_ultimos_pontos():
    # 1000 pontos constantes => vol 0 mesmo com janela default 252.
    assert calcular_volatilidade_anualizada([10.0] * 1000) == pytest.approx(0.0)
