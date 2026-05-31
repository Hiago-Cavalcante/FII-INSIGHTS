# Sprint 04 — Saneamento da Coleta (JSON-first no Status Invest) — Design Spec

> **Data:** 2026-05-31
> **Autor:** Hiago (com Claude Code / Superpowers)
> **Status:** Aprovado — pronto para `writing-plans`

---

## Problema

Auditoria de 2026-05-31 (com evidência de runtime) constatou que **5 dos 10 indicadores estão 100% nulos** no banco `data/fii_insights.db`, embora o pipeline tenha rodado de ponta a ponta em 2026-05-26:

| Indicador | Preenchidos (de 50) | Peso no scoring |
|---|---|---|
| `dy_atual` | **0** | **20%** (o maior) |
| `vacancia_fisica` | **0** | 10% |
| `vacancia_financeira` | **0** | 10% |
| `volatilidade_12m` | **0** | 10% |
| `patrimonio_liquido` | **0** | 5% |
| `dy_12m` / `p_vp` / `liquidez_diaria` / `num_cotistas` | 49 / 48 / 46 / 49 | — |

**Causa raiz:**
1. `volatilidade_12m` é `None` hardcoded em `app/utils/parsers/status_invest.py:21` — nunca foi coletada.
2. Os seletores BeautifulSoup de `dy_atual`, vacâncias e `patrimonio` passam nos testes (fixture HTML **sintético**) mas **não casam com o HTML real** do Status Invest.

**Consequência:** após a redistribuição de pesos por dimensão, a dimensão Risco colapsa só em `liquidez`, Rentabilidade só em `dy_12m`, Estrutura só em `num_cotistas`. O score que é o **núcleo quantitativo do TCC roda com ~4 indicadores efetivos, não 10.**

## Objetivo

Restaurar a validade quantitativa do modelo de scoring: colocar **dado válido nos 10 indicadores** do banco (volatilidade incluída, calculada localmente) e re-executar o scoring. Sprint focada em **dados** — não mexe em K-Means, testes de scoring ou frontend (ver "Fora de escopo").

## Decisões consolidadas (do brainstorming)

- **Fonte única: Status Invest**, abordagem **JSON-first**. Descartados: BRAPI (token do `.env` inválido; BRAPI agora exige token p/ tudo; histórico de FII provavelmente é plano pago) e Yahoo Finance (anti-bot/`429` agressivo neste ambiente). **Sem token, sem lib externa** — usa o `httpx` e `numpy` já no stack.
- **Volatilidade calculada localmente** a partir da série de preços do próprio Status Invest (método quantitativo defensável, melhor que copiar um número pronto).
- **Vacância** é o único campo sem JSON; tratada como resíduo (HTML da página, só onde existir). É **legitimamente nula** em FIIs de papel/FoF (não têm imóvel) — a redistribuição de peso já lida com isso.

## Endpoints descobertos e validados

Todos respondem `HTTP 200` em JSON, com headers de browser (UA, `Accept: application/json`, `X-Requested-With: XMLHttpRequest`, `Referer` do Status Invest). **Sem token.**

### 1. Screener — `GET /category/advancedsearchresult?search=<json>&CategoryType=2`
Retorna **todos os FIIs do filtro numa única chamada** (lista de objetos). Campos por item (validado com `ABCP11`):

```
companyid, companyname, ticker, price, sectorname, segment, gestao_f,
dy, p_vp, valorpatrimonialcota, liquidezmediadiaria, percentualcaixa,
dividend_cagr, cota_cagr, lastdividend, patrimonio, numerocotas, numerocotistas, ...
```

- O `search` usado no probe (`{"my_range":"-20;100", ...}`) limitou a 100 itens. **Usar um filtro amplo** para cobrir os 50 tickers do seed (ou paginar) e **mapear o resultado por `ticker`**; tickers ausentes caem para fallback/log.

### 2. Série de preços — `GET /fii/tickerprice?ticker={T}&type=6`
Retorna `[{currencyType, currency, symbol, prices:[{price: float, date: "dd/mm/yy 00:00"}]}]`.
- `type=6` ≈ 2 anos diários (validado XPLG11: 500 pregões, 31/05/24→29/05/26). **Fatiar as últimas ~252 cotações** para janela de 12 meses.
- Validado: volatilidade anualizada de XPLG11 = **12,42%** → pontuação 4 na faixa de tijolo do CLAUDE.md.

### 3. Proventos — `GET /fii/companytickerprovents?ticker={T}&chartProventsType=2`
Retorna `{earningsThisYear, earningsLastYear, rendiment, provisionedThisYear, ...}`. Útil para `dy_atual`; alternativamente `dy_atual` deriva de `lastdividend`/`price` do screener.

## Arquitetura

Camadas: `utils` (cliente + parsers JSON + cálculo puro) → `services` (orquestração) → `scripts` (entrypoint).

- **`StatusInvestClient`** (evolui `app/utils/http_client.py`; mantém retry exponencial + delay 300ms):
  - `buscar_screener() -> dict[str, dict]` — 1 chamada; mapa `ticker → indicadores brutos`.
  - `buscar_serie_precos(ticker) -> list[float]` — `tickerprice?type=6`, preços ordenados por data.
  - `buscar_proventos(ticker) -> dict | None` — `companytickerprovents` (para `dy_atual`).
- **`app/utils/parsers/status_invest.py`** — passa a parsear **JSON** (não HTML). Mantém um extrator **residual de vacância** lido do HTML da página, isolado e só acionado para FIIs de tijolo.
- **`calcular_volatilidade_anualizada(precos: list[float]) -> float | None`** — função pura (`numpy`): desvio-padrão dos log-retornos das últimas ~252 cotações × √252. Testável isoladamente. Retorna `None` se série insuficiente.
- **`ColetaService`** reescrito — orquestra: 1× screener → por fundo (delay 300ms): volatilidade (`tickerprice`) + `dy_atual` + vacância → `IndicadorRepository.upsert(fundo_id, hoje, **campos)`.

Cada unidade tem propósito único, interface clara e é testável isoladamente.

## Fluxo de uma coleta

1. 1 request ao screener → mapa de indicadores dos 50 (filtro amplo; ausentes → log/fallback).
2. Para cada fundo (delay 300ms entre requests): `tickerprice` → série → `calcular_volatilidade_anualizada`; `dy_atual` derivado; vacância via HTML só p/ tijolo.
3. `upsert(fundo_id, data_referencia=hoje, **campos)` — sem duplicata por data.
4. Falha do **screener** (caminho crítico) → retry/backoff; se persistir, aborta com erro claro. Falha de **tickerprice** de um ticker → volatilidade `None` para ele, loga, continua (igual ao tratamento de falha já existente).

## Unidades, nulos e a semântica do `dy_atual`

- **Normalização de unidade** (modelo guarda **frações**, exceto valores monetários):
  - screener `dy` (ex.: 9.8494) → ÷100 → `dy_12m = 0.098494`
  - `p_vp` (0.7014) → como vem
  - `liquidezmediadiaria` → `liquidez_diaria` (R$, como vem)
  - `patrimonio` → `patrimonio_liquido` (R$, como vem)
  - `numerocotistas` → `num_cotistas` (int)
  - vacância e volatilidade → fração (0–1)
- **`dy_atual` — corrigir bug latente de unidade.** O parser antigo guardava o *último rendimento mensal* (~0,0072) mas as faixas do CLAUDE.md (`≤6%=1 … >12%=2`) são **anuais** → sempre pontuava 1. **Decisão:** `dy_atual` = **DY anualizado corrente** = `lastdividend × 12 / price` (fração), comparável às faixas anuais. O ajuste fino/validação do scoring fica na Sprint 05.
- **Vacância nula é correta** em FIIs de papel/FoF. Meta de cobertura mira o **subconjunto de tijolo**, não os 50.
- `fundos.segmento` **não é tocado** nesta sprint (já vem canônico do seed; o scoring usa esse campo). A coleta atualiza apenas a tabela `indicadores`.

## Testes (TDD — offline e determinístico)

Substituir o fixture HTML sintético (que dava falso-verde) por **respostas JSON reais salvas como fixtures**:

- `tests/fixtures/si_screener.json`, `si_tickerprice_xplg11.json`, `si_provents_xplg11.json`, e um `si_pagina_*.html` real (para vacância).
- Ciclo RED → GREEN por unidade:
  - parser do screener extrai e **normaliza** dy_12m/p_vp/liquidez/patrimonio/cotistas dos fixtures;
  - `calcular_volatilidade_anualizada` sobre série conhecida bate valor esperado (tolerância `pytest.approx`);
  - `dy_atual` anualizado calculado corretamente de `lastdividend`/`price`;
  - extrator de vacância sobre HTML real;
  - `ColetaService` com `respx` mockando os 3 endpoints → upsert popula os campos.

## Migração & impacto

- Código novo coexiste; parser HTML antigo aposentado (exceto o extrator de vacância).
- Re-executar `python -m scripts.coletar_dados` **(requer autorização explícita do usuário — é rede)** → depois `python -m scripts.rodar_scoring`.
- Re-scoring mudará os scores (passam a usar dy_atual, vacância, volatilidade, patrimônio) — efeito esperado e desejado.

## Critério de Pronto (DoD)

| Critério | Meta |
|---|---|
| Parsers JSON (screener, tickerprice) + `calcular_volatilidade_anualizada` implementados | sim |
| Fixtures JSON reais + testes verdes (RED→GREEN) | sim |
| `pytest` / `ruff` / `mypy` | limpos |
| Após re-coleta: `dy_atual`, `dy_12m`, `p_vp`, `liquidez_diaria`, `patrimonio_liquido`, `num_cotistas`, `volatilidade_12m` | **≥90% dos 50** |
| `vacancia_fisica`/`financeira` | presentes no subconjunto de tijolo |
| `rodar_scoring` re-executado | scores refletindo as 4 dimensões |

## Fora de escopo (YAGNI)

- K-Means com 5 features (incluir volatilidade) → **Sprint 06**.
- Hardening dos testes de scoring (`calcular_score_com_pesos`, faixas) → **Sprint 05**.
- Integração frontend ↔ API → **Sprint 08**.
- Back-test / silhueta → Sprints 06–07.

## Riscos

- **Status Invest mudar/bloquear endpoints**: mitigar com headers de browser, delay 300ms, retry/backoff e fixtures reais salvas (testes não dependem de rede).
- **Filtro do screener** pode não cobrir os 50 de primeira — usar filtro amplo e validar cobertura por ticker.
- **Premissa do `dy_atual` anualizado** (`lastdividend×12/price`) assume rendimento mensal regular; validar contra alguns FIIs conhecidos.
- **Vacância** varia de disponibilidade por fundo; aceitar nulo em papel/FoF e documentar.
- ~50 chamadas `tickerprice` × 300ms ≈ 15s por coleta — aceitável.
