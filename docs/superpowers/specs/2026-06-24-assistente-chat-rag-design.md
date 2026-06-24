# Assistente conversacional (chat) com guardrail de tema — Design

> **Status:** aprovado 2026-06-24 (Partes 1 e 2). Próximo: `writing-plans`. Refina **RF-38** (assistente ancorado), **RF-39** (riscos em linguagem simples), **RF-40** (linguagem por nível), **RF-42** (glossário). Sem RF novo.

## Problema

O assistente atual é contra-intuitivo: obriga **escolher um fundo primeiro** (busca → seleciona → nível → pergunta), cada pergunta é **isolada** (não é conversa), e só responde sobre **um fundo** — não dá pra perguntar conceitos gerais de FII ("o que é DY?", "como funciona o score?"). Não há filtro de tema nem aviso de que é beta.

## Decisões (brainstorm 2026-06-24)

1. **Escopo:** chat geral de FIIs/FIAGROs — conceitos, scoring/clusters do app, riscos, e fundos específicos quando o ticker é citado. Só assuntos de FII + uso da plataforma.
2. **Filtro "só FII" + grounding:** **guardrail por system prompt + grounding estruturado (RAG-lite)** — 1 chamada ao Gemini. NÃO é RAG com vector store (corpus pequeno/estruturado → overkill).
3. **Memória:** multi-turn leve — o front envia as ~3 últimas trocas; backend continua **sem estado**.
4. **Aviso de beta** + "poucas perguntas por dia" (reflete a cota 20/dia).
5. **UI:** chat (bolhas + input embaixo), acaba o "escolha um fundo primeiro".

## Parte 1 — Backend

**Novo endpoint** `POST /assistente/chat` (substitui `/assistente/explicar` no uso do front; remover `/explicar` + seu uso pra não deixar código morto, ajustando os testes do backend).

- **Request:** `{ mensagem: str (1..500), historico: [{papel: "usuario"|"assistente", texto: str}], nivel: "iniciante"|"analitico" }`. Sem `ticker` obrigatório.
- **Response:** `{ resposta: str }`.
- **Auth + rate limit** mantidos: `get_current_user`, `5/minute;20/day` por usuário.

**Grounding (RAG-lite), montado no backend e passado como contexto:**
- `app/services/glossario.py` — NOVO: dict de ~15 termos (espelha/expande o `frontend/src/lib/glossario.ts`). Definições entram no contexto para perguntas conceituais. *(Duplicação TS↔PY aceita; unificar é YAGNI.)*
- **Blurb da plataforma** — parágrafo fixo do que o app faz (scoring multicritério, clusters K-Means, carteira/dividendos) → responde "como funciona…".
- **Fundo por menção** — `extrair_tickers(texto)` (regex `\b[A-Z]{4}11\b`, puro/testável) detecta tickers na mensagem; busca no catálogo; injeta a decomposição do score via `montar_contexto_fundo` (reuso). Limite ~2 fundos (trava tokens).

**Guardrail (system prompt):** escopa a FIIs/FIAGROs + uso da plataforma; recusa off-topic com gentileza; usa SÓ os fatos do contexto (não inventa — RNF-04); sem recomendação de compra/venda; adapta ao `nivel`; usa o `historico` para follow-ups.

**Custo:** 1 chamada/pergunta; temperatura/tokens baixos como já está; thinkingBudget=0.

## Parte 2 — Frontend

`IAPage` vira chat:
- **Topo:** título + faixa de **beta** ("🧪 Beta — respondo sobre FIIs/FIAGROs e como usar a plataforma. Por enquanto, poucas perguntas por dia.") + toggle Iniciante/Analítico.
- **Meio:** lista rolável de bolhas (usuário à direita, assistente à esquerda). Vazio → chips de exemplo (conceito/fundo/plataforma). Pendente → bolha "digitando…". Erro → bolha de erro.
- **Base:** input + botão enviar (mantém `data-tour="ia-input"`).
- **Estado:** `mensagens: {papel:"usuario"|"assistente"|"erro", texto}[]` no front. Enviar → anexa do usuário, chama `/chat` com `{mensagem, historico: ultimasTrocas(mensagens, 3), nivel}`, anexa resposta. `ultimasTrocas` é função **pura e testada**. Remove o fluxo `useRanking`/busca de fundo.
- **API:** `api/endpoints/assistente.ts` → `chat(body)`; tipos `ChatIn/ChatOut` (regenerar `api.ts` via openapi-typescript, ou tipar à mão se o backend não estiver de pé).

## Testes (TDD)

- **Back:** `extrair_tickers` (puro); montagem do contexto (glossário + blurb + fundo-na-menção) com `FakeLLM` checando que o system prompt tem o guardrail e o contexto tem o grounding certo; endpoint devolve `resposta` e injeta o `historico` no prompt; off-topic continua 1 chamada (guardrail no prompt).
- **Front:** `ultimasTrocas` (puro); componente do chat (Testing Library) — renderiza faixa de beta; enviar anexa bolha do usuário + chama `mutate({mensagem, historico, nivel})` + renderiza a resposta; `useAssistente` mockado.

## Escopo / faseamento

Backend + frontend num plano só. Faseio: backend (glossário + extrair_tickers + contexto + endpoint /chat, remover /explicar) → frontend (api + hook + chat UI). Cabe no prazo.
