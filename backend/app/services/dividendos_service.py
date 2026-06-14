from __future__ import annotations

from datetime import date, timedelta
from decimal import ROUND_HALF_UP, Decimal
from typing import TypedDict

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.posicao import Posicao
from app.repositories.provento_repository import ProventoRepository

_CENTAVO = Decimal("0.01")


class FundoRenda(TypedDict):
    ticker: str
    renda_mensal: Decimal
    percentual: float
    sem_dados: bool


class Dividendos(TypedDict):
    renda_mensal: Decimal
    renda_anual: Decimal
    yield_on_cost: float | None
    por_fundo: list[FundoRenda]


def _arredondar(valor: Decimal) -> Decimal:
    return valor.quantize(_CENTAVO, rounding=ROUND_HALF_UP)


def calcular_dividendos(db: Session, usuario_id: int, hoje: date | None = None) -> Dividendos:
    """Projeta a renda mensal estimada da carteira (média 12m, só rendimentos).

    renda_mensal_fundo = média(valor_por_cota dos rendimentos pagos nos
    últimos 12 meses) × quantidade. Fundo sem rendimentos → 0 e sem_dados=True.
    """
    hoje = hoje or date.today()
    inicio = hoje - timedelta(days=365)
    posicoes = list(db.scalars(select(Posicao).where(Posicao.usuario_id == usuario_id).order_by(Posicao.id)))

    total_investido = Decimal("0.00")
    renda_total = Decimal("0.00")
    parciais: list[tuple[str, Decimal, bool]] = []

    repo = ProventoRepository(db)
    for p in posicoes:
        total_investido += p.valor_investido
        # Mesma janela/fonte do preço-teto (rendimentos pagos nos últimos 12m); aqui a
        # projeção usa a MÉDIA×12 (renda futura suavizada), não a soma trailing do Bazin.
        valores = repo.valores_rendimentos_pagos(p.fundo_id, inicio, hoje)
        if valores:
            media = sum(valores, Decimal("0")) / Decimal(len(valores))
            renda_fundo = _arredondar(media * Decimal(p.quantidade))
            sem_dados = False
        else:
            renda_fundo = Decimal("0.00")
            sem_dados = True
        renda_total += renda_fundo
        parciais.append((p.fundo.ticker, renda_fundo, sem_dados))

    parciais.sort(key=lambda t: t[1], reverse=True)  # "quem paga mais" primeiro
    por_fundo: list[FundoRenda] = [
        {
            "ticker": ticker,
            "renda_mensal": renda_fundo,
            "percentual": round(float(renda_fundo / renda_total), 4) if renda_total > 0 else 0.0,
            "sem_dados": sem_dados,
        }
        for ticker, renda_fundo, sem_dados in parciais
    ]

    renda_anual = _arredondar(renda_total * 12)
    yield_on_cost = round(float(renda_anual / total_investido), 4) if total_investido > 0 else None

    return {
        "renda_mensal": _arredondar(renda_total),
        "renda_anual": renda_anual,
        "yield_on_cost": yield_on_cost,
        "por_fundo": por_fundo,
    }
