from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.perfil import PerfilInvestidor

router = APIRouter(tags=["perfil"])

_PERFIL_ID = "perfil-unico"


class PerfilOut(BaseModel):
    id: str
    tipo: str
    pesos_personalizados: dict[str, float] | None

    model_config = {"from_attributes": True}


class PerfilUpdate(BaseModel):
    tipo: str
    pesos_personalizados: dict[str, float] | None = None


def _get_ou_criar_perfil(db: Session) -> PerfilInvestidor:
    perfil = db.scalar(select(PerfilInvestidor).where(PerfilInvestidor.id == _PERFIL_ID))
    if not perfil:
        perfil = PerfilInvestidor(id=_PERFIL_ID, tipo="moderado")
        db.add(perfil)
        db.commit()
        db.refresh(perfil)
    return perfil


@router.get("/perfil", response_model=PerfilOut)
def get_perfil(db: Session = Depends(get_db)) -> PerfilOut:
    """Retorna o perfil do investidor."""
    return PerfilOut.model_validate(_get_ou_criar_perfil(db))


@router.put("/perfil", response_model=PerfilOut)
def update_perfil(body: PerfilUpdate, db: Session = Depends(get_db)) -> PerfilOut:
    """Atualiza tipo e pesos personalizados do perfil."""
    perfil = _get_ou_criar_perfil(db)
    perfil.tipo = body.tipo
    perfil.pesos_personalizados = body.pesos_personalizados
    db.commit()
    db.refresh(perfil)
    return PerfilOut.model_validate(perfil)
