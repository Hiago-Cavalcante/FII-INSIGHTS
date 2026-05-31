import json
from pathlib import Path
from unittest.mock import patch

import httpx
import respx

from app.utils.status_invest_client import StatusInvestClient

_SCREENER_REAL = json.loads(
    (Path(__file__).parent / "fixtures" / "si_screener_real.json").read_text()
)
# Regex disjuntos: 'advancedsearchresult\?' casa só o não-paginado (query logo após
# 'result'); 'advancedsearchresultpaginated' casa só o paginado.
_RE_SCREENER = r"advancedsearchresult\?"
_RE_PAGINATED = r"advancedsearchresultpaginated"


def test_buscar_screener_une_alfabetico_e_paginado():
    pagina1 = {"list": [{"ticker": "ZZZP11", "dy": 9.0}], "totalResults": 1}
    vazio = {"list": []}
    with respx.mock:
        respx.get(url__regex=_RE_PAGINATED).mock(
            side_effect=[httpx.Response(200, json=pagina1), httpx.Response(200, json=vazio)]
        )
        respx.get(url__regex=_RE_SCREENER).mock(
            return_value=httpx.Response(200, json=_SCREENER_REAL)
        )
        with patch("app.utils.status_invest_client.time.sleep"):
            itens = StatusInvestClient().buscar_screener()
    tickers = {it["ticker"] for it in itens}
    assert "ZZZP11" in tickers  # veio do paginado
    assert tickers.issuperset({it["ticker"] for it in _SCREENER_REAL})  # alfabético incluído
    assert len(itens) == len({it["ticker"] for it in _SCREENER_REAL}) + 1  # dedup + 1 novo


def test_buscar_serie_precos_extrai_lista_de_floats():
    payload = [{"prices": [{"price": 100.0, "date": "01/01/25 00:00"},
                           {"price": 101.5, "date": "02/01/25 00:00"}]}]
    with respx.mock:
        respx.get(url__regex=r"tickerprice").mock(
            return_value=httpx.Response(200, json=payload)
        )
        precos = StatusInvestClient().buscar_serie_precos("XPLG11")
    assert precos == [100.0, 101.5]


def test_buscar_pagina_html_retorna_texto():
    with respx.mock:
        respx.get(url__regex=r"fundos-imobiliarios/HGLG11").mock(
            return_value=httpx.Response(200, text="<html>ok</html>")
        )
        html = StatusInvestClient().buscar_pagina_html("HGLG11")
    assert "<html>ok</html>" in html


def test_context_manager_fecha_cliente():
    client = httpx.Client()
    with StatusInvestClient(client=client):
        pass
    assert client.is_closed
