from __future__ import annotations

from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.posicao import Posicao
from app.models.usuario import Usuario
from app.repositories.posicao_repository import PosicaoRepository
from app.services.carteira_service import (
    TickerNaoEncontrado,
    registrar_aporte,
    resumo_carteira,
)
from app.utils.security import get_current_user

router = APIRouter(prefix="/carteira", tags=["carteira"])


class AporteIn(BaseModel):
    ticker: str
    quantidade: int = Field(gt=0)
    preco: Decimal = Field(gt=0)


class PosicaoUpdate(BaseModel):
    quantidade: int = Field(gt=0)
    preco_medio: Decimal = Field(gt=0)


class PosicaoOut(BaseModel):
    id: int
    ticker: str
    nome: str | None
    classe: str
    quantidade: int
    preco_medio: Decimal
    valor_investido: Decimal


class ResumoOut(BaseModel):
    total_investido: Decimal
    por_classe: dict[str, Decimal]
    num_posicoes: int


def _to_out(p: Posicao) -> PosicaoOut:
    return PosicaoOut(
        id=p.id, ticker=p.fundo.ticker, nome=p.fundo.nome, classe=p.fundo.classe,
        quantidade=p.quantidade, preco_medio=p.preco_medio, valor_investido=p.valor_investido,
    )


@router.post("/posicoes", response_model=PosicaoOut, status_code=status.HTTP_201_CREATED)
def criar_posicao(
    body: AporteIn,
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PosicaoOut:
    """Registra um aporte (cria ou recalcula a média) no fundo informado."""
    try:
        posicao = registrar_aporte(db, usuario.id, body.ticker, body.quantidade, body.preco)
    except TickerNaoEncontrado:
        raise HTTPException(status_code=404, detail="Ticker não encontrado no catálogo") from None
    return _to_out(posicao)


@router.get("/posicoes", response_model=list[PosicaoOut])
def listar_posicoes(
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[PosicaoOut]:
    """Lista as posições do usuário autenticado."""
    return [_to_out(p) for p in PosicaoRepository(db).listar_por_usuario(usuario.id)]


@router.get("/resumo", response_model=ResumoOut)
def resumo(
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ResumoOut:
    """Posição consolidada do usuário (total + por classe)."""
    return ResumoOut(**resumo_carteira(db, usuario.id))


@router.put("/posicoes/{posicao_id}", response_model=PosicaoOut)
def editar_posicao(
    posicao_id: int,
    body: PosicaoUpdate,
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PosicaoOut:
    """Corrige quantidade e preço médio de uma posição do usuário."""
    repo = PosicaoRepository(db)
    posicao = repo.buscar(posicao_id, usuario.id)
    if posicao is None:
        raise HTTPException(status_code=404, detail="Posição não encontrada")
    posicao.quantidade = body.quantidade
    posicao.preco_medio = body.preco_medio
    posicao.valor_investido = (body.preco_medio * Decimal(body.quantidade)).quantize(Decimal("0.01"))
    return _to_out(repo.salvar(posicao))


@router.delete("/posicoes/{posicao_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def remover_posicao(
    posicao_id: int,
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """Remove uma posição do usuário."""
    repo = PosicaoRepository(db)
    posicao = repo.buscar(posicao_id, usuario.id)
    if posicao is None:
        raise HTTPException(status_code=404, detail="Posição não encontrada")
    repo.remover(posicao)
