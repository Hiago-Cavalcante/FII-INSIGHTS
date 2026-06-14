# Design — RF-38: Assistente de IA explicável (+ RF-39/40/42)

> Spec de brainstorm. Base do plano de implementação e do capítulo de Requisitos do TCC.
> Requisitos: **RF-38** (Must, assistente conversacional ancorado), **RF-39** (riscos em linguagem
> simples), **RF-40** (linguagem por perfil), **RF-42** (microconteúdo educacional) · RNF-04.
> Data: 2026-06-14 · Autor: Hiago Cavalcante Menezes

---

## 1. Princípio anti-alucinação (o coração)

O LLM **nunca** acessa o banco nem calcula nada. O backend monta um **grounding factual** — a
decomposição do scoring já calculado — e o passa como contexto; o LLM apenas **reescreve** isso em
linguagem simples. Se a pergunta sair do escopo dos números fornecidos, ele responde que só explica o
scoring daquele fundo. Honra o RNF-04 literalmente: nenhuma análise ou número é inventado.

Decisões do brainstorm:
1. **Provedor:** Google **Gemini 2.0 Flash** (free tier), abstraído atrás de uma interface.
2. **Interação:** pergunta livre sobre **um fundo selecionado**, com grounding sempre anexado +
   perguntas sugeridas.
3. **Stateless:** sem histórico de conversa no MVP (cada pergunta carrega o próprio grounding).
4. **Linguagem por perfil:** parâmetro `nivel` ("iniciante" | "analitico"), sem campo novo no banco.

---

## 2. Grounding: decomposição do score (factual)

`assistente_service.montar_contexto_fundo(db, ticker, nivel)` reusando o `scoring_service`:
- Fundo: ticker, nome, classe, segmento.
- Score, classificação, `classe_aplicada`.
- **Por indicador**: valor (formatado), pontuação 1-5, peso, contribuição — agrupado por dimensão.
- Indicador ausente → marcado "sem dado" (não vira número inventado).

Extrai-se de `scoring_service` uma função pura `detalhar_score(pontuacoes, pesos, dimensoes)` que
devolve, por indicador presente, o peso efetivo (após redistribuição) e a contribuição ao score
(soma das contribuições = score). Testável e reaproveitável pela ficha de análise (RF-18) no futuro.

---

## 3. Porta de LLM (Gemini, abstraído)

- `AssistenteLLM` (Protocol): `gerar(system: str, prompt: str) -> str`.
- `GeminiClient` (adapter): httpx POST ao endpoint do Gemini 2.0 Flash; `gemini_api_key` via env;
  `temperature` baixa e `max_output_tokens` limitado (controle de custo). Try/except + log; sem
  chave ou erro de rede → exceção tratada pelo router (resposta "assistente indisponível").
- `FakeLLM` nos testes (sem rede) — habilita TDD do serviço sem custo nem chave.
- O frontend **nunca** chama o Gemini diretamente — sempre via backend.

---

## 4. Serviço + endpoint

`assistente_service.responder(db, ticker, pergunta, nivel, llm) -> RespostaAssistente`:
1. monta o grounding do fundo (§2); ticker inexistente → erro 404 no router;
2. **system prompt:** "Você explica o scoring JÁ CALCULADO deste fundo. Use SOMENTE os números
   fornecidos. Não invente valores nem recomende compra/venda. Responda em linguagem adequada a
   `nivel`. Se a pergunta fugir do escopo dos dados, diga que só explica o scoring deste fundo.";
3. **user prompt:** grounding serializado (texto legível) + a pergunta do usuário;
4. chama `llm.gerar(...)`, devolve `{ resposta, fundo: {ticker, score, classificacao} }`.

Router `POST /api/v1/assistente/explicar` (autenticado). Body
`{ ticker: str, pergunta: str, nivel: "iniciante" | "analitico" = "iniciante" }`. **Stateless.**

---

## 5. Linguagem por perfil (RF-40)

Sem campo novo no banco: parâmetro **`nivel`** com default **"iniciante"** (P1 é o foco do projeto).
Iniciante = sem jargão, com analogias; analítico = mostra números e termos técnicos. O `glossario.ts`
(microconteúdo por indicador) sustenta o tom iniciante e o RF-42.

---

## 6. Frontend (IAPage — hoje placeholder)

- Seletor de fundo (busca, como no comparador) → cabeçalho com score/classificação (dados do ranking).
- Campo de pergunta livre + **chips de perguntas sugeridas** ("Por que essa nota?", "Quais os
  riscos?", "O DY dele é bom?", "O que é o P/VP dele?").
- Toggle **iniciante/analítico**. Área de resposta com loading/erro. **Disclaimer**: "explicação
  educativa, não recomendação de investimento".
- Hook `useAssistente` (mutation). Tipos via `openapi-typescript`. Mobile-first (RNF-05).

---

## 7. Config & deploy

- `gemini_api_key` (default "") e `gemini_model` (default "gemini-2.0-flash") em `Settings`;
  `.env.example` ganha o placeholder `GEMINI_API_KEY=`. Sem chave → o endpoint devolve erro claro,
  nunca derruba a app. A chave grátis do Google AI Studio é pré-requisito da demo/deploy; **os testes
  não dependem dela** (FakeLLM). httpx já está no stack.

---

## 8. Testes (TDD: RED → GREEN → REFACTOR)

- `detalhar_score`: soma das contribuições = score; só indicadores presentes; pesos efetivos somam o
  peso das dimensões presentes.
- `montar_contexto_fundo`: monta a decomposição a partir do banco; ticker sem indicador → contexto
  com indicadores "sem dado".
- `responder` com `FakeLLM`: o grounding é montado e injetado no prompt; o system prompt contém a
  restrição anti-alucinação e o `nivel`; devolve a resposta do fake. (Testa ancoragem e fio, não a
  saída do LLM.)
- `GeminiClient`: shape da requisição (httpx via respx) + erro/sem-chave tratados.
- Router: 200 com resposta (LLM fakeado por dependency override); 404 ticker inexistente; exige auth.

---

## 9. Fora de escopo (YAGNI)

- Histórico/persistência de conversa; streaming de tokens; chat livre geral (escolhido escopo por
  fundo); explicação da carteira/rebalanceamento via IA (RF-27/29 já são determinísticos); RAG;
  fine-tuning. Sinais de compra/venda permanecem proibidos pelo system prompt (RF-28 fora de escopo).
