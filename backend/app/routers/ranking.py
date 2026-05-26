from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.fundo import Fundo
from app.models.scoring import ScoringHistorico

router = APIRouter(tags=["ranking"])


class RankingItemOut(BaseModel):
    ticker: str
    nome: str | None
    segmento: str | None
    score: float
    classificacao: str

    model_config = {"from_attributes": True}


@router.get("/ranking", response_model=list[RankingItemOut])
def listar_ranking(
    busca: str | None = Query(None, description="Filtrar por ticker"),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> list[RankingItemOut]:
    """Retorna FIIs ordenados por score decrescente (mais recente por fundo)."""
    subq = (
        select(ScoringHistorico.fundo_id, func.max(ScoringHistorico.data_execucao).label("max_dt"))
        .group_by(ScoringHistorico.fundo_id)
        .subquery()
    )
    stmt = (
        select(Fundo.ticker, Fundo.nome, Fundo.segmento, ScoringHistorico.score, ScoringHistorico.classificacao)
        .join(ScoringHistorico, Fundo.id == ScoringHistorico.fundo_id)
        .join(subq, (ScoringHistorico.fundo_id == subq.c.fundo_id) & (ScoringHistorico.data_execucao == subq.c.max_dt))
        .order_by(ScoringHistorico.score.desc())
        .offset(offset)
        .limit(limit)
    )
    if busca:
        stmt = stmt.where(Fundo.ticker.ilike(f"%{busca}%"))

    rows = db.execute(stmt).mappings().all()
    return [RankingItemOut(**row) for row in rows]
