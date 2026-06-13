from __future__ import annotations

import logging
from collections.abc import Callable
from datetime import datetime
from typing import Literal

from sqlalchemy.orm import Session

from app.models.fundo import Fundo
from app.models.indicador import Indicador
from app.models.scoring import ScoringHistorico
from app.repositories.fundo_repository import FundoRepository
from app.repositories.indicador_repository import IndicadorRepository

logger = logging.getLogger(__name__)

Classificacao = Literal["Excelente", "Bom", "Regular", "Evitar"]

PESOS_DEFAULT: dict[str, float] = {
    "dy_atual": 0.20,
    "dy_12m": 0.10,
    "p_vp": 0.15,
    "vacancia_fisica": 0.10,
    "vacancia_financeira": 0.10,
    "liquidez_diaria": 0.10,
    "volatilidade_12m": 0.10,
    "patrimonio_liquido": 0.05,
    "num_cotistas": 0.05,
    "segmento": 0.05,
}

# Presets canônicos por perfil (chaves = indicadores do modelo; soma = 1.0).
# moderado == PESOS_DEFAULT.
PESOS_POR_PERFIL: dict[str, dict[str, float]] = {
    "conservador": {
        "dy_atual": 0.10,
        "dy_12m": 0.15,
        "p_vp": 0.10,
        "vacancia_fisica": 0.15,
        "vacancia_financeira": 0.15,
        "liquidez_diaria": 0.10,
        "volatilidade_12m": 0.15,
        "patrimonio_liquido": 0.05,
        "num_cotistas": 0.05,
        "segmento": 0.00,
    },
    "moderado": PESOS_DEFAULT,
    "arrojado": {
        "dy_atual": 0.25,
        "dy_12m": 0.05,
        "p_vp": 0.20,
        "vacancia_fisica": 0.10,
        "vacancia_financeira": 0.05,
        "liquidez_diaria": 0.10,
        "volatilidade_12m": 0.05,
        "patrimonio_liquido": 0.05,
        "num_cotistas": 0.05,
        "segmento": 0.10,
    },
}

DIMENSOES_FII: dict[str, list[str]] = {
    "Rentabilidade": ["dy_atual", "dy_12m"],
    "Valuation": ["p_vp"],
    "Risco": ["vacancia_fisica", "vacancia_financeira", "liquidez_diaria", "volatilidade_12m"],
    "Estrutura": ["patrimonio_liquido", "num_cotistas", "segmento"],
}
DIMENSOES = DIMENSOES_FII  # compat: chamadas que não passam `dimensoes`

# Perfil FIAGRO (RF-14): FIAGRO de papel não tem vacância nem segmento de tijolo.
# A dimensão Risco se apoia em liquidez + volatilidade; renda (DY) pesa mais.
DIMENSOES_FIAGRO: dict[str, list[str]] = {
    "Rentabilidade": ["dy_atual", "dy_12m"],
    "Valuation": ["p_vp"],
    "Risco": ["liquidez_diaria", "volatilidade_12m"],
    "Estrutura": ["patrimonio_liquido", "num_cotistas"],
}

PESOS_FIAGRO: dict[str, float] = {
    "dy_atual": 0.25,
    "dy_12m": 0.15,
    "p_vp": 0.15,
    "liquidez_diaria": 0.15,
    "volatilidade_12m": 0.15,
    "patrimonio_liquido": 0.075,
    "num_cotistas": 0.075,
}


def pontuar_dy(valor: float) -> int:
    if valor <= 0.06:
        return 1
    if valor <= 0.08:
        return 3
    if valor <= 0.10:
        return 5
    if valor <= 0.12:
        return 4
    return 2


def pontuar_dy_fiagro(valor: float) -> int:
    """Faixa de DY do perfil FIAGRO (yield estruturalmente mais alto que FII de tijolo)."""
    if valor <= 0.08:
        return 1
    if valor <= 0.10:
        return 3
    if valor <= 0.13:
        return 5
    if valor <= 0.16:
        return 4
    return 2


# Faixa de DY aplicada por classe de ativo (RF-14).
FAIXA_DY: dict[str, Callable[[float], int]] = {
    "FII": pontuar_dy,
    "FIAGRO": pontuar_dy_fiagro,
}


def pontuar_pvp(valor: float) -> int:
    if valor < 0.80:
        return 5
    if valor < 0.95:
        return 4
    if valor < 1.05:
        return 3
    if valor < 1.20:
        return 2
    return 1


def pontuar_vacancia(valor: float) -> int:
    if valor < 0.05:
        return 5
    if valor < 0.10:
        return 4
    if valor < 0.15:
        return 3
    if valor < 0.25:
        return 2
    return 1


def pontuar_liquidez(valor: float) -> int:
    if valor < 100_000:
        return 1
    if valor < 500_000:
        return 2
    if valor < 1_000_000:
        return 3
    if valor < 5_000_000:
        return 4
    return 5


def pontuar_volatilidade(valor: float) -> int:
    if valor < 0.10:
        return 5
    if valor < 0.15:
        return 4
    if valor < 0.20:
        return 3
    if valor < 0.30:
        return 2
    return 1


def pontuar_percentil(valor: float, todos: list[float]) -> int:
    if not todos:
        return 3
    ordenados = sorted(todos)
    n = len(ordenados)
    rank = sum(1 for v in ordenados if v <= valor) / n
    if rank <= 0.20:
        return 1
    if rank <= 0.40:
        return 2
    if rank <= 0.60:
        return 3
    if rank <= 0.80:
        return 4
    return 5


_SEGMENTO_SCORES: dict[str, int] = {
    "Logística": 5,
    "Lajes Corporativas": 4,
    "Shopping": 4,
    "Renda Urbana": 3,
    "Híbrido": 3,
    "Fundo de Fundos": 2,
    "Recebíveis": 2,
}


def pontuar_segmento(segmento: str | None) -> int | None:
    if segmento is None:
        return None
    return _SEGMENTO_SCORES.get(segmento, 3)


def classificar_score(score: float) -> Classificacao:
    if score >= 80:
        return "Excelente"
    if score >= 60:
        return "Bom"
    if score >= 40:
        return "Regular"
    return "Evitar"


def calcular_pontuacoes(
    ind: Indicador,
    fundo: Fundo,
    todos_pl: list[float],
    todos_cotistas: list[float],
) -> dict[str, float | None]:
    p: dict[str, float | None] = {}
    faixa_dy = FAIXA_DY.get(fundo.classe, pontuar_dy)
    p["dy_atual"] = float(faixa_dy(ind.dy_atual)) if ind.dy_atual is not None else None
    p["dy_12m"] = float(faixa_dy(ind.dy_12m)) if ind.dy_12m is not None else None
    p["p_vp"] = float(pontuar_pvp(ind.p_vp)) if ind.p_vp is not None else None
    p["vacancia_fisica"] = float(pontuar_vacancia(ind.vacancia_fisica)) if ind.vacancia_fisica is not None else None
    p["vacancia_financeira"] = (
        float(pontuar_vacancia(ind.vacancia_financeira)) if ind.vacancia_financeira is not None else None
    )
    p["liquidez_diaria"] = float(pontuar_liquidez(ind.liquidez_diaria)) if ind.liquidez_diaria is not None else None
    p["volatilidade_12m"] = (
        float(pontuar_volatilidade(ind.volatilidade_12m)) if ind.volatilidade_12m is not None else None
    )
    p["patrimonio_liquido"] = (
        float(pontuar_percentil(ind.patrimonio_liquido, todos_pl)) if ind.patrimonio_liquido is not None else None
    )
    p["num_cotistas"] = (
        float(pontuar_percentil(float(ind.num_cotistas), todos_cotistas)) if ind.num_cotistas is not None else None
    )
    p["segmento"] = float(v) if (v := pontuar_segmento(fundo.segmento)) is not None else None
    return p


def resolver_perfil(
    classe: str, pesos_fii: dict[str, float]
) -> tuple[dict[str, float], dict[str, list[str]]]:
    """Devolve o par (pesos, dimensoes) conforme a classe do fundo (RF-14).

    FII usa os pesos recebidos (perfil de risco do usuário); FIAGRO usa o perfil base único.
    """
    if classe == "FIAGRO":
        return PESOS_FIAGRO, DIMENSOES_FIAGRO
    return pesos_fii, DIMENSOES_FII


def calcular_score_com_pesos(
    pontuacoes: dict[str, float | None],
    pesos: dict[str, float],
    dimensoes: dict[str, list[str]] = DIMENSOES_FII,
) -> float:
    """Score 0-100 com redistribuição proporcional dentro de cada dimensão."""
    pesos_efetivos: dict[str, float] = {}

    for indicadores_dim in dimensoes.values():
        presentes = [k for k in indicadores_dim if pontuacoes.get(k) is not None]
        if not presentes:
            continue
        peso_dim = sum(pesos[k] for k in indicadores_dim)
        peso_presente = sum(pesos[k] for k in presentes)
        if peso_presente == 0:
            # Os únicos indicadores presentes têm peso 0: a dimensão não contribui.
            continue
        for k in presentes:
            pesos_efetivos[k] = pesos[k] * (peso_dim / peso_presente)

    if not pesos_efetivos:
        return 0.0

    peso_total = sum(pesos_efetivos.values())
    total = 0.0
    for k in pesos_efetivos:
        pts = pontuacoes[k]
        assert pts is not None  # garantido pela construção de pesos_efetivos
        total += (pesos_efetivos[k] / peso_total) * (pts / 5.0) * 100
    return round(total, 2)


class ScoringService:
    def __init__(self, db: Session, pesos: dict[str, float] | None = None) -> None:
        self._db = db
        self._pesos = pesos or PESOS_DEFAULT
        self._fundos_repo = FundoRepository(db)
        self._ind_repo = IndicadorRepository(db)

    def executar(self) -> dict[str, int]:
        fundos = self._fundos_repo.listar_todos()
        indicadores_recentes = self._ind_repo.listar_mais_recentes_todos()
        ind_por_fundo: dict[int, Indicador] = {i.fundo_id: i for i in indicadores_recentes}

        todos_pl = [i.patrimonio_liquido for i in indicadores_recentes if i.patrimonio_liquido is not None]
        todos_cotistas = [float(i.num_cotistas) for i in indicadores_recentes if i.num_cotistas is not None]

        calculados = erros = sem_dados = 0
        agora = datetime.now()

        for fundo in fundos:
            ind = ind_por_fundo.get(fundo.id)
            if ind is None:
                sem_dados += 1
                continue
            try:
                pontuacoes = calcular_pontuacoes(ind, fundo, todos_pl, todos_cotistas)
                score = calcular_score_com_pesos(pontuacoes, self._pesos)
                classificacao = classificar_score(score)
                sh = ScoringHistorico(
                    fundo_id=fundo.id,
                    data_execucao=agora,
                    score=score,
                    classificacao=classificacao,
                )
                self._db.add(sh)
                calculados += 1
                logger.info("%s → %.1f (%s)", fundo.ticker, score, classificacao)
            except Exception as e:
                erros += 1
                logger.error("Erro no scoring de %s: %s", fundo.ticker, e)

        self._db.commit()
        return {"calculados": calculados, "erros": erros, "sem_dados": sem_dados}
