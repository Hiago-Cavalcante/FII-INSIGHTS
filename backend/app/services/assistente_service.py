"""Assistente explicável (RF-38/39/40): monta o grounding factual do scoring de um
fundo e pede ao LLM para reescrevê-lo em linguagem simples — sem inventar nada (RNF-04).
"""

from __future__ import annotations

import re
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

_TICKER_RE = re.compile(r"\b[a-zA-Z]{4}11\b")


def extrair_tickers(texto: str) -> list[str]:
    """Tickers de FII (4 letras + 11) citados no texto, em maiúsculas, sem duplicar."""
    vistos: list[str] = []
    for achado in _TICKER_RE.findall(texto):
        tk = achado.upper()
        if tk not in vistos:
            vistos.append(tk)
    return vistos


Nivel = Literal["iniciante", "analitico"]


class FundoNaoEncontrado(Exception):
    """Ticker não existe no catálogo."""


class ContextoFundo(TypedDict):
    ticker: str
    nome: str | None
    classe: str
    segmento: str | None
    score: float | None  # None => fundo sem indicadores calculados (não há score)
    classificacao: str  # "Sem dados" quando score is None
    indicadores: list[ContribIndicador]


class FundoResumo(TypedDict):
    ticker: str
    score: float | None
    classificacao: str


class RespostaAssistente(TypedDict):
    resposta: str
    fundo: FundoResumo


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
        # Sem indicadores coletados: NÃO inventar score/classificação (RNF-04).
        score: float | None = None
        classificacao = "Sem dados"
        detalhes: list[ContribIndicador] = []
    else:
        pont = calcular_pontuacoes(ind, fundo, todos_pl, todos_cot)
        valor = calcular_score_com_pesos(pont, pesos, dimensoes)
        score = valor
        classificacao = classificar_score(valor)
        detalhes = detalhar_score(pont, pesos, dimensoes)

    return {
        "ticker": fundo.ticker,
        "nome": fundo.nome,
        "classe": fundo.classe,
        "segmento": fundo.segmento,
        "score": score,
        "classificacao": classificacao,
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
    nome = ctx["nome"] or "sem nome cadastrado"
    segmento = ctx["segmento"] or "segmento não informado"
    cabecalho = f"Fundo: {ctx['ticker']} ({nome}) — classe {ctx['classe']}, segmento {segmento}."
    if ctx["score"] is None or not ctx["indicadores"]:
        # Sem dados: não há score para explicar. Não inventar nota nem classificação.
        return (
            f"{cabecalho}\n"
            "Este fundo ainda não tem indicadores coletados, então não há score calculado "
            "para explicar. Informe isso ao investidor com transparência."
        )
    linhas = [
        cabecalho,
        f"Score: {ctx['score']:.1f}/100 → classificação {ctx['classificacao']}.",
        "Contribuição de cada indicador (pontuação 1-5, peso, pontos que adiciona ao score):",
    ]
    for i in ctx["indicadores"]:
        linhas.append(
            f"- {i['indicador']}: nota {i['pontuacao']:.0f}/5, peso {i['peso_efetivo'] * 100:.0f}%, "
            f"contribui {i['contribuicao']:.1f} pontos."
        )
    return "\n".join(linhas)


from app.services.glossario import BLURB_PLATAFORMA, texto_glossario


def montar_contexto_chat(db: Session, mensagem: str, max_fundos: int = 2) -> str:
    """Grounding do chat: plataforma + glossário + fundos citados (decomposição do score)."""
    partes = [BLURB_PLATAFORMA, texto_glossario()]
    for ticker in extrair_tickers(mensagem)[:max_fundos]:
        try:
            ctx = montar_contexto_fundo(db, ticker, "iniciante")
        except FundoNaoEncontrado:
            continue
        partes.append(_formatar_contexto(ctx))
    return "\n\n".join(partes)


def _system_prompt_chat(nivel: Nivel) -> str:
    tom = (
        "sem jargão, com analogias simples do dia a dia"
        if nivel == "iniciante"
        else "pode usar termos técnicos e mostrar os números"
    )
    return (
        "Você é o assistente educativo do FII Insights. Ajuda SOMENTE com fundos imobiliários "
        "(FIIs), FIAGROs e o uso desta plataforma. Se a pergunta fugir desse tema, recuse com "
        "gentileza e ofereça ajudar com FIIs. Use SOMENTE os fatos do contexto fornecido "
        "(glossário, descrição da plataforma e dados de fundos citados); NÃO invente números nem "
        "dados, e NÃO recomende compra ou venda. Use a conversa anterior para entender "
        f"perguntas de continuação. Nível do leitor: {nivel} — escreva {tom}."
    )


def responder_chat(
    db: Session,
    mensagem: str,
    historico: list[dict[str, str]],
    nivel: Nivel,
    llm: AssistenteLLM,
) -> str:
    """Responde a uma pergunta geral de FII, ancorada no grounding e com guardrail de tema."""
    contexto = montar_contexto_chat(db, mensagem)
    system = _system_prompt_chat(nivel)
    partes = [contexto]
    if historico:
        linhas = [
            f"{'Usuário' if h['papel'] == 'usuario' else 'Assistente'}: {h['texto']}"
            for h in historico
        ]
        partes.append("Conversa até agora:\n" + "\n".join(linhas))
    partes.append(f"Pergunta do investidor: {mensagem}")
    return llm.gerar(system, "\n\n".join(partes))


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
