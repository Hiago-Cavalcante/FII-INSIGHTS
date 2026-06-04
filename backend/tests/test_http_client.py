from unittest.mock import patch

import httpx
import pytest
import respx

from app.utils.http_client import (
    criar_cliente_http,
    criar_cliente_status_invest,
    fetch_com_retry,
    fetch_json_com_retry,
)


def test_fetch_retorna_html_em_sucesso():
    with respx.mock:
        respx.get("https://exemplo.com/fii").mock(return_value=httpx.Response(200, text="<html>ok</html>"))
        with criar_cliente_http() as client:
            resultado = fetch_com_retry(client, "https://exemplo.com/fii")
    assert resultado == "<html>ok</html>"


def test_fetch_retry_em_503():
    with respx.mock:
        respx.get("https://exemplo.com/fii").mock(
            side_effect=[
                httpx.Response(503, text="Service Unavailable"),
                httpx.Response(200, text="<html>ok</html>"),
            ]
        )
        with patch("app.utils.http_client.time.sleep") as mock_sleep:
            with criar_cliente_http() as client:
                resultado = fetch_com_retry(client, "https://exemplo.com/fii")
    assert resultado == "<html>ok</html>"
    mock_sleep.assert_called_once_with(1)


def test_fetch_levanta_apos_max_tentativas():
    with respx.mock:
        respx.get("https://exemplo.com/fii").mock(return_value=httpx.Response(503, text="Service Unavailable"))
        with patch("app.utils.http_client.time.sleep"):
            with criar_cliente_http() as client:
                with pytest.raises(httpx.HTTPStatusError):
                    fetch_com_retry(client, "https://exemplo.com/fii", max_tentativas=3)


def test_fetch_nao_retry_em_404():
    with respx.mock:
        respx.get("https://exemplo.com/fii").mock(return_value=httpx.Response(404, text="Not Found"))
        with patch("app.utils.http_client.time.sleep") as mock_sleep:
            with criar_cliente_http() as client:
                with pytest.raises(httpx.HTTPStatusError):
                    fetch_com_retry(client, "https://exemplo.com/fii")
    mock_sleep.assert_not_called()


def test_fetch_json_retorna_dict_em_sucesso():
    with respx.mock:
        respx.get("https://exemplo.com/api").mock(return_value=httpx.Response(200, json={"a": 1, "b": [2, 3]}))
        with criar_cliente_status_invest() as client:
            resultado = fetch_json_com_retry(client, "https://exemplo.com/api")
    assert resultado == {"a": 1, "b": [2, 3]}


def test_fetch_json_retry_em_503():
    with respx.mock:
        respx.get("https://exemplo.com/api").mock(
            side_effect=[
                httpx.Response(503, text="Service Unavailable"),
                httpx.Response(200, json=[{"ticker": "XPLG11"}]),
            ]
        )
        with patch("app.utils.http_client.time.sleep") as mock_sleep:
            with criar_cliente_status_invest() as client:
                resultado = fetch_json_com_retry(client, "https://exemplo.com/api")
    assert resultado == [{"ticker": "XPLG11"}]
    mock_sleep.assert_called_once_with(1)
