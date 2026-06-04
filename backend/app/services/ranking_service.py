from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.models.indicador import Indicador
from app.repositories.indicador_repository import IndicadorRepository
from app.services.scoring_service import (
    Classificacao,
    calcular_pontuacoes,
    calcular_score_com_pesos,
    classificar_score,
)

_MILHAO = 1_000_000  # liquidez_diaria: R$ -> R$ milhões
_BILHAO = 1_000_000_000  # patrimonio_liquido: R$ -> R$ bilhões
_MILHAR = 1_000  # num_cotistas: unidades -> milhares


@dataclass
class RankingItem:
    ticker: str
    nome: str | None
    segmento: str | None
    score: float
    classificacao: Classificacao
    # Indicadores em unidade de display:
    dy_atual: float | None
    dy_12m: float | None
    p_vp: float | None
    vacancia_fisica: float | None
    vacancia_financeira: float | None
    liquidez_diaria: float | None
    volatilidade_12m: float | None
    patrimonio_liquido: float | None
    num_cotistas: float | None


def _pct(valor: float | None) -> float | None:
    """Fração -> percentual (0.10 -> 10.0)."""
    return round(valor * 100, 2) if valor is not None else None


def _converter_display(ind: Indicador) -> dict[str, float | None]:
    """Converte os valores crus do banco para unidades de exibição."""
    return {
        "dy_atual": _pct(ind.dy_atual),
        "dy_12m": _pct(ind.dy_12m),
        "p_vp": round(ind.p_vp, 2) if ind.p_vp is not None else None,
        "vacancia_fisica": _pct(ind.vacancia_fisica),
        "vacancia_financeira": _pct(ind.vacancia_financeira),
        "liquidez_diaria": round(ind.liquidez_diaria / _MILHAO, 2) if ind.liquidez_diaria is not None else None,
        "volatilidade_12m": _pct(ind.volatilidade_12m),
        "patrimonio_liquido": round(ind.patrimonio_liquido / _BILHAO, 2)
        if ind.patrimonio_liquido is not None
        else None,
        "num_cotistas": round(ind.num_cotistas / _MILHAR, 1) if ind.num_cotistas is not None else None,
    }


def montar_ranking(db: Session, pesos: dict[str, float]) -> list[RankingItem]:
    """Pontua a coorte inteira com os pesos dados e devolve em memória, sem persistir.

    O scoring de PL e nº de cotistas usa percentil sobre toda a coorte, por isso
    o cálculo precisa enxergar todos os fundos de uma vez.
    """
    indicadores = IndicadorRepository(db).buscar_todos_mais_recentes()
    todos_pl = [i.patrimonio_liquido for i in indicadores if i.patrimonio_liquido is not None]
    todos_cotistas = [float(i.num_cotistas) for i in indicadores if i.num_cotistas is not None]

    itens: list[RankingItem] = []
    for ind in indicadores:
        fundo = ind.fundo
        pontuacoes = calcular_pontuacoes(ind, fundo, todos_pl, todos_cotistas)
        score = calcular_score_com_pesos(pontuacoes, pesos)
        itens.append(
            RankingItem(
                ticker=fundo.ticker,
                nome=fundo.nome,
                segmento=fundo.segmento,
                score=score,
                classificacao=classificar_score(score),
                **_converter_display(ind),
            )
        )

    itens.sort(key=lambda i: i.score, reverse=True)
    return itens
