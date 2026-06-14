"""Recomendações determinísticas sobre a carteira (RF-27, RF-29).

Preço-teto pelo método Bazin (proventos anuais ÷ yield-alvo) e sugestão de
rebalanceamento por alocação-alvo de classe (FII × FIAGRO). Tudo explicável e
ancorado nos dados do sistema (RNF-04) — o assistente (RF-38) apenas traduz.
"""

from __future__ import annotations

from datetime import date, timedelta
from decimal import ROUND_HALF_UP, Decimal
from typing import TypedDict

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.provento import Provento
from app.repositories.indicador_repository import IndicadorRepository
from app.repositories.posicao_repository import PosicaoRepository

_CENTAVO = Decimal("0.01")

YIELD_FII_DEFAULT = 0.08
YIELD_FIAGRO_DEFAULT = 0.13
ALVO_FII_DEFAULT = 0.80
BANDA = 0.05  # tolerância de ±5pp no rebalanceamento


class PrecoTetoItem(TypedDict):
    ticker: str
    nome: str | None
    classe: str
    preco_medio: Decimal
    preco_atual: Decimal | None
    preco_teto: Decimal | None
    margem_seguranca: float | None
    status: str


class ClasseRebal(TypedDict):
    classe: str
    atual_pct: float
    alvo_pct: float
    desvio_pct: float
    sugestao: str


class Rebalanceamento(TypedDict):
    total_investido: Decimal
    alvo_fii: float
    classes: list[ClasseRebal]


def calcular_preco_teto(proventos_12m: Decimal | None, yield_alvo: float) -> Decimal | None:
    """Preço-teto de Bazin: proventos anuais ÷ yield-alvo. None se faltar dado."""
    if proventos_12m is None or proventos_12m <= 0 or yield_alvo <= 0:
        return None
    return (proventos_12m / Decimal(str(yield_alvo))).quantize(_CENTAVO, rounding=ROUND_HALF_UP)


def proventos_ultimos_12m(db: Session, fundo_id: int, hoje: date | None = None) -> Decimal:
    """Soma o valor_por_cota dos rendimentos PAGOS nos últimos 12 meses."""
    hoje = hoje or date.today()
    inicio = hoje - timedelta(days=365)
    valores = db.scalars(
        select(Provento.valor_por_cota).where(
            Provento.fundo_id == fundo_id,
            Provento.tipo == "rendimento",
            Provento.data_pagamento.is_not(None),
            Provento.data_pagamento >= inicio,
            Provento.data_pagamento <= hoje,
        )
    )
    return sum(valores, Decimal("0"))


def analisar_precos_teto(
    db: Session,
    usuario_id: int,
    yield_fii: float = YIELD_FII_DEFAULT,
    yield_fiagro: float = YIELD_FIAGRO_DEFAULT,
) -> list[PrecoTetoItem]:
    """Preço-teto (Bazin) por posição da carteira, com yield-alvo por classe."""
    ind_repo = IndicadorRepository(db)
    itens: list[PrecoTetoItem] = []
    for p in PosicaoRepository(db).listar_por_usuario(usuario_id):
        classe = p.fundo.classe
        yield_alvo = yield_fiagro if classe == "FIAGRO" else yield_fii
        teto = calcular_preco_teto(proventos_ultimos_12m(db, p.fundo_id), yield_alvo)
        ind = ind_repo.buscar_mais_recente(p.fundo_id)
        preco_atual = (
            Decimal(str(ind.preco_atual)).quantize(_CENTAVO)
            if ind is not None and ind.preco_atual is not None
            else None
        )
        if teto is None or preco_atual is None:
            margem: float | None = None
            status = "Sem dados"
        else:
            margem = round(float((teto - preco_atual) / preco_atual), 4)
            status = "Abaixo do teto" if preco_atual <= teto else "Acima do teto"
        itens.append(
            {
                "ticker": p.fundo.ticker,
                "nome": p.fundo.nome,
                "classe": classe,
                "preco_medio": p.preco_medio,
                "preco_atual": preco_atual,
                "preco_teto": teto,
                "margem_seguranca": margem,
                "status": status,
            }
        )
    return itens


def sugerir_rebalanceamento(
    por_classe: dict[str, Decimal],
    total: Decimal,
    alvo_fii: float = ALVO_FII_DEFAULT,
) -> Rebalanceamento:
    """Compara a alocação atual por classe com o alvo e sugere a direção do aporte."""
    if total <= 0:
        return {"total_investido": Decimal("0"), "alvo_fii": alvo_fii, "classes": []}

    alvos = {"FII": alvo_fii, "FIAGRO": round(1.0 - alvo_fii, 4)}
    classes: list[ClasseRebal] = []
    for classe, alvo in alvos.items():
        atual = round(float(por_classe.get(classe, Decimal("0")) / total), 4)
        desvio = round(atual - alvo, 4)
        if desvio < -BANDA:
            sugestao = "Aportar mais"
        elif desvio > BANDA:
            sugestao = "Reduzir ritmo"
        else:
            sugestao = "Equilibrado"
        classes.append(
            {
                "classe": classe,
                "atual_pct": atual,
                "alvo_pct": alvo,
                "desvio_pct": desvio,
                "sugestao": sugestao,
            }
        )
    return {"total_investido": total, "alvo_fii": alvo_fii, "classes": classes}
