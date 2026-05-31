from __future__ import annotations

from typing import Any


def calcular_dy_atual(lastdividend: float | None, price: float | None) -> float | None:
    """DY anualizado corrente = último rendimento (R$) × 12 / preço (R$). Fração 0-1.

    Um rendimento de R$0,00 retorna 0.0 (rendimento nulo real, não ausência de dado).
    """
    if lastdividend is None or price is None or price <= 0:
        return None
    return (float(lastdividend) * 12.0) / float(price)


def normalizar_screener_item(item: dict[str, Any]) -> dict[str, Any]:
    """Converte um item do screener para os campos/unidades do modelo Indicador."""

    def frac(v: Any) -> float | None:
        return float(v) / 100.0 if v is not None else None

    def fnum(v: Any) -> float | None:
        return float(v) if v is not None else None

    cot = item.get("numerocotistas")
    return {
        "dy_12m": frac(item.get("dy")),
        "p_vp": fnum(item.get("p_vp")),
        "liquidez_diaria": fnum(item.get("liquidezmediadiaria")),
        "patrimonio_liquido": fnum(item.get("patrimonio")),
        "num_cotistas": int(cot) if cot is not None else None,
        "dy_atual": calcular_dy_atual(item.get("lastdividend"), item.get("price")),
    }


def parse_screener(payload: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    """Mapa ticker -> indicadores normalizados."""
    mapa: dict[str, dict[str, Any]] = {}
    for item in payload:
        ticker = item.get("ticker")
        if ticker:
            mapa[ticker] = normalizar_screener_item(item)
    return mapa


def parse_serie_precos(payload: Any) -> list[float]:
    """Extrai a lista de preços (descarta nulos) do JSON do tickerprice.

    Aceita None ou lista vazia e retorna [] nesses casos.
    """
    obj = payload[0] if isinstance(payload, list) and payload else payload
    if not isinstance(obj, dict):
        return []
    pts = obj.get("prices") or []
    return [float(p["price"]) for p in pts if p.get("price") is not None]
