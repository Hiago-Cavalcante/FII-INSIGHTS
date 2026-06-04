from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.fundo import Fundo
from app.models.indicador import Indicador
from app.models.scoring import ScoringHistorico

router = APIRouter(tags=["dashboard"])


class DashboardStatsOut(BaseModel):
    total_fundos: int
    com_dados: int
    score_medio: float | None
    por_classificacao: dict[str, int]
    dy_medio: float | None
    p_vp_medio: float | None


@router.get("/dashboard/stats", response_model=DashboardStatsOut)
def dashboard_stats(db: Session = Depends(get_db)) -> DashboardStatsOut:
    """Estatísticas agregadas para o dashboard."""
    total_fundos = db.scalar(select(func.count()).select_from(Fundo)) or 0

    com_dados = db.scalar(select(func.count(func.distinct(Indicador.fundo_id))).select_from(Indicador)) or 0

    subq = (
        select(ScoringHistorico.fundo_id, func.max(ScoringHistorico.data_execucao).label("max_dt"))
        .group_by(ScoringHistorico.fundo_id)
        .subquery()
    )
    scores_recentes = db.execute(
        select(ScoringHistorico.score, ScoringHistorico.classificacao).join(
            subq, (ScoringHistorico.fundo_id == subq.c.fundo_id) & (ScoringHistorico.data_execucao == subq.c.max_dt)
        )
    ).all()

    score_medio = None
    por_classificacao: dict[str, int] = {"Excelente": 0, "Bom": 0, "Regular": 0, "Evitar": 0}
    if scores_recentes:
        score_medio = round(sum(r.score for r in scores_recentes) / len(scores_recentes), 2)
        for r in scores_recentes:
            por_classificacao[r.classificacao] = por_classificacao.get(r.classificacao, 0) + 1

    row = db.execute(select(func.avg(Indicador.dy_12m), func.avg(Indicador.p_vp)).select_from(Indicador)).one()
    dy_medio = round(float(row[0]), 4) if row[0] else None
    p_vp_medio = round(float(row[1]), 4) if row[1] else None

    return DashboardStatsOut(
        total_fundos=total_fundos,
        com_dados=com_dados,
        score_medio=score_medio,
        por_classificacao=por_classificacao,
        dy_medio=dy_medio,
        p_vp_medio=p_vp_medio,
    )
