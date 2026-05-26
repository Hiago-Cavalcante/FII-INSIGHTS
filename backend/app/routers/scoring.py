from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.scoring_service import ScoringService

router = APIRouter(tags=["scoring"])


class ScoringResultadoOut(BaseModel):
    calculados: int
    erros: int
    sem_dados: int


@router.post("/scoring/executar", response_model=ScoringResultadoOut)
def executar_scoring(db: Session = Depends(get_db)):
    """Executa o scoring multicritério para todos os FIIs com indicadores."""
    resultado = ScoringService(db).executar()
    return ScoringResultadoOut(**resultado)
