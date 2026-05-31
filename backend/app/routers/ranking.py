from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.ranking_service import montar_ranking
from app.services.scoring_service import PESOS_POR_PERFIL

router = APIRouter(tags=["ranking"])


class RankingItemOut(BaseModel):
    ticker: str
    nome: str | None
    segmento: str | None
    score: float
    classificacao: str
    dy_atual: float | None
    dy_12m: float | None
    p_vp: float | None
    vacancia_fisica: float | None
    vacancia_financeira: float | None
    liquidez_diaria: float | None
    volatilidade_12m: float | None
    patrimonio_liquido: float | None
    num_cotistas: float | None

    model_config = {"from_attributes": True}


@router.get("/ranking", response_model=list[RankingItemOut])
def listar_ranking(
    perfil: str = Query("moderado", description="conservador | moderado | arrojado"),
    db: Session = Depends(get_db),
) -> list[RankingItemOut]:
    """Ranking calculado sob demanda com os pesos canônicos do perfil."""
    pesos = PESOS_POR_PERFIL.get(perfil)
    if pesos is None:
        raise HTTPException(status_code=422, detail=f"Perfil inválido: {perfil}")
    return [RankingItemOut.model_validate(i) for i in montar_ranking(db, pesos)]
