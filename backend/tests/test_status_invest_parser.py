from pathlib import Path

import pytest

from app.utils.parsers.status_invest import StatusInvestParser

# Página real do HGLG11 (capturada do Status Invest) — estrutura fiel.
FIXTURE = (Path(__file__).parent / "fixtures" / "hglg11_real.html").read_text(
    encoding="utf-8"
)


@pytest.fixture
def parser():
    return StatusInvestParser()


def test_extrair_fundamentais_pagina_real(parser):
    d = parser.extrair_fundamentais(FIXTURE)
    assert d["dy_12m"] == pytest.approx(0.0848, abs=1e-4)
    assert d["p_vp"] == pytest.approx(0.94, abs=1e-2)
    assert d["liquidez_diaria"] == pytest.approx(13_513_276.91, rel=1e-3)
    assert d["num_cotistas"] == 565_330
    assert d["patrimonio_liquido"] == pytest.approx(7_234_911_198.0, rel=1e-6)
    assert d["dy_atual"] == pytest.approx(0.0848, abs=1e-3)  # 1,10 × 12 / 155,71


def test_extrair_fundamentais_retorna_todas_as_chaves(parser):
    d = parser.extrair_fundamentais(FIXTURE)
    assert set(d.keys()) == {
        "dy_12m", "p_vp", "liquidez_diaria", "num_cotistas",
        "patrimonio_liquido", "dy_atual",
    }


def test_extrair_vacancia_pagina_real(parser):
    d = parser.extrair_vacancia(FIXTURE)
    # HGLG11 exibe VACÂNCIA 0,000% (0% — fundo totalmente locado); ignora o widget '-%'.
    assert d["vacancia_fisica"] == pytest.approx(0.0)
    assert d["vacancia_financeira"] is None


def test_pagina_sem_dados_retorna_none(parser):
    html = "<html><body><p>nada útil aqui</p></body></html>"
    fund = parser.extrair_fundamentais(html)
    assert fund["p_vp"] is None
    assert fund["dy_12m"] is None
    assert fund["patrimonio_liquido"] is None
    assert fund["dy_atual"] is None
    vac = parser.extrair_vacancia(html)
    assert vac["vacancia_fisica"] is None
    assert vac["vacancia_financeira"] is None
