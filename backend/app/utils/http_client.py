from __future__ import annotations

import logging
import time
from typing import Any

import httpx

logger = logging.getLogger(__name__)

_BASE_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "pt-BR,pt;q=0.9",
}

_HEADERS = {
    **_BASE_HEADERS,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

_JSON_HEADERS = {
    **_BASE_HEADERS,
    "Accept": "application/json, text/plain, */*",
    "X-Requested-With": "XMLHttpRequest",
    "Referer": "https://statusinvest.com.br/fundos-imobiliarios/busca-avancada",
}

_STATUS_RETRIABLE = {429, 500, 502, 503, 504}
_STATUS_NAO_RETRIABLE = {400, 401, 403, 404}


def criar_cliente_http() -> httpx.Client:
    return httpx.Client(headers=_HEADERS, timeout=15.0, follow_redirects=True)


def criar_cliente_status_invest() -> httpx.Client:
    """Cliente com headers de browser + cabeçalhos AJAX exigidos pelos endpoints JSON."""
    return httpx.Client(headers=_JSON_HEADERS, timeout=20.0, follow_redirects=True)


def _request_com_retry(
    client: httpx.Client,
    url: str,
    params: dict[str, str] | None = None,
    max_tentativas: int = 3,
) -> httpx.Response:
    """GET com retry exponencial (1s, 2s). Retorna a resposta crua."""
    ultimo_erro: Exception | None = None
    for tentativa in range(max_tentativas):
        try:
            resp = client.get(url, params=params)
            if resp.status_code in _STATUS_NAO_RETRIABLE:
                resp.raise_for_status()
            if resp.status_code in _STATUS_RETRIABLE:
                raise httpx.HTTPStatusError(
                    f"HTTP {resp.status_code}", request=resp.request, response=resp
                )
            resp.raise_for_status()
            return resp
        except httpx.HTTPStatusError as e:
            if e.response.status_code in _STATUS_NAO_RETRIABLE:
                raise
            ultimo_erro = e
            if tentativa < max_tentativas - 1:
                wait = 2**tentativa
                logger.warning(
                    "Tentativa %d falhou: %s. Aguardando %ds", tentativa + 1, e, wait
                )
                time.sleep(wait)
        except (httpx.TimeoutException, httpx.NetworkError) as e:
            ultimo_erro = e
            if tentativa < max_tentativas - 1:
                wait = 2**tentativa
                time.sleep(wait)
    raise ultimo_erro  # type: ignore[misc]


def fetch_com_retry(client: httpx.Client, url: str, max_tentativas: int = 3) -> str:
    return _request_com_retry(client, url, max_tentativas=max_tentativas).text


def fetch_json_com_retry(
    client: httpx.Client,
    url: str,
    params: dict[str, str] | None = None,
    max_tentativas: int = 3,
) -> Any:
    return _request_com_retry(
        client, url, params=params, max_tentativas=max_tentativas
    ).json()
