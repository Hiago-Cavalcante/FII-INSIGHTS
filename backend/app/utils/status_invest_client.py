from __future__ import annotations

import time
from typing import Any

import httpx

from app.utils.http_client import (
    criar_cliente_http,
    criar_cliente_status_invest,
    fetch_com_retry,
    fetch_json_com_retry,
)
from app.utils.parsers.status_invest_json import parse_serie_precos


class StatusInvestClient:
    """Acesso aos endpoints do Status Invest para FIIs (JSON + página HTML)."""

    SCREENER_URL = "https://statusinvest.com.br/category/advancedsearchresult"
    SCREENER_PAGINATED_URL = (
        "https://statusinvest.com.br/category/advancedsearchresultpaginated"
    )
    TICKERPRICE_URL = "https://statusinvest.com.br/fii/tickerprice"
    PROVENTS_URL = "https://statusinvest.com.br/fii/companytickerprovents"
    PAGINA_URL = "https://statusinvest.com.br/fundos-imobiliarios"

    SCREENER_SEARCH = (
        '{"Segment":"","my_range":"-20;100",'
        '"dy":{"Item1":null,"Item2":null},'
        '"p_vp":{"Item1":null,"Item2":null}}'
    )
    MAX_PAGINAS = 40

    def __init__(self, client: httpx.Client | None = None, delay: float = 0.3) -> None:
        self._client = client or criar_cliente_status_invest()
        self._delay = delay

    def close(self) -> None:
        self._client.close()

    def __enter__(self) -> StatusInvestClient:
        return self

    def __exit__(self, *_: object) -> None:
        self.close()

    @staticmethod
    def _lista(data: Any) -> list[dict[str, Any]]:
        if isinstance(data, list):
            return data
        if isinstance(data, dict):
            return list(data.get("list", []))
        return []

    def _acumular(self, todos: dict[str, dict[str, Any]], data: Any) -> None:
        for item in self._lista(data):
            ticker = item.get("ticker")
            if ticker:
                todos[ticker] = item

    def buscar_screener(self) -> list[dict[str, Any]]:
        """Une o resultado alfabético (100) + a paginação completa, dedup por ticker.

        O endpoint não-paginado devolve os 100 primeiros alfabéticos; o paginado
        cobre o restante (20/página). A união cobre ~601 FIIs.
        """
        todos: dict[str, dict[str, Any]] = {}
        base = {"search": self.SCREENER_SEARCH, "CategoryType": "2"}

        primeira = fetch_json_com_retry(self._client, self.SCREENER_URL, params=base)
        self._acumular(todos, primeira)

        for page in range(1, self.MAX_PAGINAS + 1):
            params = {**base, "page": str(page), "size": "100"}
            data = fetch_json_com_retry(
                self._client, self.SCREENER_PAGINATED_URL, params=params
            )
            if not self._lista(data):
                break
            self._acumular(todos, data)
            time.sleep(self._delay)

        return list(todos.values())

    def buscar_serie_precos(self, ticker: str) -> list[float]:
        params = {"ticker": ticker, "type": "6"}
        data = fetch_json_com_retry(self._client, self.TICKERPRICE_URL, params=params)
        return parse_serie_precos(data)

    def buscar_proventos(self, ticker: str) -> Any:
        params = {"ticker": ticker, "chartProventsType": "2"}
        return fetch_json_com_retry(self._client, self.PROVENTS_URL, params=params)

    def buscar_pagina_html(self, ticker: str) -> str:
        """HTML da página do FII (fallback de fundamentais e fonte de vacância)."""
        url = f"{self.PAGINA_URL}/{ticker}"
        with criar_cliente_http() as client:
            return fetch_com_retry(client, url)
