from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, model_validator
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
    classificacao: Literal["Excelente", "Bom", "Regular", "Evitar"]
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


class PesosIn(BaseModel):
    dy_atual: float
    dy_12m: float
    p_vp: float
    vacancia_fisica: float
    vacancia_financeira: float
    liquidez_diaria: float
    volatilidade_12m: float
    patrimonio_liquido: float
    num_cotistas: float
    segmento: float

    @model_validator(mode="after")
    def _soma_um(self) -> PesosIn:
        soma = sum(self.model_dump().values())
        # tolerância de 1 ponto percentual para arredondamentos de ponto flutuante
        if abs(soma - 1.0) > 0.01:
            raise ValueError(f"A soma dos pesos deve ser 1.0 (atual: {soma:.2f})")
        return self


class SimularIn(BaseModel):
    pesos: PesosIn


@router.get("/ranking", response_model=list[RankingItemOut])
def listar_ranking(
    perfil: Literal["conservador", "moderado", "arrojado"] = Query("moderado"),
    db: Session = Depends(get_db),
) -> list[RankingItemOut]:
    """Ranking calculado sob demanda com os pesos canônicos do perfil."""
    return [RankingItemOut.model_validate(i) for i in montar_ranking(db, PESOS_POR_PERFIL[perfil])]


@router.post("/ranking/simular", response_model=list[RankingItemOut])
def simular_ranking(body: SimularIn, db: Session = Depends(get_db)) -> list[RankingItemOut]:
    """Ranking calculado sob demanda com pesos customizados (soma = 1.0)."""
    return [RankingItemOut.model_validate(i) for i in montar_ranking(db, body.pesos.model_dump())]
