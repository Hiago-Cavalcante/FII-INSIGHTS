# Assistente conversacional (chat) com guardrail — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Transformar o assistente num chat geral de FIIs: pergunta livre, ancorado nos dados do app (glossário + plataforma + fundo quando o ticker é citado), recusando temas fora de FII, com aviso de beta.

**Architecture:** Novo `POST /assistente/chat` stateless: o backend monta o grounding (glossário Python + blurb da plataforma + decomposição do score dos tickers citados via `montar_contexto_fundo`) e um system prompt que escopa a FIIs e recusa off-topic — 1 chamada ao Gemini (porta `AssistenteLLM`). O front vira chat (bolhas, input embaixo) e envia as ~3 últimas trocas como contexto.

**Tech Stack:** FastAPI + SQLAlchemy + pytest (backend); React 19 + TS + Vitest + Testing Library + TanStack Query (frontend); Gemini via porta existente.

## Global Constraints

- TDD obrigatório (RED→GREEN→REFACTOR) na lógica. Backend: `wsl.exe bash -lc 'cd /home/hiago/projetos/fii-insights/backend && .venv/bin/python -m pytest -q <arquivo>'`. Frontend: `wsl.exe bash -lc 'export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:$PATH"; cd /home/hiago/projetos/fii-insights/frontend && npx vitest run <arquivo>'`. Git pela ferramenta Bash normal.
- **1 chamada ao Gemini por pergunta** (sem classificador extra). Mantém auth `get_current_user` + rate limit `5/minute;20/day` (`usuario_key_func`).
- **Não inventar dados** (RNF-04): o LLM usa só o contexto fornecido. **Guardrail**: responder só FIIs/FIAGROs + uso da plataforma; recusar off-topic com gentileza.
- Python: type hints, sem `any`/`Any` solto, docstrings, comentários em PT, acentos UTF-8 preservados. TS: estrito, proibido `any`, acentos preservados.
- **Manter `/assistente/explicar` e o serviço `responder` intactos** (funcionais + testados): o `/chat` é adicionado ao lado; o front só deixa de usar o `/explicar`. (Decisão de menor risco vs. deletar endpoint + testes; remover é trivial depois.)
- Commits Conventional em PT citando RF-38.

---

### Task 1: Glossário e blurb da plataforma (backend)

**Files:**
- Create: `backend/app/services/glossario.py`
- Test: `backend/tests/test_glossario.py`

**Interfaces:**
- Produces: `GLOSSARIO: dict[str, str]` (termo→definição), `BLURB_PLATAFORMA: str`, `texto_glossario() -> str`.

- [ ] **Step 1: Failing test** — `backend/tests/test_glossario.py`

```python
from app.services.glossario import GLOSSARIO, BLURB_PLATAFORMA, texto_glossario


def test_glossario_cobre_termos_principais():
    for chave in ["dy_atual", "p_vp", "vacancia_fisica", "liquidez_diaria", "volatilidade_12m"]:
        assert chave in GLOSSARIO
        assert len(GLOSSARIO[chave]) > 10


def test_texto_glossario_inclui_definicoes():
    txt = texto_glossario()
    assert "Dividend Yield" in txt
    assert "P/VP" in txt


def test_blurb_menciona_a_plataforma():
    assert "scoring" in BLURB_PLATAFORMA.lower()
```

- [ ] **Step 2: Run, verify FAIL**

Run: `wsl.exe bash -lc 'cd /home/hiago/projetos/fii-insights/backend && .venv/bin/python -m pytest -q tests/test_glossario.py'`
Expected: FAIL — `ModuleNotFoundError: app.services.glossario`.

- [ ] **Step 3: Implement** — `backend/app/services/glossario.py`

```python
"""Conhecimento estruturado de FIIs para o grounding do assistente (RF-42/RF-38).

Espelha/expande o glossário do front (frontend/src/lib/glossario.ts). Duplicação
TS↔PY aceita: o do front alimenta os tooltips "?"; este alimenta o LLM.
"""

from __future__ import annotations

# termo -> definição em linguagem simples (iniciante)
GLOSSARIO: dict[str, str] = {
    "dy_atual": "Dividend Yield (DY): quanto o fundo paga de rendimento por ano em relação ao "
    "preço da cota. Quanto maior, mais renda — mas DY muito alto pode indicar risco.",
    "dy_12m": "DY 12 meses: a média do rendimento pago nos últimos 12 meses. Mostra a "
    "consistência dos pagamentos.",
    "p_vp": "P/VP: compara o preço da cota com o valor patrimonial. Abaixo de 1 significa que "
    "está 'mais barato' que o patrimônio.",
    "vacancia_fisica": "Vacância física: percentual dos imóveis do fundo que estão desocupados. "
    "Quanto menor, melhor.",
    "vacancia_financeira": "Vacância financeira: percentual da receita de aluguéis que o fundo "
    "deixa de receber por inadimplência ou desocupação.",
    "liquidez_diaria": "Liquidez diária: quanto é negociado por dia. Alta liquidez facilita "
    "comprar e vender sem afetar muito o preço.",
    "volatilidade_12m": "Volatilidade 12M: o quanto o preço da cota oscila. Menor volatilidade "
    "costuma significar menos sustos.",
    "patrimonio_liquido": "Patrimônio líquido: o tamanho do fundo. Fundos maiores tendem a ser "
    "mais estáveis.",
    "num_cotistas": "Número de cotistas: quantas pessoas investem no fundo. Mais cotistas "
    "costuma indicar mais liquidez e pulverização.",
    "duration": "Duration: prazo médio dos recebíveis de um FIAGRO/FII de papel. Duration maior "
    "é mais sensível a juros.",
    "fii": "FII (Fundo de Investimento Imobiliário): fundo que investe em imóveis ou títulos "
    "imobiliários e distribui os rendimentos aos cotistas.",
    "fiagro": "FIAGRO: fundo do agronegócio; muitos são de 'papel' (recebíveis), sem imóveis — "
    "por isso não têm vacância, e o risco gira em torno de crédito e indexador.",
    "segmento": "Segmento: o tipo de imóvel/atuação do fundo (logística, shoppings, recebíveis, "
    "etc.). Ajuda a diversificar.",
}

BLURB_PLATAFORMA: str = (
    "O FII Insights analisa FIIs e FIAGROs com um scoring multicritério (nota 0-100 a partir de "
    "rentabilidade, valuation, risco e estrutura, com pesos por perfil do investidor), agrupa "
    "fundos parecidos com clustering K-Means, e ajuda a acompanhar carteira, dividendos e "
    "recomendações (preço-teto e rebalanceamento). O assistente apenas EXPLICA esses dados já "
    "calculados — não dá recomendação de compra ou venda."
)


def texto_glossario() -> str:
    """Glossário formatado como bloco de contexto para o LLM."""
    return "Glossário de termos:\n" + "\n".join(f"- {d}" for d in GLOSSARIO.values())
```

- [ ] **Step 4: Run, verify PASS** (3 testes).

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/glossario.py backend/tests/test_glossario.py
git commit -m "feat(assistente): glossario e blurb da plataforma para grounding (RF-38/RF-42)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Extração de tickers (backend, pura)

**Files:**
- Modify: `backend/app/services/assistente_service.py` (adicionar função)
- Test: `backend/tests/test_assistente_service.py` (adicionar testes)

**Interfaces:**
- Produces: `extrair_tickers(texto: str) -> list[str]` — tickers de FII (4 letras + 11) em maiúsculas, sem duplicar, na ordem de aparição.

- [ ] **Step 1: Failing test** — adicionar em `backend/tests/test_assistente_service.py`

```python
def test_extrair_tickers_detecta_normaliza_e_dedupe():
    from app.services.assistente_service import extrair_tickers

    assert extrair_tickers("Por que XPLG11 e hglg11?") == ["XPLG11", "HGLG11"]
    assert extrair_tickers("o que é dividend yield?") == []
    assert extrair_tickers("XPLG11, XPLG11 de novo") == ["XPLG11"]
```

- [ ] **Step 2: Run, verify FAIL**

Run: `wsl.exe bash -lc 'cd /home/hiago/projetos/fii-insights/backend && .venv/bin/python -m pytest -q tests/test_assistente_service.py::test_extrair_tickers_detecta_normaliza_e_dedupe'`
Expected: FAIL — `cannot import name 'extrair_tickers'`.

- [ ] **Step 3: Implement** — adicionar no topo de `assistente_service.py` (após os imports):

```python
import re

_TICKER_RE = re.compile(r"\b[a-zA-Z]{4}11\b")


def extrair_tickers(texto: str) -> list[str]:
    """Tickers de FII (4 letras + 11) citados no texto, em maiúsculas, sem duplicar."""
    vistos: list[str] = []
    for achado in _TICKER_RE.findall(texto):
        tk = achado.upper()
        if tk not in vistos:
            vistos.append(tk)
    return vistos
```

- [ ] **Step 4: Run, verify PASS.**

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/assistente_service.py backend/tests/test_assistente_service.py
git commit -m "feat(assistente): extrair_tickers para detectar fundos citados (RF-38)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Serviço de chat (grounding + guardrail)

**Files:**
- Modify: `backend/app/services/assistente_service.py`
- Test: `backend/tests/test_assistente_service.py`

**Interfaces:**
- Consumes: `extrair_tickers`, `montar_contexto_fundo`, `_formatar_contexto`, `FundoNaoEncontrado` (mesmo módulo); `texto_glossario`, `BLURB_PLATAFORMA` (`app.services.glossario`); `AssistenteLLM`.
- Produces: `montar_contexto_chat(db, mensagem, max_fundos=2) -> str`; `responder_chat(db, mensagem, historico, nivel, llm) -> str`. `historico` é `list[dict[str, str]]` com chaves `papel` ("usuario"|"assistente") e `texto`.

- [ ] **Step 1: Failing tests** — adicionar em `backend/tests/test_assistente_service.py`
(reusa o helper `_fundo(db, ticker, classe)` já existente no arquivo)

```python
def test_chat_inclui_glossario_e_guardrail(db_session):
    from app.services.assistente_service import responder_chat

    fake = FakeLLM("resp")
    out = responder_chat(db_session, "O que é dividend yield?", [], "iniciante", fake)
    assert out == "resp"
    sys = fake.ultimo_system.lower()
    assert "fii" in sys and "recus" in sys  # escopo + recusa off-topic
    assert "dividend yield" in fake.ultimo_prompt.lower()  # glossário no contexto


def test_chat_injeta_fundo_quando_ticker_citado(db_session):
    from app.services.assistente_service import responder_chat

    _fundo(db_session, "HGLG11")
    fake = FakeLLM("r")
    responder_chat(db_session, "Por que HGLG11 tem essa nota?", [], "iniciante", fake)
    assert "HGLG11" in fake.ultimo_prompt
    assert "dy_atual" in fake.ultimo_prompt  # decomposição do score (grounding do fundo)


def test_chat_usa_historico_para_followup(db_session):
    from app.services.assistente_service import responder_chat

    fake = FakeLLM("r")
    hist = [
        {"papel": "usuario", "texto": "o que é DY?"},
        {"papel": "assistente", "texto": "é o rendimento anual sobre o preço"},
    ]
    responder_chat(db_session, "e o P/VP?", hist, "iniciante", fake)
    assert "o que é DY?" in fake.ultimo_prompt
```

- [ ] **Step 2: Run, verify FAIL** (`cannot import name 'responder_chat'`).

- [ ] **Step 3: Implement** — adicionar em `assistente_service.py` (após `responder`):

```python
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
```

- [ ] **Step 4: Run, verify PASS** (e rode o arquivo todo p/ não regredir os testes de `responder`).

Run: `wsl.exe bash -lc 'cd /home/hiago/projetos/fii-insights/backend && .venv/bin/python -m pytest -q tests/test_assistente_service.py'`

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/assistente_service.py backend/tests/test_assistente_service.py
git commit -m "feat(assistente): servico de chat com grounding e guardrail de tema (RF-38/39/40)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Endpoint POST /assistente/chat

**Files:**
- Modify: `backend/app/routers/assistente.py`
- Test: `backend/tests/test_assistente_router.py`

**Interfaces:**
- Consumes: `responder_chat`, `AssistenteIndisponivel`, `get_llm`, `get_current_user`, rate limit.
- Produces: `POST /api/v1/assistente/chat` ← `{mensagem, historico:[{papel,texto}], nivel}` → `{resposta}`.

- [ ] **Step 1: Failing tests** — adicionar em `backend/tests/test_assistente_router.py`

```python
def test_chat_retorna_resposta(client_carteira):
    client, novo_usuario = client_carteira
    app.dependency_overrides[get_llm] = lambda: FakeLLM("oi")
    try:
        h = novo_usuario("chat@b.com")
        r = client.post(
            "/api/v1/assistente/chat",
            json={"mensagem": "O que é DY?", "historico": [], "nivel": "iniciante"},
            headers=h,
        )
        assert r.status_code == 200
        assert r.json()["resposta"] == "oi"
    finally:
        app.dependency_overrides.pop(get_llm, None)


def test_chat_exige_auth(client_carteira):
    client, _ = client_carteira
    r = client.post(
        "/api/v1/assistente/chat",
        json={"mensagem": "oi", "historico": [], "nivel": "iniciante"},
    )
    assert r.status_code in (401, 403)
```

- [ ] **Step 2: Run, verify FAIL** (404 — rota não existe).

Run: `wsl.exe bash -lc 'cd /home/hiago/projetos/fii-insights/backend && .venv/bin/python -m pytest -q tests/test_assistente_router.py::test_chat_retorna_resposta'`

- [ ] **Step 3: Implement** — adicionar em `assistente.py` (importar `responder_chat` do service; manter o resto):

No import do service trocar para:
```python
from app.services.assistente_service import FundoNaoEncontrado, responder, responder_chat
```
Adicionar os modelos e a rota:
```python
class MensagemHistorico(BaseModel):
    papel: Literal["usuario", "assistente"]
    texto: str = Field(min_length=1, max_length=2000)


class ChatIn(BaseModel):
    mensagem: str = Field(min_length=1, max_length=500)
    historico: list[MensagemHistorico] = Field(default_factory=list, max_length=10)
    nivel: Literal["iniciante", "analitico"] = "iniciante"


class ChatOut(BaseModel):
    resposta: str


@router.post("/chat", response_model=ChatOut)
@limiter.limit("5/minute;20/day", key_func=usuario_key_func)
def chat(
    request: Request,
    body: ChatIn,
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
    llm: AssistenteLLM = Depends(get_llm),
) -> ChatOut:
    """Chat educativo de FIIs: ancorado nos dados do app, recusa temas fora de FII (RF-38)."""
    historico = [{"papel": h.papel, "texto": h.texto} for h in body.historico]
    try:
        resposta = responder_chat(db, body.mensagem, historico, body.nivel, llm)
    except AssistenteIndisponivel:
        raise HTTPException(status_code=503, detail="Assistente indisponível no momento") from None
    return ChatOut(resposta=resposta)
```

- [ ] **Step 4: Run, verify PASS** (rode o arquivo todo).

- [ ] **Step 5: Commit**

```bash
git add backend/app/routers/assistente.py backend/tests/test_assistente_router.py
git commit -m "feat(assistente): endpoint POST /assistente/chat (RF-38)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Frontend — api chat() + tipos do chat (lib)

**Files:**
- Modify: `frontend/src/api/endpoints/assistente.ts`
- Create: `frontend/src/lib/assistente.ts`
- Test: `frontend/src/lib/assistente.test.ts`

**Interfaces:**
- Produces: `chat(body: ChatIn): Promise<ChatOut>`; tipos `TrocaHistorico`, `ChatIn`, `ChatOut` (em `api/endpoints/assistente.ts`). `Mensagem`, `ultimasTrocas(mensagens, n)` (em `lib/assistente.ts`).

- [ ] **Step 1: Failing test** — `frontend/src/lib/assistente.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { ultimasTrocas, type Mensagem } from "./assistente";

const msgs: Mensagem[] = [
  { papel: "usuario", texto: "q1" },
  { papel: "assistente", texto: "a1" },
  { papel: "erro", texto: "x" },
  { papel: "usuario", texto: "q2" },
  { papel: "assistente", texto: "a2" },
  { papel: "usuario", texto: "q3" },
  { papel: "assistente", texto: "a3" },
];

describe("ultimasTrocas", () => {
  it("retorna as últimas n trocas, sem bolhas de erro", () => {
    expect(ultimasTrocas(msgs, 2)).toEqual([
      { papel: "usuario", texto: "q2" },
      { papel: "assistente", texto: "a2" },
      { papel: "usuario", texto: "q3" },
      { papel: "assistente", texto: "a3" },
    ]);
  });
  it("ignora erros e não quebra com poucas mensagens", () => {
    expect(ultimasTrocas([{ papel: "erro", texto: "x" }], 3)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run, verify FAIL** — `Failed to resolve import "./assistente"`.

Run: `wsl.exe bash -lc 'export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:$PATH"; cd /home/hiago/projetos/fii-insights/frontend && npx vitest run src/lib/assistente.test.ts'`

- [ ] **Step 3a: Implement api** — substituir `frontend/src/api/endpoints/assistente.ts` por:

```ts
import { apiClient } from "@/api/client";

export interface TrocaHistorico {
  papel: "usuario" | "assistente";
  texto: string;
}

export interface ChatIn {
  mensagem: string;
  historico: TrocaHistorico[];
  nivel: "iniciante" | "analitico";
}

export interface ChatOut {
  resposta: string;
}

export async function chat(body: ChatIn): Promise<ChatOut> {
  const { data } = await apiClient.post<ChatOut>("/api/v1/assistente/chat", body);
  return data;
}
```

- [ ] **Step 3b: Implement lib** — `frontend/src/lib/assistente.ts`

```ts
import type { TrocaHistorico } from "@/api/endpoints/assistente";

export interface Mensagem {
  papel: "usuario" | "assistente" | "erro";
  texto: string;
}

/**
 * Últimas `n` trocas (par usuário+assistente) para enviar como contexto,
 * descartando bolhas de erro.
 */
export function ultimasTrocas(mensagens: Mensagem[], n: number): TrocaHistorico[] {
  const validas = mensagens.filter((m) => m.papel !== "erro");
  return validas.slice(-n * 2) as TrocaHistorico[];
}
```

- [ ] **Step 4: Run, verify PASS** (2 testes).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/api/endpoints/assistente.ts frontend/src/lib/assistente.ts frontend/src/lib/assistente.test.ts
git commit -m "feat(assistente): api chat() e helper ultimasTrocas (RF-38)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Frontend — hook useAssistente para o chat

**Files:**
- Modify: `frontend/src/hooks/useAssistente.ts`

**Interfaces:**
- Consumes: `chat`, `ChatIn`, `ChatOut` de `@/api/endpoints/assistente`.
- Produces: `useAssistente()` → mutation TanStack (`mutate({mensagem, historico, nivel}, {onSuccess, onError})`, `isPending`).

> Sem teste unitário próprio (wrapper fino de mutation, coberto pelo teste do componente na Task 7). Verificar via `tsc`.

- [ ] **Step 1: Implement** — substituir `frontend/src/hooks/useAssistente.ts` por:

```ts
import { useMutation } from "@tanstack/react-query";
import { chat, type ChatIn, type ChatOut } from "@/api/endpoints/assistente";

export function useAssistente() {
  return useMutation<ChatOut, Error, ChatIn>({ mutationFn: chat });
}
```

- [ ] **Step 2: Verify typecheck**

Run: `wsl.exe bash -lc 'export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:$PATH"; cd /home/hiago/projetos/fii-insights/frontend && npx tsc -b'`
Expected: pode acusar erro em `IAPage.tsx` (ainda usa a API antiga) — OK, será corrigido na Task 7. Confirme que o erro é só no IAPage.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useAssistente.ts
git commit -m "feat(assistente): hook useAssistente aponta para o chat (RF-38)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Frontend — IAPage vira chat (UI + beta)

**Files:**
- Modify: `frontend/src/pages/IAPage.tsx`
- Test: `frontend/src/pages/IAPage.test.tsx`

**Interfaces:**
- Consumes: `useAssistente`, `ultimasTrocas`/`Mensagem`, `useRegistrarTour`.

- [ ] **Step 1: Failing test** — `frontend/src/pages/IAPage.test.tsx`

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { IAPage } from "./IAPage";

const mutateMock = vi.fn();
vi.mock("@/hooks/useAssistente", () => ({
  useAssistente: () => ({ mutate: mutateMock, isPending: false }),
}));

beforeEach(() => mutateMock.mockReset());

describe("IAPage (chat)", () => {
  it("mostra o aviso de beta", () => {
    render(<IAPage />);
    expect(screen.getByText(/beta/i)).toBeInTheDocument();
  });

  it("envia a pergunta chamando o assistente com historico e nivel", () => {
    render(<IAPage />);
    fireEvent.change(screen.getByPlaceholderText(/pergunte sobre fiis/i), {
      target: { value: "O que é DY?" },
    });
    fireEvent.click(screen.getByRole("button", { name: /enviar/i }));
    expect(mutateMock).toHaveBeenCalledTimes(1);
    expect(mutateMock.mock.calls[0][0]).toEqual({
      mensagem: "O que é DY?",
      historico: [],
      nivel: "iniciante",
    });
    // a bolha do usuário aparece na conversa
    expect(screen.getByText("O que é DY?")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run, verify FAIL** (o IAPage atual não tem aviso de beta nem esse placeholder/fluxo).

Run: `wsl.exe bash -lc 'export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:$PATH"; cd /home/hiago/projetos/fii-insights/frontend && npx vitest run src/pages/IAPage.test.tsx'`

- [ ] **Step 3: Implement** — substituir `frontend/src/pages/IAPage.tsx` por:

```tsx
import { useState } from "react";
import { Sparkles, Send } from "lucide-react";
import { useAssistente } from "@/hooks/useAssistente";
import { ultimasTrocas, type Mensagem } from "@/lib/assistente";
import { cn } from "@/lib/utils";
import { useRegistrarTour } from "@/hooks/useRegistrarTour";

type Nivel = "iniciante" | "analitico";

const SUGESTOES = [
  "O que é Dividend Yield?",
  "Como funciona o score?",
  "Quais os riscos de um FII de papel?",
  "Por que XPLG11 tem essa nota?",
];

function Bolha({ m }: { m: Mensagem }) {
  const ehUsuario = m.papel === "usuario";
  const ehErro = m.papel === "erro";
  return (
    <div
      className={cn(
        "max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2 text-sm",
        ehUsuario
          ? "self-end rounded-br-sm bg-primary text-primary-foreground"
          : ehErro
            ? "self-start rounded-bl-sm bg-destructive/10 text-destructive"
            : "self-start rounded-bl-sm border border-border bg-card text-foreground"
      )}
    >
      {m.texto}
    </div>
  );
}

export function IAPage() {
  useRegistrarTour("ia");
  const assistente = useAssistente();
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [nivel, setNivel] = useState<Nivel>("iniciante");
  const [texto, setTexto] = useState("");

  function enviar(msg: string) {
    const pergunta = msg.trim();
    if (pergunta === "" || assistente.isPending) return;
    const historico = ultimasTrocas(mensagens, 3);
    setMensagens((m) => [...m, { papel: "usuario", texto: pergunta }]);
    setTexto("");
    assistente.mutate(
      { mensagem: pergunta, historico, nivel },
      {
        onSuccess: (data) =>
          setMensagens((m) => [...m, { papel: "assistente", texto: data.resposta }]),
        onError: () =>
          setMensagens((m) => [
            ...m,
            { papel: "erro", texto: "Assistente indisponível agora. Tente em instantes." },
          ]),
      }
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
        <Sparkles className="h-5 w-5 text-primary" /> Assistente
      </h1>

      <div className="rounded-xl border border-amber-400/40 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-900/20 dark:text-amber-200">
        🧪 Beta — respondo sobre FIIs/FIAGROs e como usar a plataforma. Por enquanto, poucas
        perguntas por dia.
      </div>

      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Explicar para:</span>
        {(["iniciante", "analitico"] as const).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setNivel(n)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium",
              nivel === n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}
          >
            {n === "iniciante" ? "Iniciante" : "Analítico"}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {mensagens.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {SUGESTOES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => enviar(s)}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-foreground hover:bg-muted"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {mensagens.map((m, i) => (
          <Bolha key={i} m={m} />
        ))}
        {assistente.isPending && (
          <div className="self-start rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm text-muted-foreground">
            digitando…
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          enviar(texto);
        }}
        className="flex gap-2"
      >
        <input
          data-tour="ia-input"
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Pergunte sobre FIIs…"
          className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={assistente.isPending || texto.trim() === ""}
          aria-label="Enviar"
          className="flex items-center justify-center rounded-lg bg-primary px-4 text-primary-foreground disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>

      <p className="text-[11px] text-muted-foreground">
        Explicação educativa baseada nos dados do sistema — não é recomendação de investimento.
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Run tests + build**

Run: `wsl.exe bash -lc 'export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:$PATH"; cd /home/hiago/projetos/fii-insights/frontend && npx vitest run src/pages/IAPage.test.tsx && npm run build && npx eslint src/pages/IAPage.tsx'`
Expected: testes PASS, build OK, ESLint sem erros novos.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/IAPage.tsx frontend/src/pages/IAPage.test.tsx
git commit -m "feat(assistente): IAPage vira chat com aviso de beta (RF-38/39/40)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**1. Spec coverage:**
- Chat geral de FIIs → Tasks 3,4,7. ✅
- Guardrail por prompt → Task 3 (`_system_prompt_chat`). ✅
- Grounding (glossário + blurb + fundo-na-menção) → Tasks 1,2,3. ✅
- Multi-turn leve (3 trocas) → Tasks 5 (`ultimasTrocas`),7. ✅
- Aviso de beta → Task 7. ✅
- UI de chat (bolhas/input) → Task 7. ✅
- 1 chamada Gemini + rate limit + auth → Task 4. ✅
- `/explicar` mantido (decisão de risco documentada na Global Constraints). ✅

**2. Placeholder scan:** Código completo em todos os passos (glossário, regex, serviço, endpoint, api, hook, componente). Sem TBD.

**3. Type consistency:** `ChatIn{mensagem,historico,nivel}`/`ChatOut{resposta}` iguais em back (Task 4) e front (Task 5); `TrocaHistorico{papel,texto}` compartilhado (api → lib/IAPage); `responder_chat(db, mensagem, historico: list[dict], nivel, llm)` consistente entre Task 3 e Task 4; `ultimasTrocas(mensagens, n)` usado na Task 7 como definido na Task 5. ✅
