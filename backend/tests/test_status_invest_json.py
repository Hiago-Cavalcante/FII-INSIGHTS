import pytest

from app.utils.parsers.status_invest_json import (
    calcular_dy_atual,
    normalizar_screener_item,
    parse_screener,
    parse_serie_precos,
)


def test_normalizar_screener_item_converte_unidades():
    item = {
        "ticker": "XPLG11",
        "dy": 9.85,  # % -> fração
        "p_vp": 0.70,  # razão (sem conversão)
        "liquidezmediadiaria": 75824.52,
        "patrimonio": 2_000_000_000.0,
        "numerocotistas": 180000,
        "price": 100.0,
        "lastdividend": 0.80,  # R$ -> dy_atual = 0.80*12/100 = 0.096
    }
    out = normalizar_screener_item(item)
    assert out["dy_12m"] == pytest.approx(0.0985)
    assert out["p_vp"] == pytest.approx(0.70)
    assert out["liquidez_diaria"] == pytest.approx(75824.52)
    assert out["patrimonio_liquido"] == pytest.approx(2_000_000_000.0)
    assert out["num_cotistas"] == 180000
    assert out["dy_atual"] == pytest.approx(0.096)


def test_normalizar_screener_item_campos_nulos():
    out = normalizar_screener_item({"ticker": "X11"})
    assert out["dy_12m"] is None
    assert out["p_vp"] is None
    assert out["dy_atual"] is None
    assert out["num_cotistas"] is None


def test_calcular_dy_atual():
    assert calcular_dy_atual(0.80, 100.0) == pytest.approx(0.096)
    assert calcular_dy_atual(None, 100.0) is None
    assert calcular_dy_atual(0.80, 0.0) is None
    assert calcular_dy_atual(0.0, 100.0) == pytest.approx(0.0)  # rendimento R$0 = yield 0%, não ausência


def test_parse_screener_indexa_por_ticker():
    payload = [
        {"ticker": "XPLG11", "dy": 9.85, "p_vp": 0.70, "price": 100.0, "lastdividend": 0.80},
        {"ticker": "HGLG11", "dy": 8.50, "p_vp": 0.93, "price": 160.0, "lastdividend": 1.10},
    ]
    mapa = parse_screener(payload)
    assert set(mapa.keys()) == {"XPLG11", "HGLG11"}
    assert mapa["HGLG11"]["dy_12m"] == pytest.approx(0.085)


def test_parse_serie_precos_lista_envelopada():
    payload = [
        {
            "prices": [
                {"price": 10.0, "date": "01/01/25 00:00"},
                {"price": 11.0, "date": "02/01/25 00:00"},
                {"price": None, "date": "03/01/25 00:00"},
            ]
        }
    ]
    assert parse_serie_precos(payload) == [10.0, 11.0]


def test_parse_serie_precos_vazia():
    assert parse_serie_precos([{"prices": []}]) == []
    assert parse_serie_precos([]) == []


def test_parse_screener_ignora_item_sem_ticker():
    assert parse_screener([{"dy": 9.0}]) == {}
