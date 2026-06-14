# Design — RF-27/29: Rebalanceamento + Preço-teto

> Spec de brainstorm. Base do plano de implementação e do capítulo de Requisitos do TCC.
> Requisitos: **RF-29** (preço-teto, Should) · **RF-27** (rebalanceamento, Should) · relacionado a
> RF-04/08 (carteira), RF-21/23 (proventos), RF-14 (classe), RNF-04 (transparência).
> Data: 2026-06-14 · Autor: Hiago Cavalcante Menezes

---

## 1. Escopo e onde vive

Uma nova **4ª sub-aba "Recomendações"** na Carteira (hoje: Posições | Dividendos | Simulador),
alimentada por um endpoint único. Tudo **determinístico e explicável** (RNF-04), **sem LLM** — o
assistente (RF-38) depois apenas traduz esses números em linguagem simples. Escopo de carteira:
preço-teto dos fundos que o usuário possui; rebalanceamento da carteira dele.

Decisões do brainstorm:
1. **Preço-teto:** método **Bazin** (transparente, popular para FIIs, usa proventos já coletados).
2. **Yield-alvo:** **por classe, editável** — defaults FII 8%, FIAGRO 13%.
3. **Rebalanceamento:** **alocação-alvo por classe** (FII×FIAGRO), comparando atual × alvo.
4. Ambos como **serviços backend** (testáveis e reaproveitáveis pelo assistente RF-38).

---

## 2. Preço-teto (RF-29) — método Bazin

Para cada posição da carteira:

```
proventos_12m = Σ proventos dos últimos 12 meses (por data_pagamento) do fundo
preco_teto    = proventos_12m / yield_alvo
margem_seg    = (preco_teto − preco_atual) / preco_atual        # fração: desconto (+) / ágio (−)
status        = "Abaixo do teto" se preco_atual ≤ preco_teto, senão "Acima do teto"
```

- **Yield-alvo por classe, editável:** defaults **FII 8%** e **FIAGRO 13%** (coerentes com os DYs
  reais observados no RF-14).
- **Preço atual:** o `Indicador` não guarda preço hoje → adiciona-se `preco_atual` (migração) e a
  coleta o preenche do campo `price` do screener.
- **Sem proventos 12m** (fundo novo / recém-listado) ou **sem preço atual** → `preco_teto = null`,
  `status = "Sem dados"`. Não se inventa número (RNF-04).

---

## 3. Rebalanceamento (RF-27) — alocação-alvo por classe

```
total      = Σ valor_investido (já em resumo_carteira)
atual_fii  = valor_investido FII / total          (fração)
atual_fiag = valor_investido FIAGRO / total
alvo_fii   = alvo editável (default 0.80); alvo_fiagro = 1 − alvo_fii (default 0.20)
desvio     = atual − alvo  (por classe)
sugestao   = "Aportar mais"  se atual < alvo − banda
             "Reduzir ritmo" se atual > alvo + banda
             "Equilibrado"   se |desvio| ≤ banda
```

- **Banda de tolerância:** ±5 pontos percentuais (não recomenda micro-ajustes).
- **Carteira vazia / total = 0:** estado vazio, sem sugestão.
- O foco é **direção de aporte** (qual classe reforçar), não venda — evita o terreno sensível de
  sinais de compra/venda (RF-28, fora de escopo).

---

## 4. Backend

- **Migração Alembic:** `indicadores.preco_atual` (`Float`, nullable). A coleta passa a gravar o
  `price` do screener (e do HTML quando disponível).
- **`app/services/recomendacao_service.py`** (funções puras + orquestração):
  - `calcular_preco_teto(proventos_12m: Decimal, yield_alvo: float) -> Decimal | None`
    (None se `proventos_12m` for 0/None).
  - `proventos_ultimos_12m(db, fundo_id) -> Decimal` (Σ por `data_pagamento` na janela de 12 meses).
  - `analisar_precos_teto(db, usuario_id, yield_fii, yield_fiagro) -> list[PrecoTetoItem]`
    (uma linha por posição: ticker, nome, classe, preco_medio, preco_atual, preco_teto, margem,
    status).
  - `sugerir_rebalanceamento(por_classe: dict[str, Decimal], total: Decimal, alvo_fii: float)
    -> Rebalanceamento` (atual_%, alvo_%, desvio e sugestão por classe).
- **`app/routers/recomendacao.py`:** `GET /carteira/recomendacoes` (autenticado). Query params
  `yield_fii=0.08`, `yield_fiagro=0.13`, `alvo_fii=0.80` (defaults). Resposta:
  `{ precos_teto: [PrecoTetoItem...], rebalanceamento: Rebalanceamento }`.

---

## 5. Frontend (mobile-first)

Sub-aba **Recomendações** na Carteira:

- **Preço-teto:** cards/linhas por fundo — preço atual · preço-teto · margem (verde se desconto,
  vermelho se ágio) · status. Inputs de yield-alvo por classe (defaults 8%/13%). `ClasseBadge`.
- **Rebalanceamento:** barra atual × alvo (FII×FIAGRO) + texto de sugestão por classe; input/slider
  do alvo FII (default 80%, FIAGRO = complemento).
- Hook `useRecomendacoes` (TanStack Query). Tipos via `openapi-typescript`.

Validação no viewport mobile primeiro (RNF-05).

---

## 6. Testes (TDD: RED → GREEN → REFACTOR)

- `calcular_preco_teto`: fórmula correta; `proventos_12m` 0/None → None.
- `proventos_ultimos_12m`: soma só a janela de 12 meses (descarta antigos).
- `analisar_precos_teto`: margem positiva (desconto) e negativa (ágio); status; posição sem
  proventos → "Sem dados"; yield por classe aplicado corretamente (FII 8% vs FIAGRO 13%).
- `sugerir_rebalanceamento`: atual < alvo − banda → "Aportar mais"; dentro da banda → "Equilibrado";
  atual > alvo + banda → "Reduzir ritmo"; carteira vazia → estado vazio.
- Endpoint: exige autenticação; defaults aplicados; query params respeitados.

---

## 7. Fora de escopo (YAGNI)

- Preço-teto na tela de Análise/ranking (follow-up; aqui é carteira-escopo).
- Alerta de concentração por fundo/segmento (escolhido só alocação por classe).
- Gordon/DDM. Sinais de compra/venda (RF-28 — sensível, regulatório). Rebalanceamento por score.
- Alvo de alocação por perfil de risco (o alvo é editável e independente do perfil por ora).
