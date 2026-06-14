"""Assistente explicável (RF-38/39/40): monta o grounding factual do scoring de um
fundo e pede ao LLM para reescrevê-lo em linguagem simples — sem inventar nada (RNF-04).
"""

from __future__ import annotations

from typing import Literal, TypedDict

from sqlalchemy.orm import Session

from app.repositories.fundo_repository import FundoRepository
from app.repositories.indicador_repository import IndicadorRepository
from app.services.assistente_llm import AssistenteLLM
from app.services.scoring_service import (
    PESOS_DEFAULT,
    ContribIndicador,
    calcular_pontuacoes,
    calcular_score_com_pesos,
    classificar_score,
    detalhar_score,
    resolver_perfil,
)

Nivel = Literal["iniciante", "analitico"]


class FundoNaoEncontrado(Exception):
    """Ticker não existe no catálogo."""


class ContextoFundo(TypedDict):
    ticker: str
    nome: str | None
    classe: str
    segmento: str | None
    score: float
    classificacao: str
    indicadores: list[ContribIndicador]


class RespostaAssistente(TypedDict):
    resposta: str
    fundo: dict[str, object]


def montar_contexto_fundo(db: Session, ticker: str, nivel: Nivel) -> ContextoFundo:
    """Decomposição factual do score de um fundo — o único insumo que o LLM verá."""
    fundo = FundoRepository(db).buscar_por_ticker(ticker.upper())
    if fundo is None:
        raise FundoNaoEncontrado(ticker)

    indicadores = IndicadorRepository(db).buscar_todos_mais_recentes()
    todos_pl = [i.patrimonio_liquido for i in indicadores if i.patrimonio_liquido is not None]
    todos_cot = [float(i.num_cotistas) for i in indicadores if i.num_cotistas is not None]
    ind = next((i for i in indicadores if i.fundo_id == fundo.id), None)

    pesos, dimensoes = resolver_perfil(fundo.classe, PESOS_DEFAULT)
    if ind is None:
        score: float = 0.0
        detalhes: list[ContribIndicador] = []
    else:
        pont = calcular_pontuacoes(ind, fundo, todos_pl, todos_cot)
        score = calcular_score_com_pesos(pont, pesos, dimensoes)
        detalhes = detalhar_score(pont, pesos, dimensoes)

    return {
        "ticker": fundo.ticker,
        "nome": fundo.nome,
        "classe": fundo.classe,
        "segmento": fundo.segmento,
        "score": score,
        "classificacao": classificar_score(score),
        "indicadores": detalhes,
    }


def _system_prompt(nivel: Nivel) -> str:
    tom = (
        "sem jargão, com analogias simples do dia a dia"
        if nivel == "iniciante"
        else "pode usar termos técnicos e mostrar os números"
    )
    return (
        "Você é um assistente que EXPLICA o scoring JÁ CALCULADO de um fundo imobiliário. "
        "Use SOMENTE os números fornecidos no contexto. NÃO invente valores, NÃO faça análise "
        "nova e NÃO recomende compra ou venda. Se a pergunta fugir do escopo dos dados do fundo, "
        "diga que você só explica o scoring deste fundo. "
        f"Nível do leitor: {nivel} — escreva {tom}."
    )


def _formatar_contexto(ctx: ContextoFundo) -> str:
    linhas = [
        f"Fundo: {ctx['ticker']} ({ctx['nome']}) — classe {ctx['classe']}, segmento {ctx['segmento']}.",
        f"Score: {ctx['score']:.1f}/100 → classificação {ctx['classificacao']}.",
        "Contribuição de cada indicador (pontuação 1-5, peso, pontos que adiciona ao score):",
    ]
    for i in ctx["indicadores"]:
        linhas.append(
            f"- {i['indicador']}: nota {i['pontuacao']:.0f}/5, peso {i['peso_efetivo'] * 100:.0f}%, "
            f"contribui {i['contribuicao']:.1f} pontos."
        )
    if not ctx["indicadores"]:
        linhas.append("- (sem indicadores disponíveis para este fundo)")
    return "\n".join(linhas)


def responder(
    db: Session,
    ticker: str,
    pergunta: str,
    nivel: Nivel,
    llm: AssistenteLLM,
) -> RespostaAssistente:
    """Responde à pergunta do investidor sobre um fundo, ancorado no grounding factual."""
    ctx = montar_contexto_fundo(db, ticker, nivel)
    system = _system_prompt(nivel)
    prompt = f"{_formatar_contexto(ctx)}\n\nPergunta do investidor: {pergunta}"
    resposta = llm.gerar(system, prompt)
    return {
        "resposta": resposta,
        "fundo": {
            "ticker": ctx["ticker"],
            "score": ctx["score"],
            "classificacao": ctx["classificacao"],
        },
    }
