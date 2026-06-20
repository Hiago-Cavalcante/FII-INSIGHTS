from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.perfil import PerfilInvestidor
from app.models.usuario import Usuario
from app.utils.security import get_current_user

router = APIRouter(tags=["perfil"])


class PerfilOut(BaseModel):
    id: str
    tipo: str
    pesos_personalizados: dict[str, float] | None

    model_config = {"from_attributes": True}


class PerfilUpdate(BaseModel):
    tipo: str
    pesos_personalizados: dict[str, float] | None = None


def _get_ou_criar_perfil(db: Session, usuario_id: int) -> PerfilInvestidor:
    """Retorna o perfil do usuário, criando um default 'moderado' na primeira vez."""
    perfil = db.scalar(select(PerfilInvestidor).where(PerfilInvestidor.usuario_id == usuario_id))
    if not perfil:
        perfil = PerfilInvestidor(usuario_id=usuario_id, tipo="moderado")
        db.add(perfil)
        db.commit()
        db.refresh(perfil)
    return perfil


@router.get("/perfil", response_model=PerfilOut)
def get_perfil(
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PerfilOut:
    """Retorna o perfil do investidor autenticado."""
    return PerfilOut.model_validate(_get_ou_criar_perfil(db, usuario.id))


@router.put("/perfil", response_model=PerfilOut)
def update_perfil(
    body: PerfilUpdate,
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PerfilOut:
    """Atualiza tipo e pesos personalizados do perfil do usuário autenticado."""
    perfil = _get_ou_criar_perfil(db, usuario.id)
    perfil.tipo = body.tipo
    perfil.pesos_personalizados = body.pesos_personalizados
    db.commit()
    db.refresh(perfil)
    return PerfilOut.model_validate(perfil)
