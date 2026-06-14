from __future__ import annotations

from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
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
from app.services.dividendos_service import calcular_dividendos
from app.services.recomendacao_service import analisar_precos_teto, sugerir_rebalanceamento
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


class FundoRendaOut(BaseModel):
    ticker: str
    renda_mensal: Decimal
    percentual: float
    sem_dados: bool


class DividendosOut(BaseModel):
    renda_mensal: Decimal
    renda_anual: Decimal
    yield_on_cost: float | None
    por_fundo: list[FundoRendaOut]


class PrecoTetoOut(BaseModel):
    ticker: str
    nome: str | None
    classe: str
    preco_medio: Decimal
    preco_atual: Decimal | None
    preco_teto: Decimal | None
    margem_seguranca: float | None
    status: str


class ClasseRebalOut(BaseModel):
    classe: str
    atual_pct: float
    alvo_pct: float
    desvio_pct: float
    sugestao: str


class RebalanceamentoOut(BaseModel):
    total_investido: Decimal
    alvo_fii: float
    classes: list[ClasseRebalOut]


class RecomendacoesOut(BaseModel):
    precos_teto: list[PrecoTetoOut]
    rebalanceamento: RebalanceamentoOut


def _to_out(p: Posicao) -> PosicaoOut:
    return PosicaoOut(
        id=p.id,
        ticker=p.fundo.ticker,
        nome=p.fundo.nome,
        classe=p.fundo.classe,
        quantidade=p.quantidade,
        preco_medio=p.preco_medio,
        valor_investido=p.valor_investido,
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


@router.get("/dividendos", response_model=DividendosOut)
def dividendos(
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DividendosOut:
    """Projeção de renda mensal estimada da carteira (média 12m, só rendimentos)."""
    dados = calcular_dividendos(db, usuario.id)
    return DividendosOut(
        renda_mensal=dados["renda_mensal"],
        renda_anual=dados["renda_anual"],
        yield_on_cost=dados["yield_on_cost"],
        por_fundo=[FundoRendaOut(**f) for f in dados["por_fundo"]],
    )


@router.get("/recomendacoes", response_model=RecomendacoesOut)
def recomendacoes(
    yield_fii: float = Query(0.08, gt=0),
    yield_fiagro: float = Query(0.13, gt=0),
    alvo_fii: float = Query(0.80, ge=0, le=1),
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RecomendacoesOut:
    """Preço-teto (Bazin) dos fundos da carteira + rebalanceamento por classe (RF-27/29)."""
    precos = analisar_precos_teto(db, usuario.id, yield_fii, yield_fiagro)
    resumo_dados = resumo_carteira(db, usuario.id)
    rebal = sugerir_rebalanceamento(resumo_dados["por_classe"], resumo_dados["total_investido"], alvo_fii)
    return RecomendacoesOut(
        precos_teto=[PrecoTetoOut(**p) for p in precos],
        rebalanceamento=RebalanceamentoOut(
            total_investido=rebal["total_investido"],
            alvo_fii=rebal["alvo_fii"],
            classes=[ClasseRebalOut(**c) for c in rebal["classes"]],
        ),
    )


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
