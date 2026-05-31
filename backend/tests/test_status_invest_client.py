import json
from pathlib import Path

import httpx
import respx

from app.utils.status_invest_client import StatusInvestClient

_SCREENER_REAL = json.loads(
    (Path(__file__).parent / "fixtures" / "si_screener_real.json").read_text()
)


def test_buscar_screener_retorna_lista_de_dicts():
    with respx.mock:
        respx.get(
            url__regex=r".*advancedsearchresult.*"
        ).mock(return_value=httpx.Response(200, json=_SCREENER_REAL))
        itens = StatusInvestClient().buscar_screener()
    assert isinstance(itens, list)
    assert len(itens) > 0
    assert "ticker" in itens[0]
    assert "dy" in itens[0]


def test_buscar_serie_precos_extrai_lista_de_floats():
    payload = [
        {
            "prices": [
                {"price": 100.0, "date": "01/01/25 00:00"},
                {"price": 101.5, "date": "02/01/25 00:00"},
            ]
        }
    ]
    with respx.mock:
        respx.get(url__regex=r".*tickerprice.*").mock(
            return_value=httpx.Response(200, json=payload)
        )
        precos = StatusInvestClient().buscar_serie_precos("XPLG11")
    assert precos == [100.0, 101.5]
