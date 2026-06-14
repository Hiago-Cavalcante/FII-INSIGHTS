# RF-38 — Assistente IA explicável — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (inline). Steps usam checkbox (`- [ ]`).

**Goal:** Assistente que EXPLICA (não inventa) o scoring de um fundo em linguagem simples, via Gemini consumido pelo backend, ancorado na decomposição factual do score.

**Architecture:** `detalhar_score` (puro) → `montar_contexto_fundo` (grounding) → `responder` monta system+user prompt e chama uma porta `AssistenteLLM` (adapter `GeminiClient`, `FakeLLM` nos testes). Endpoint `POST /api/v1/assistente/explicar`. Frontend IAPage consome via backend.

**Tech Stack:** FastAPI, httpx (Gemini REST), pytest+respx; React+TS, TanStack Query. Testes via WSL (ver convenção abaixo). Nenhum teste depende de rede/chave.

---

## Convenção WSL
- pytest: `wsl.exe bash -lc "cd /home/hiago/projetos/fii-insights/backend && .venv/bin/python -m pytest <args>"`
- front: `wsl.exe bash -lc 'export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:$PATH"; cd /home/hiago/projetos/fii-insights/frontend && <cmd>'`

## Mapa de arquivos
- Modificar: `backend/app/config.py` (+gemini_api_key, gemini_model), `.env.example`
- Modificar: `backend/app/services/scoring_service.py` (+`detalhar_score`)
- Criar: `backend/app/services/assistente_llm.py` (Protocol + GeminiClient + FakeLLM)
- Criar: `backend/app/services/assistente_service.py` (montar_contexto_fundo, responder, prompts)
- Criar: `backend/app/routers/assistente.py`; modificar `backend/app/main.py` (registrar)
- Testes: `test_scoring_service.py`, `test_assistente_llm.py`, `test_assistente_service.py`, `test_assistente_router.py`
- Front: `types/api.ts`, `api/endpoints/assistente.ts`, `hooks/useAssistente.ts`, `pages/IAPage.tsx` (+ ajustar `IAPage.test.tsx`)

---

## Task 1: Config da chave Gemini

- [ ] **Step 1** — em `config.py`, na classe `Settings`, após `access_token_expire_minutes`:
```python
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"
```
- [ ] **Step 2** — em `.env.example` adicionar (se não houver): `GEMINI_API_KEY=` e comentário `# Assistente IA (RF-38) — chave grátis em https://aistudio.google.com`.
- [ ] **Step 3: Commit** — `feat(config): gemini_api_key e gemini_model (RF-38)`

---

## Task 2: `detalhar_score` (decomposição factual)

**Files:** `scoring_service.py`, `test_scoring_service.py`

- [ ] **Step 1: Teste falhando**
```python
def test_detalhar_score_contribuicoes_somam_score():
    from app.services.scoring_service import detalhar_score, calcular_score_com_pesos, DIMENSOES_FII
    p = {k: 4.0 for k in PESOS_DEFAULT}  # todos presentes, pontuação 4
    det = detalhar_score(p, PESOS_DEFAULT, DIMENSOES_FII)
    assert {d["indicador"] for d in det} == set(PESOS_DEFAULT)
    soma = sum(d["contribuicao"] for d in det)
    assert abs(soma - calcular_score_com_pesos(p, PESOS_DEFAULT)) < 0.1


def test_detalhar_score_ignora_ausentes():
    from app.services.scoring_service import detalhar_score, DIMENSOES_FII
    p = {k: None for k in PESOS_DEFAULT}
    p["dy_atual"] = 5.0
    det = detalhar_score(p, PESOS_DEFAULT, DIMENSOES_FII)
    assert [d["indicador"] for d in det] == ["dy_atual"]  # só o presente
```
- [ ] **Step 2: RED** — `... -m pytest tests/test_scoring_service.py -k detalhar -v` → ImportError.
- [ ] **Step 3: Implementar** — em `scoring_service.py`, após `calcular_score_com_pesos`:
```python
class ContribIndicador(TypedDict):
    indicador: str
    pontuacao: float
    peso_efetivo: float
    contribuicao: float


def detalhar_score(
    pontuacoes: dict[str, float | None],
    pesos: dict[str, float],
    dimensoes: dict[str, list[str]] = DIMENSOES_FII,
) -> list[ContribIndicador]:
    """Decompõe o score por indicador presente (peso efetivo normalizado + contribuição).

    A soma das contribuições é igual ao score (mesma redistribuição de
    calcular_score_com_pesos). Base factual para o assistente (RF-38) e a ficha (RF-18).
    """
    pesos_efetivos: dict[str, float] = {}
    for indicadores_dim in dimensoes.values():
        presentes = [k for k in indicadores_dim if pontuacoes.get(k) is not None]
        if not presentes:
            continue
        peso_dim = sum(pesos[k] for k in indicadores_dim)
        peso_presente = sum(pesos[k] for k in presentes)
        if peso_presente == 0:
            continue
        for k in presentes:
            pesos_efetivos[k] = pesos[k] * (peso_dim / peso_presente)
    if not pesos_efetivos:
        return []
    total = sum(pesos_efetivos.values())
    out: list[ContribIndicador] = []
    for k, pe in pesos_efetivos.items():
        pts = pontuacoes[k]
        assert pts is not None
        peso_norm = pe / total
        out.append({
            "indicador": k,
            "pontuacao": pts,
            "peso_efetivo": round(peso_norm, 4),
            "contribuicao": round(peso_norm * (pts / 5.0) * 100, 2),
        })
    return out
```
(adicionar `from typing import TypedDict` se ainda não houver — já há `Literal`; incluir TypedDict.)
- [ ] **Step 4: GREEN** — `... -k detalhar` → PASS; rodar a suíte de scoring inteira → PASS.
- [ ] **Step 5: Commit** — `feat(scoring): detalhar_score decompoe contribuicoes por indicador (RF-38, RF-18)`

---

## Task 3: Porta de LLM + GeminiClient + FakeLLM

**Files:** Criar `backend/app/services/assistente_llm.py`, `backend/tests/test_assistente_llm.py`

- [ ] **Step 1: Teste falhando (respx mocka o Gemini)**
```python
import httpx
import pytest
import respx

from app.services.assistente_llm import GeminiClient, AssistenteIndisponivel


def test_gemini_client_extrai_texto():
    resp = {"candidates": [{"content": {"parts": [{"text": "Olá explicação"}]}}]}
    with respx.mock:
        respx.post(url__regex=r"generativelanguage\.googleapis\.com").mock(
            return_value=httpx.Response(200, json=resp)
        )
        out = GeminiClient(api_key="k", model="gemini-2.0-flash").gerar("sys", "user")
    assert out == "Olá explicação"


def test_gemini_client_sem_chave_levanta():
    with pytest.raises(AssistenteIndisponivel):
        GeminiClient(api_key="", model="m").gerar("s", "u")


def test_gemini_client_erro_http_levanta():
    with respx.mock:
        respx.post(url__regex=r"generativelanguage").mock(return_value=httpx.Response(500))
        with pytest.raises(AssistenteIndisponivel):
            GeminiClient(api_key="k", model="m").gerar("s", "u")
```
- [ ] **Step 2: RED** — ImportError/Falha.
- [ ] **Step 3: Implementar**
```python
from __future__ import annotations

import logging
from typing import Protocol

import httpx

logger = logging.getLogger(__name__)

_GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


class AssistenteIndisponivel(Exception):
    """Falha ao consultar o provedor de LLM (sem chave, rede ou resposta inesperada)."""


class AssistenteLLM(Protocol):
    def gerar(self, system: str, prompt: str) -> str: ...


class GeminiClient:
    """Adapter do Google Gemini (REST). Consumido só pelo backend (RF-38)."""

    def __init__(self, api_key: str, model: str, timeout: float = 30.0) -> None:
        self._api_key = api_key
        self._model = model
        self._timeout = timeout

    def gerar(self, system: str, prompt: str) -> str:
        if not self._api_key:
            raise AssistenteIndisponivel("GEMINI_API_KEY não configurada")
        url = _GEMINI_URL.format(model=self._model)
        body = {
            "systemInstruction": {"parts": [{"text": system}]},
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.2, "maxOutputTokens": 800},
        }
        try:
            with httpx.Client(timeout=self._timeout) as client:
                r = client.post(url, params={"key": self._api_key}, json=body)
                r.raise_for_status()
                data = r.json()
            return data["candidates"][0]["content"]["parts"][0]["text"]
        except (httpx.HTTPError, KeyError, IndexError, ValueError) as e:
            logger.warning("Falha no Gemini: %s", e)
            raise AssistenteIndisponivel(str(e)) from e


class FakeLLM:
    """LLM falso para testes: ecoa system+prompt sem rede."""

    def __init__(self, resposta: str = "RESPOSTA_FAKE") -> None:
        self.resposta = resposta
        self.ultimo_system = ""
        self.ultimo_prompt = ""

    def gerar(self, system: str, prompt: str) -> str:
        self.ultimo_system = system
        self.ultimo_prompt = prompt
        return self.resposta
```
- [ ] **Step 4: GREEN** — `... -m pytest tests/test_assistente_llm.py -v` → PASS. (respx já é dep de teste — confirmar; é usado em test_status_invest_client.)
- [ ] **Step 5: Commit** — `feat(assistente): porta AssistenteLLM + adapter Gemini + FakeLLM (RF-38)`

---

## Task 4: `assistente_service` (grounding + responder)

**Files:** Criar `backend/app/services/assistente_service.py`, `backend/tests/test_assistente_service.py`

- [ ] **Step 1: Testes falhando**
```python
from datetime import date
from app.models.fundo import Fundo
from app.models.indicador import Indicador
from app.services.assistente_llm import FakeLLM
from app.services.assistente_service import FundoNaoEncontrado, montar_contexto_fundo, responder
import pytest


def _fundo(db, ticker="HGLG11", classe="FII"):
    f = Fundo(ticker=ticker, nome="Teste", segmento="Logística", classe=classe)
    db.add(f); db.flush()
    db.add(Indicador(fundo_id=f.id, data_referencia=date.today(), dy_atual=0.09, p_vp=0.95,
                     liquidez_diaria=2e6, volatilidade_12m=0.10, patrimonio_liquido=5e9, num_cotistas=300000))
    db.commit()
    return f


def test_montar_contexto_inclui_score_e_indicadores(db_session):
    _fundo(db_session)
    ctx = montar_contexto_fundo(db_session, "hglg11", nivel="iniciante")
    assert ctx["ticker"] == "HGLG11"
    assert ctx["classe"] == "FII"
    assert 0 <= ctx["score"] <= 100
    assert any(i["indicador"] == "dy_atual" for i in ctx["indicadores"])


def test_responder_injeta_grounding_e_restricao(db_session):
    _fundo(db_session)
    fake = FakeLLM("explicação")
    out = responder(db_session, "HGLG11", "Por que essa nota?", nivel="iniciante", llm=fake)
    assert out["resposta"] == "explicação"
    assert out["fundo"]["ticker"] == "HGLG11"
    # grounding e restrição presentes no que foi enviado ao LLM:
    assert "HGLG11" in fake.ultimo_prompt
    assert "Por que essa nota?" in fake.ultimo_prompt
    assert "SOMENTE" in fake.ultimo_system or "somente" in fake.ultimo_system.lower()
    assert "iniciante" in fake.ultimo_system.lower()


def test_responder_ticker_inexistente(db_session):
    with pytest.raises(FundoNaoEncontrado):
        responder(db_session, "ZZZZ11", "?", nivel="iniciante", llm=FakeLLM())
```
- [ ] **Step 2: RED** — ImportError.
- [ ] **Step 3: Implementar**
```python
from __future__ import annotations

from typing import Literal, TypedDict

from sqlalchemy.orm import Session

from app.repositories.fundo_repository import FundoRepository
from app.repositories.indicador_repository import IndicadorRepository
from app.services.assistente_llm import AssistenteLLM
from app.services.scoring_service import (
    PESOS_DEFAULT,
    calcular_pontuacoes,
    calcular_score_com_pesos,
    classificar_score,
    detalhar_score,
    resolver_perfil,
)

Nivel = Literal["iniciante", "analitico"]


class FundoNaoEncontrado(Exception):
    pass


class IndicadorCtx(TypedDict):
    indicador: str
    pontuacao: float
    peso_efetivo: float
    contribuicao: float


class ContextoFundo(TypedDict):
    ticker: str
    nome: str | None
    classe: str
    segmento: str | None
    score: float
    classificacao: str
    indicadores: list[IndicadorCtx]


class RespostaAssistente(TypedDict):
    resposta: str
    fundo: dict[str, object]


def montar_contexto_fundo(db: Session, ticker: str, nivel: Nivel) -> ContextoFundo:
    fundo = FundoRepository(db).buscar_por_ticker(ticker.upper())
    if fundo is None:
        raise FundoNaoEncontrado(ticker)
    indicadores = IndicadorRepository(db).buscar_todos_mais_recentes()
    todos_pl = [i.patrimonio_liquido for i in indicadores if i.patrimonio_liquido is not None]
    todos_cot = [float(i.num_cotistas) for i in indicadores if i.num_cotistas is not None]
    ind = next((i for i in indicadores if i.fundo_id == fundo.id), None)
    pesos, dimensoes = resolver_perfil(fundo.classe, PESOS_DEFAULT)
    if ind is None:
        score, detalhes = 0.0, []
    else:
        pont = calcular_pontuacoes(ind, fundo, todos_pl, todos_cot)
        score = calcular_score_com_pesos(pont, pesos, dimensoes)
        detalhes = detalhar_score(pont, pesos, dimensoes)
    return {
        "ticker": fundo.ticker, "nome": fundo.nome, "classe": fundo.classe,
        "segmento": fundo.segmento, "score": score,
        "classificacao": classificar_score(score), "indicadores": detalhes,
    }


def _system_prompt(nivel: Nivel) -> str:
    tom = (
        "Explique em linguagem simples, sem jargão, com analogias do dia a dia."
        if nivel == "iniciante"
        else "Pode usar termos técnicos e mostrar os números."
    )
    return (
        "Você é um assistente que EXPLICA o scoring JÁ CALCULADO de um fundo imobiliário. "
        "Use SOMENTE os números fornecidos no contexto. NÃO invente valores, NÃO faça análise "
        "nova e NÃO recomende compra ou venda. Se a pergunta fugir do escopo dos dados do fundo, "
        f"diga que você só explica o scoring deste fundo. {tom}"
    )


def _formatar_contexto(ctx: ContextoFundo) -> str:
    linhas = [
        f"Fundo: {ctx['ticker']} ({ctx['nome']}) — classe {ctx['classe']}, segmento {ctx['segmento']}.",
        f"Score: {ctx['score']:.1f}/100 → classificação {ctx['classificacao']}.",
        "Contribuição de cada indicador (pontuação 1-5, peso, contribuição ao score):",
    ]
    for i in ctx["indicadores"]:
        linhas.append(
            f"- {i['indicador']}: nota {i['pontuacao']:.0f}/5, peso {i['peso_efetivo']*100:.0f}%, "
            f"contribui {i['contribuicao']:.1f} pontos."
        )
    if not ctx["indicadores"]:
        linhas.append("- (sem indicadores disponíveis para este fundo)")
    return "\n".join(linhas)


def responder(db: Session, ticker: str, pergunta: str, nivel: Nivel, llm: AssistenteLLM) -> RespostaAssistente:
    ctx = montar_contexto_fundo(db, ticker, nivel)
    system = _system_prompt(nivel)
    prompt = f"{_formatar_contexto(ctx)}\n\nPergunta do investidor: {pergunta}"
    resposta = llm.gerar(system, prompt)
    return {
        "resposta": resposta,
        "fundo": {"ticker": ctx["ticker"], "score": ctx["score"], "classificacao": ctx["classificacao"]},
    }
```
- [ ] **Step 4: GREEN** — `... -m pytest tests/test_assistente_service.py -v` → PASS. (Confirmar `IndicadorRepository.buscar_todos_mais_recentes` existe — usado no ranking.)
- [ ] **Step 5: Commit** — `feat(assistente): grounding factual do fundo + responder ancorado (RF-38, RF-39, RF-40)`

---

## Task 5: Endpoint `POST /assistente/explicar`

**Files:** Criar `backend/app/routers/assistente.py`; modificar `main.py`; `backend/tests/test_assistente_router.py`

- [ ] **Step 1: Teste falhando** (LLM fakeado via dependency override):
```python
from app.main import app
from app.routers.assistente import get_llm
from app.services.assistente_llm import FakeLLM


def test_explicar_retorna_resposta(client_carteira):
    client, novo_usuario = client_carteira
    app.dependency_overrides[get_llm] = lambda: FakeLLM("explicado")
    try:
        h = novo_usuario("ia@b.com")
        r = client.post("/api/v1/assistente/explicar",
                        json={"ticker": "HGLG11", "pergunta": "Por que?", "nivel": "iniciante"}, headers=h)
        assert r.status_code == 200
        assert r.json()["resposta"] == "explicado"
        assert r.json()["fundo"]["ticker"] == "HGLG11"
    finally:
        app.dependency_overrides.pop(get_llm, None)


def test_explicar_exige_auth(client_carteira):
    client, _ = client_carteira
    r = client.post("/api/v1/assistente/explicar", json={"ticker": "HGLG11", "pergunta": "?"})
    assert r.status_code in (401, 403)


def test_explicar_ticker_inexistente(client_carteira):
    client, novo_usuario = client_carteira
    app.dependency_overrides[get_llm] = lambda: FakeLLM()
    try:
        h = novo_usuario("ia2@b.com")
        r = client.post("/api/v1/assistente/explicar",
                        json={"ticker": "ZZZZ11", "pergunta": "?", "nivel": "iniciante"}, headers=h)
        assert r.status_code == 404
    finally:
        app.dependency_overrides.pop(get_llm, None)
```
(O fixture `client_carteira` já semeia HGLG11.)
- [ ] **Step 2: RED** — 404 da rota.
- [ ] **Step 3: Implementar** `routers/assistente.py`:
```python
from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.usuario import Usuario
from app.services.assistente_llm import AssistenteIndisponivel, AssistenteLLM, GeminiClient
from app.services.assistente_service import FundoNaoEncontrado, responder
from app.utils.security import get_current_user

router = APIRouter(prefix="/assistente", tags=["assistente"])


def get_llm() -> AssistenteLLM:
    return GeminiClient(api_key=settings.gemini_api_key, model=settings.gemini_model)


class ExplicarIn(BaseModel):
    ticker: str
    pergunta: str = Field(min_length=1, max_length=500)
    nivel: Literal["iniciante", "analitico"] = "iniciante"


class FundoResumoOut(BaseModel):
    ticker: str
    score: float
    classificacao: str


class ExplicarOut(BaseModel):
    resposta: str
    fundo: FundoResumoOut


@router.post("/explicar", response_model=ExplicarOut)
def explicar(
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
    return ExplicarOut(resposta=out["resposta"], fundo=FundoResumoOut(**out["fundo"]))
```
- [ ] **Step 4: Registrar no main** — em `main.py`: importar `assistente` na linha dos routers e `app.include_router(assistente.router, prefix="/api/v1")`.
- [ ] **Step 5: GREEN** — `... -m pytest tests/test_assistente_router.py -v` → PASS; suíte inteira + ruff + mypy.
- [ ] **Step 6: Commit** — `feat(assistente): endpoint POST /assistente/explicar (RF-38)`

---

## Task 6: Frontend — IAPage real

**Files:** `types/api.ts` (regen), `api/endpoints/assistente.ts`, `hooks/useAssistente.ts`, `pages/IAPage.tsx`, `pages/IAPage.test.tsx`

- [ ] **Step 1: Regen tipos** — gerar openapi.json do app e `npx openapi-typescript /tmp/openapi.json -o src/types/api.ts`. Confirmar `ExplicarIn`/`ExplicarOut`.
- [ ] **Step 2: Endpoint client** — `api/endpoints/assistente.ts`:
```ts
import { apiClient } from "@/api/client";
import type { components } from "@/types/api";

export type ExplicarBody = components["schemas"]["ExplicarIn"];
export type Explicacao = components["schemas"]["ExplicarOut"];

export async function explicar(body: ExplicarBody): Promise<Explicacao> {
  const { data } = await apiClient.post<Explicacao>("/api/v1/assistente/explicar", body);
  return data;
}
```
- [ ] **Step 3: Hook** — `hooks/useAssistente.ts`: `useMutation({ mutationFn: explicar })`.
- [ ] **Step 4: IAPage** — substituir o EmptyState placeholder por: seletor de fundo (busca reusando `useRanking`/`getRanking`), toggle iniciante/analítico, chips de perguntas sugeridas, campo de pergunta, botão Perguntar (dispara a mutation), área de resposta (loading/erro 503 "indisponível"), disclaimer "explicação educativa, não recomendação". Mobile-first.
- [ ] **Step 5: Ajustar IAPage.test.tsx** — o teste atual valida o placeholder "em breve"; trocar por: renderiza o seletor/título do assistente e o disclaimer (mockando o hook/endpoint). Manter verde.
- [ ] **Step 6: Verificar** — `npx tsc --noEmit`, `npx eslint` nos arquivos novos, `npx vitest run`. Validar no viewport mobile.
- [ ] **Step 7: Commit** — `feat(ia): IAPage do assistente explicavel (RF-38, RF-39, RF-40, RF-42, RNF-05)`

---

## Verificação final
- [ ] Suíte backend verde + ruff + mypy; frontend tsc/lint/vitest verdes.
- [ ] Smoke real (se houver GEMINI_API_KEY): subir backend, perguntar sobre um fundo, conferir resposta ancorada (cita os números do grounding, não inventa). Sem chave → 503 tratado.
- [ ] requesting-code-review antes do merge.

## Self-review (cobertura do spec)
- §2 grounding → Tasks 2,4. §3 porta LLM → Task 3. §4 serviço+endpoint → Tasks 4,5. §5 nivel → Tasks 4,6. §6 frontend → Task 6. §7 config → Task 1. §8 testes → embutidos. Assinaturas (`detalhar_score`, `montar_contexto_fundo`, `responder(…, llm)`, `AssistenteLLM.gerar`, `get_llm`, `ExplicarIn/Out`) consistentes entre tasks.
