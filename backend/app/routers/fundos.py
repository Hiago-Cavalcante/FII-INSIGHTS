from __future__ import annotations

from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.repositories.fundo_repository import FundoRepository
from app.repositories.indicador_repository import IndicadorRepository
from app.repositories.provento_repository import ProventoRepository

router = APIRouter(tags=["fundos"])


class IndicadorOut(BaseModel):
    dy_atual: float | None
    dy_12m: float | None
    p_vp: float | None
    vacancia_fisica: float | None
    vacancia_financeira: float | None
    liquidez_diaria: float | None
    volatilidade_12m: float | None
    patrimonio_liquido: float | None
    num_cotistas: int | None

    model_config = {"from_attributes": True}


class FundoOut(BaseModel):
    id: int
    ticker: str
    nome: str | None
    segmento: str | None
    gestora: str | None

    model_config = {"from_attributes": True}


class FundoDetalheOut(FundoOut):
    indicador: IndicadorOut | None


@router.get("/fundos", response_model=list[FundoOut])
def listar_fundos(db: Session = Depends(get_db)) -> list[FundoOut]:
    """Lista todos os FIIs cadastrados."""
    return [FundoOut.model_validate(f) for f in FundoRepository(db).listar_todos()]


class ProventoOut(BaseModel):
    data_com: date
    data_pagamento: date | None
    valor_por_cota: Decimal
    tipo: str

    model_config = {"from_attributes": True}


@router.get("/fundos/{ticker}", response_model=FundoDetalheOut)
def detalhe_fundo(ticker: str, db: Session = Depends(get_db)) -> FundoDetalheOut:
    """Retorna dados detalhados de um FII pelo ticker."""
    fundo = FundoRepository(db).buscar_por_ticker(ticker.upper())
    if not fundo:
        raise HTTPException(status_code=404, detail=f"Fundo {ticker} não encontrado")
    ind = IndicadorRepository(db).buscar_mais_recente(fundo.id)
    return FundoDetalheOut(
        **FundoOut.model_validate(fundo).model_dump(),
        indicador=IndicadorOut.model_validate(ind) if ind else None,
    )


@router.get("/fundos/{ticker}/proventos", response_model=list[ProventoOut])
def proventos_do_fundo(ticker: str, db: Session = Depends(get_db)) -> list[ProventoOut]:
    """Histórico de proventos de um fundo (mais recentes primeiro)."""
    fundo = FundoRepository(db).buscar_por_ticker(ticker.upper())
    if not fundo:
        raise HTTPException(status_code=404, detail=f"Fundo {ticker} não encontrado")
    return [ProventoOut.model_validate(p) for p in ProventoRepository(db).listar_por_fundo(fundo.id)]
