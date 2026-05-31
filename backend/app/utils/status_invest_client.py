from __future__ import annotations

from typing import Any

import httpx

from app.utils.http_client import criar_cliente_status_invest, fetch_json_com_retry
from app.utils.parsers.status_invest_json import parse_serie_precos


class StatusInvestClient:
    """Acesso aos endpoints JSON internos do Status Invest para FIIs."""

    SCREENER_URL = "https://statusinvest.com.br/category/advancedsearchresult"
    TICKERPRICE_URL = "https://statusinvest.com.br/fii/tickerprice"
    PROVENTS_URL = "https://statusinvest.com.br/fii/companytickerprovents"

    # Filtro amplo para trazer o máximo de FIIs numa chamada.
    SCREENER_SEARCH = (
        '{"Segment":"","my_range":"-20;100",'
        '"dy":{"Item1":null,"Item2":null},'
        '"p_vp":{"Item1":null,"Item2":null}}'
    )

    def __init__(self, client: httpx.Client | None = None) -> None:
        self._client = client or criar_cliente_status_invest()

    def buscar_screener(self) -> list[dict[str, Any]]:
        """Retorna a lista bruta de FIIs do screener (1 chamada)."""
        params = {"search": self.SCREENER_SEARCH, "CategoryType": "2"}
        data = fetch_json_com_retry(self._client, self.SCREENER_URL, params=params)
        if isinstance(data, list):
            return data
        return list(data.get("list", []))

    def buscar_serie_precos(self, ticker: str) -> list[float]:
        """Retorna a série histórica de preços de fechamento para o ticker."""
        params = {"ticker": ticker, "type": "6"}
        data = fetch_json_com_retry(self._client, self.TICKERPRICE_URL, params=params)
        return parse_serie_precos(data)

    def buscar_proventos(self, ticker: str) -> Any:
        """Retorna o JSON bruto de proventos do ticker."""
        params = {"ticker": ticker, "chartProventsType": "2"}
        return fetch_json_com_retry(self._client, self.PROVENTS_URL, params=params)
