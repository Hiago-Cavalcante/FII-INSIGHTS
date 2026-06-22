from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.usuario import Usuario
from app.services.assistente_llm import AssistenteIndisponivel, AssistenteLLM, GeminiClient
from app.services.assistente_service import FundoNaoEncontrado, responder
from app.utils.rate_limit import limiter, usuario_key_func
from app.utils.security import get_current_user

router = APIRouter(prefix="/assistente", tags=["assistente"])


def get_llm() -> AssistenteLLM:
    """Provedor de LLM injetável (sobrescrito por um fake nos testes)."""
    return GeminiClient(api_key=settings.gemini_api_key, model=settings.gemini_model)


class ExplicarIn(BaseModel):
    ticker: str
    pergunta: str = Field(min_length=1, max_length=500)
    nivel: Literal["iniciante", "analitico"] = "iniciante"


class FundoResumoOut(BaseModel):
    ticker: str
    score: float | None
    classificacao: str


class ExplicarOut(BaseModel):
    resposta: str
    fundo: FundoResumoOut


@router.post("/explicar", response_model=ExplicarOut)
@limiter.limit("5/minute;20/day", key_func=usuario_key_func)
def explicar(
    request: Request,
    body: ExplicarIn,
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
    llm: AssistenteLLM = Depends(get_llm),
) -> ExplicarOut:
    """Explica, em linguagem simples e ancorada nos dados, o scoring de um fundo (RF-38)."""
    try:
        out = responder(db, body.ticker, body.pergunta, body.nivel, llm)
    except FundoNaoEncontrado:
        raise HTTPException(status_code=404, detail="Fundo não encontrado") from None
    except AssistenteIndisponivel:
        raise HTTPException(status_code=503, detail="Assistente indisponível no momento") from None
    fundo = out["fundo"]
    return ExplicarOut(
        resposta=out["resposta"],
        fundo=FundoResumoOut(
            ticker=fundo["ticker"],
            score=fundo["score"],
            classificacao=fundo["classificacao"],
        ),
    )
