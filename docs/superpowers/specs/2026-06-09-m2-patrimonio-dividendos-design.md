# M2 — Patrimônio & Dividendos — Design

**Data:** 2026-06-09
**Módulo MVP:** M2 — Dashboard de Patrimônio e Dividendos
**RF cobertos:** RF-23 (projeção de dividendos), RF-21 (histórico de proventos coletado/exposto), RF-04/06/08 (patrimônio)
**RF adiado:** RF-22 (proventos *recebidos* reais) — depende de histórico de movimentação (M1/CSV B3)

---

## 1. Problema e escopo

A carteira hoje guarda apenas a **posição atual** (`quantidade` + `preco_medio`), sem data de compra nem histórico de movimentações. Logo, "proventos recebidos no passado" **não é calculável com precisão**.

**Decisão de escopo (Abordagem A):** o M2 entrega **projeção futura de renda**, não valores recebidos. O sistema responde "quanto essa carteira tende a render por mês", de forma honesta e rastreável (RNF-04), sem afirmar histórico que não pode comprovar.

### Decisões fechadas no brainstorm

| Decisão | Escolha |
|---|---|
| Escopo proventos | Só projeção futura (não alega recebido) |
| Base de cálculo | Média dos últimos 12 meses |
| Cobertura da coleta | Catálogo inteiro (~600 fundos) |
| Tipos de provento | Guardar todos; renda conta **só `rendimento`** |
| Layout (UI) | Sub-abas **Posições \| Dividendos** na Carteira |
| Gráfico | **Composição da renda por fundo** (não série temporal — a base 12m daria projeção plana) |

---

## 2. Modelo de dados — `proventos`

Nova tabela (proventos pertencem ao **fundo**, não ao usuário — dado de catálogo, reutilizável).

```
proventos
├─ id              PK
├─ fundo_id        FK → fundos (index)
├─ data_com        date          # corte de quem tem direito
├─ data_pagamento  date          # quando o valor é pago
├─ valor_por_cota  Numeric(12,6)
├─ tipo            str           # "rendimento" | "amortizacao" | "jcp"
└─ UniqueConstraint(fundo_id, data_com, tipo)   # idempotência da coleta
```

Migração Alembic. Relação `Fundo.proventos` (back_populates).

---

## 3. Coleta de proventos

Reaproveita a infraestrutura existente:

- **Já existe:** `StatusInvestClient.buscar_proventos(ticker)` → endpoint `companytickerprovents`.
- **Novo** `parse_proventos(payload)` em `app/utils/parsers/status_invest_json.py` — normaliza para os campos do modelo (data_com, data_pagamento, valor_por_cota, tipo). Construído via **TDD contra fixture real** (capturar um JSON real é a 1ª tarefa do plano).
- **Novo** `ProventoRepository` com `upsert` idempotente (chave `fundo_id + data_com + tipo`).
- **Novo** serviço de coleta de proventos (módulo próprio `coleta_proventos` ou método no `ColetaService`), com rate-limit 300ms + retry (padrão existente).
- **Novo script** `backend/scripts/coletar_proventos.py` — percorre o catálogo, agendável/manual.

**Risco principal:** o schema do JSON de proventos da Status Invest é a maior incógnita técnica. Mitigação: capturar fixture real e validar o parser antes de qualquer cálculo.

---

## 4. Serviço de renda — `app/services/dividendos_service.py` (TDD)

```
renda_mensal_fundo  = média(valor_por_cota dos rendimentos cuja
                      data_pagamento está nos últimos 12 meses) × quantidade
renda_mensal_total  = Σ renda_mensal_fundo  (todas as posições do usuário)
renda_anual         = renda_mensal_total × 12
yield_on_cost       = renda_anual / total_investido   (None se total = 0)
```

Regras:
- Filtra `tipo == "rendimento"` (amortização e JCP não entram na renda).
- Fundo sem rendimentos nos 12m → contribui R$ 0 e é sinalizado (`sem_dados: true`).
- Carteira vazia → renda 0, yield_on_cost None.
- Cálculo monetário com `Decimal` (padrão do `carteira_service`).

---

## 5. API

Endpoints autenticados (`get_current_user`), seguindo o padrão do router `carteira`.

- `GET /carteira/dividendos` →
  ```json
  {
    "renda_mensal": "412.00",
    "renda_anual": "4944.00",
    "yield_on_cost": 0.102,
    "por_fundo": [
      {"ticker": "HGLG11", "renda_mensal": "138.00", "percentual": 0.33, "sem_dados": false}
    ]
  }
  ```
- `GET /fundos/{ticker}/proventos` → histórico de proventos/cota do fundo (RF-21), reutilizável em ranking/análise. Não exige auth (dado de catálogo).

Tipos do front regenerados via `openapi-typescript`.

---

## 6. Frontend (mobile-first, Layout B)

- **`CarteiraPage`** ganha sub-abas **Posições | Dividendos** (mesmo padrão de sub-views da `AnalisePage`).
  - **Posições:** conteúdo atual (lista + aporte + resumo).
  - **Dividendos:** hero (renda mensal · anual · YoC, badge "média 12m") + **gráfico de composição da renda por fundo** (Recharts) + lista "quem paga mais" (R$/mês + % da renda; fundos sem dados sinalizados).
- **`InicioPage`:** mini-card "Renda mensal estimada: R$ X" (link para a aba Dividendos).
- Hook **`useDividendos`** (TanStack Query). Valores monetários via `MoneyValue`.

---

## 7. Testes (TDD obrigatório)

**Backend (pytest):**
- `parse_proventos` — fixture real; casos: rendimento, amortização/JCP, lista vazia, campos nulos.
- `ProventoRepository.upsert` — idempotência (recoletar não duplica).
- `dividendos_service` — média 12m, filtro de tipo, posição sem proventos, carteira vazia, yield_on_cost.
- Endpoints — auth obrigatória, payload correto, ticker inexistente (404).

**Frontend (Vitest/Testing Library):**
- Render das sub-abas Posições/Dividendos e troca entre elas.
- Estado vazio (carteira sem posições / fundos sem proventos).
- Mini-card na Início.

Verificação final: viewport mobile (≈375px) primeiro (RNF-05).

---

## 8. Riscos e fora de escopo

**Riscos:**
- Schema do endpoint de proventos (incógnita) → fixture real primeiro.
- Cobertura de proventos de FIAGRO pode ser irregular → tratado como "sem dados", não quebra o cálculo.

**Fora de escopo (YAGNI / futuro):**
- RF-22 — proventos recebidos reais (precisa de histórico de movimentação; vem com M1/CSV B3).
- Série temporal de projeção (a base 12m a tornaria plana; substituída por composição por fundo).
- Alertas de provento, push/streaming.

---

## 9. Estrutura de arquivos afetada

```
backend/
├─ app/
│  ├─ models/provento.py                     (novo)
│  ├─ repositories/provento_repository.py     (novo)
│  ├─ services/dividendos_service.py          (novo)
│  ├─ services/coleta_proventos.py            (novo)
│  ├─ utils/parsers/status_invest_json.py     (+ parse_proventos)
│  ├─ routers/carteira.py                      (+ GET /dividendos)
│  └─ routers/fundos.py                        (+ GET /{ticker}/proventos)
├─ migrations/versions/xxxx_proventos.py       (novo)
├─ scripts/coletar_proventos.py                (novo)
└─ tests/                                       (novos testes + fixture)

frontend/src/
├─ pages/CarteiraPage.tsx                       (sub-abas)
├─ pages/InicioPage.tsx                         (mini-card)
├─ hooks/useDividendos.ts                       (novo)
├─ components/charts/                           (composição da renda)
└─ types/api.ts                                 (regenerado)
```
