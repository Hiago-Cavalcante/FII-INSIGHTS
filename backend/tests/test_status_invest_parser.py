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


def test_pagina_sem_dados_retorna_none(parser):
    d = parser.extrair_fundamentais("<html><body><p>nada útil aqui</p></body></html>")
    assert d["p_vp"] is None
    assert d["dy_12m"] is None
    assert d["patrimonio_liquido"] is None
    assert d["dy_atual"] is None
