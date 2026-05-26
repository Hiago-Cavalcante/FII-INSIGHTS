import pytest
from pathlib import Path
from app.utils.parsers.status_invest import StatusInvestParser

FIXTURE = (Path(__file__).parent / "fixtures" / "hglg11_page.html").read_text(encoding="utf-8")


@pytest.fixture
def parser():
    return StatusInvestParser()


def test_extrair_p_vp(parser):
    assert parser.extrair(FIXTURE)["p_vp"] == pytest.approx(0.93, abs=0.01)


def test_extrair_dy_12m(parser):
    assert parser.extrair(FIXTURE)["dy_12m"] == pytest.approx(0.085, abs=0.001)


def test_extrair_dy_atual(parser):
    assert parser.extrair(FIXTURE)["dy_atual"] == pytest.approx(0.0072, abs=0.0001)


def test_extrair_liquidez(parser):
    assert parser.extrair(FIXTURE)["liquidez_diaria"] == pytest.approx(9_863_300.65, rel=0.01)


def test_extrair_patrimonio(parser):
    assert parser.extrair(FIXTURE)["patrimonio_liquido"] == pytest.approx(7_234_911_198.0, rel=0.01)


def test_extrair_cotistas(parser):
    assert parser.extrair(FIXTURE)["num_cotistas"] == 565_330


def test_extrair_vacancia_fisica(parser):
    assert parser.extrair(FIXTURE)["vacancia_fisica"] == pytest.approx(0.025, abs=0.001)


def test_extrair_vacancia_financeira(parser):
    assert parser.extrair(FIXTURE)["vacancia_financeira"] == pytest.approx(0.031, abs=0.001)


def test_campo_ausente_retorna_none(parser):
    dados = parser.extrair("<html><body><p>vazio</p></body></html>")
    assert dados["p_vp"] is None
    assert dados["dy_12m"] is None
    assert dados["volatilidade_12m"] is None


def test_todas_as_chaves_presentes(parser):
    dados = parser.extrair(FIXTURE)
    assert set(dados.keys()) == {
        "dy_atual", "dy_12m", "p_vp", "vacancia_fisica", "vacancia_financeira",
        "liquidez_diaria", "volatilidade_12m", "patrimonio_liquido", "num_cotistas",
    }
