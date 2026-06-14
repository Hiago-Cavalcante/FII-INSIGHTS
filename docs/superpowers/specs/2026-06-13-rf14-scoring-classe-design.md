# Design — RF-14: Scoring diferenciado por classe de ativo (FII × FIAGRO)

> Spec de brainstorm. Base do plano de implementação e do capítulo de Requisitos do TCC.
> Requisitos: **RF-14** (Must) · relacionado a RF-12, RF-13, RNF-04.
> Data: 2026-06-13 · Autor: Hiago Cavalcante Menezes

---

## 1. Contexto e enquadramento

O scoring atual (`scoring_service.py`) é **único**: um conjunto de pesos por **perfil de risco**
(conservador/moderado/arrojado) aplicado igualmente a todos os fundos. O campo `Fundo.classe`
("FII" | "FIAGRO") já existe no modelo, mas **não influencia o scoring**.

**Restrição decisiva (verificada antes do design):** a fonte de dados real é o **Status Invest**
(screener JSON + scraping HTML), não a BRAPI. Os indicadores específicos de FIAGRO de papel
(duration, indexador, inadimplência, qualidade de crédito — RF-12) **não estão disponíveis** nessa
fonte. Hoje há **1 único FIAGRO** no dataset (SPAF11). Vacância já é nula para todos os fundos
(limitação documentada da coleta) e o scoring redistribui o peso.

Portanto, "scoring por classe" **não pode** ser uma dimensão de risco de crédito — inventar esses
números violaria a transparência metodológica (RNF-04). O RF-14 é reenquadrado de forma honesta e
demonstrável com os indicadores que existem.

### Decisões do brainstorm

1. **Ambição:** engine por classe **+ amostra real** de FIAGROs (não só arquitetura).
2. **Classe × Perfil:** a **classe define a base** (indicadores aplicáveis + faixas). FII mantém os 3
   perfis de risco atuais. FIAGRO ganha **1 perfil base único** (YAGNI — não criar 3 variantes de
   risco sem dado que justifique).
3. **Amostra:** adicionar ~12–15 FIAGROs líquidos via Status Invest; **spike de coleta primeiro**
   para confirmar a disponibilidade dos campos; fallback = seed manual marcado como dado curado.

---

## 2. O que muda por classe (e o que não muda)

Muda por classe:

1. **Quais indicadores se aplicam.** FIAGRO de papel **não tem vacância nem segmento de tijolo** —
   saem do perfil por *não-aplicabilidade* (não por dado faltante).
2. **Os pesos.** FIAGRO concentra mais em renda (DY) e desloca o peso da vacância para
   liquidez/volatilidade.
3. **A faixa de DY.** FIAGRO paga yield estruturalmente mais alto (atrelado a CDI+/IPCA+); aplicar a
   curva de FII puniria FIAGRO injustamente.

**Não muda:** a fórmula `Score = Σ (peso_i × pontuação_i / 5) × 100`, o esquema de classificação
(Excelente ≥80 · Bom 60–79 · Regular 40–59 · Evitar <40), o tratamento de nulos (redistribuição
proporcional dentro da dimensão) e as faixas de P/VP, liquidez, volatilidade e percentis de
PL/cotistas.

A ausência de indicadores de crédito de FIAGRO é registrada como **limitação → trabalho futuro**.

---

## 3. Perfil de scoring FIAGRO

### 3.1 Pesos (perfil único; soma = 100%)

| Dimensão | Indicador | Peso FIAGRO | FII moderado (ref.) |
|---|---|---|---|
| Rentabilidade | DY atual | **25%** | 20% |
| Rentabilidade | DY 12M | **15%** | 10% |
| Valuation | P/VP | **15%** | 15% |
| Risco | Liquidez diária | **15%** | 10% |
| Risco | Volatilidade 12M | **15%** | 10% |
| Estrutura | Patrimônio Líquido | **7,5%** | 5% |
| Estrutura | Num cotistas | **7,5%** | 5% |
| — | Vacância física/financeira | (não se aplica) | 20% |
| — | Segmento | (não se aplica) | 5% |
| | **TOTAL** | **100%** | 100% |

### 3.2 Faixa de DY FIAGRO (1–5)

**Recalibrada contra os DYs reais coletados** na implementação (os agro-CRA observados rodam
14–20%, mediana ~16% — bem acima do que a curva inicial assumia):

`≤9% = 1 · 9–12% = 3 · 12–16% = 5 · 16–20% = 4 · >20% = 2`

Racional: FIAGRO de papel atrelado a CDI+/IPCA+; com Selic alta, o núcleo saudável roda 12–16%;
16–20% é alto porém comum; acima de 20% acende cautela (risco de crédito ou distribuição via retorno
de capital). Contrasta com a curva FII, que satura o "5" já em 8–10% e pune >12%.

> Calibração feita sobre a amostra real coletada via `statusinvest.com.br/fiagros/{ticker}`
> (KNCA11 14,3% · RZAG11 16,7% · VGIA11 16,1% · RURA11 15,7% · SNAG11 14,1% · etc.).

### 3.3 Faixas compartilhadas (sem alteração)

P/VP, liquidez, volatilidade e percentis de PL/cotistas usam as mesmas funções do perfil FII. A faixa
de volatilidade de "tijolo" serve bem: FIAGRO de papel costuma ter baixa volatilidade e pontua alto,
o que é coerente.

---

## 4. Refator do motor de scoring

Mantém as funções puras e testáveis; introduz resolução **por classe**.

- `pontuar_dy_fiagro(valor: float) -> int` — nova faixa de DY de FIAGRO.
- `FAIXA_DY: dict[str, Callable] = {"FII": pontuar_dy, "FIAGRO": pontuar_dy_fiagro}` — dispatch.
- `DIMENSOES_FII` (= `DIMENSOES` atual) e `DIMENSOES_FIAGRO` (sem vacância e sem segmento).
- `PESOS_FIAGRO: dict[str, float]` — tabela §3.1.
- `calcular_pontuacoes(ind, fundo, ...)` passa a escolher a faixa de DY por `fundo.classe` via
  `FAIXA_DY`.
- `calcular_score_com_pesos(pontuacoes, pesos, dimensoes=DIMENSOES_FII)` ganha o parâmetro
  `dimensoes` (default preserva compatibilidade).
- `resolver_perfil(classe: str, pesos_fii: dict) -> tuple[dict, dict]` — devolve
  `(PESOS_FIAGRO, DIMENSOES_FIAGRO)` para FIAGRO e `(pesos_fii, DIMENSOES_FII)` para FII.
- `ScoringService.executar()` e `ranking_service.montar_ranking()` resolvem o perfil **por fundo**
  (não mais um peso global). FII usa o perfil de risco do usuário; FIAGRO usa `PESOS_FIAGRO`.

---

## 5. Dados (amostra FIAGRO)

1. **Spike de coleta (de-risca tudo):** descobrir qual categoria/endpoint do Status Invest retorna
   FIAGROs e se traz os mesmos campos do screener de FII (`dy`, `p_vp`, `liquidezmediadiaria`,
   `patrimonio`, `numerocotistas`, `lastdividend`, `price`). Se falhar → fallback "seed manual
   marcado como dado curado" (RNF-04).
2. **Seed** (`seed_fundos.py`): +~12–15 FIAGROs líquidos com `classe="FIAGRO"` (candidatos: KNCA11,
   RZAG11, VGIA11, CPTR11, RURA11, SNAG11, NCRA11, JGPX11, CRAA11, etc.; SPAF11 já existe). Lista
   final definida pela liquidez observada no screener.
3. **Coleta** (`StatusInvestClient` / `ColetaService`): buscar também a categoria FIAGRO e mesclar no
   mapa do screener; fallback HTML com a URL de FIAGRO. O script `coletar_dados` já itera todos os
   fundos — após seed + screener, a coleta de FIAGRO sai de graça.

---

## 6. Migração e contrato de API

- **Migração Alembic:** `scoring_historico.classe_aplicada` (`String(6)`, nullable, default `"FII"`) —
  registra qual perfil pontuou (rastreabilidade RNF-04). Alinha o modelo ao previsto no CLAUDE.md.
- `RankingItem` ganha `classe` para o front identificar/filtrar por classe (o componente
  `ClasseBadge` já existe).
- Regenerar `frontend/src/types/api.ts` (openapi-typescript) ao final.

---

## 7. Plano de testes (TDD: RED → GREEN → REFACTOR)

- **Faixa `pontuar_dy_fiagro`:** bordas 8% / 10% / 13% / 16% e extremos.
- **`calcular_score_com_pesos` com `DIMENSOES_FIAGRO` + `PESOS_FIAGRO`:** confirma que vacância e
  segmento não entram e que os pesos somam a contribuição esperada.
- **Teste discriminante:** um FIAGRO com DY ~13% pontua "Excelente/Bom" sob o perfil FIAGRO, mas
  cairia sob a curva FII — prova que a diferenciação funciona.
- **`resolver_perfil` por classe:** FIAGRO → (PESOS_FIAGRO, DIMENSOES_FIAGRO); FII → (pesos, DIMENSOES_FII).
- **`ScoringService.executar()`** grava `classe_aplicada` correto por fundo.
- **`ranking_service`** pontua FII e FIAGRO com perfis distintos e expõe `classe` no item.
- Spike de coleta validado à parte (não vira teste de unidade sobre a fonte externa).

---

## 8. Fora de escopo (YAGNI)

- Perfis de risco (conservador/moderado/arrojado) para FIAGRO.
- Indicadores de crédito de FIAGRO (duration/indexador/inadimplência) — **trabalho futuro**.
- Novas faixas para P/VP, volatilidade, liquidez ou percentis.
- Novos campos no modelo `Indicador`.
