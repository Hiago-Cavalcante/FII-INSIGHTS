# M4 — Simulador de Renda Mensal Futura — Design

**Data:** 2026-06-11
**Módulo MVP:** M4 — Simulador de Renda Mensal Futura
**RF cobertos:** RF-24 (simulador de renda), RF-43 (perfil ampliado: objetivos + horizonte)

---

## 1. Problema e escopo

O M2 já mostra a renda mensal **atual** da carteira. O M4 responde **"quanto vou receber por mês no futuro?"** projetando, a partir da carteira atual, o crescimento da renda com **aportes mensais** e **reinvestimento dos dividendos** (bola de neve) ao longo de um **horizonte** escolhido.

### Decisões fechadas no brainstorm

| Decisão | Escolha |
|---|---|
| Modelo | **Acumulação com aportes (snowball)** — não goal-seeking |
| Ponto de partida | Carteira como **default editável** (capital + DY pré-preenchidos, ajustáveis) |
| Premissas | Dividendos **reinvestidos**, taxa **constante**, **sem valorização de cota** |
| Persistência (RF-43) | **Client-side** (Zustand persist): aporte, horizonte, objetivo |
| Motor | **Frontend, função pura** (TypeScript + Vitest) — sem backend novo |
| UI | **3ª sub-aba "Simulador"** na Carteira (Posições · Dividendos · Simulador) |

Decisão **100% frontend**: nenhum endpoint, modelo ou migração novos.

---

## 2. Motor de projeção — `frontend/src/lib/simulador.ts`

Função pura, determinística, testável isoladamente.

**Assinatura:**
```ts
interface SimuladorParams {
  capitalInicial: number;   // R$
  aporteMensal: number;     // R$/mês
  taxaMensal: number;       // fração (ex.: 0.008 = 0,8%/mês)
  meses: number;            // horizonte
  rendaAlvo?: number | null;// R$/mês (meta, opcional)
}
interface PontoProjecao { mes: number; renda: number; patrimonio: number; }
interface ResultadoSimulacao {
  serie: PontoProjecao[];
  rendaFinal: number;
  patrimonioFinal: number;
  mesMeta: number | null;   // 1º mês com renda >= rendaAlvo; null se sem meta ou não atingida
}
```

**Algoritmo (mês a mês):**
```
principal = capitalInicial
para m em 1..meses:
    principal  += aporteMensal           // aporte do mês
    rendaMes    = principal * taxaMensal  // renda gerada no mês
    principal  += rendaMes                // reinveste (snowball)
    serie.push({ mes: m, renda: rendaMes, patrimonio: principal })
rendaFinal      = serie[meses-1].renda
patrimonioFinal = serie[meses-1].patrimonio
mesMeta         = (rendaAlvo ? primeiro m com serie[m].renda >= rendaAlvo : null)
```

**Casos de borda:** `meses = 0` → `serie = []`, `rendaFinal = 0`, `patrimonioFinal = capitalInicial`, `mesMeta = null` (a função deve tratar série vazia, sem indexar `serie[-1]`); `capitalInicial = 0` e `aporteMensal = 0` → todos os pontos com renda/patrimônio 0; `rendaAlvo` nula ou nunca atingida → `mesMeta = null`. Valores monetários em `number` (JS) — sem `Decimal` no front, arredondamento só na exibição via `MoneyValue`.

---

## 3. Defaults vindos da carteira (editáveis)

Calculados na `SimuladorView` a partir dos hooks existentes do M2:
- `capitalInicial` default = `resumo.total_investido` (`useCarteira`).
- `taxaMensal` default = `dividendos.renda_mensal / resumo.total_investido` (`useDividendos` + `useCarteira`) — já é a **taxa mensal real** da carteira.
- **Fallback** quando `total_investido == 0` (carteira vazia / sem proventos): `capitalInicial = 0`, `taxaMensal = 0.008` (≈ 0,8%/mês, ~10% a.a.) — permite ao iniciante (P1) simular do zero.

Ambos os defaults são **editáveis** na tela (o usuário pode rodar cenários).

---

## 4. Estado — `frontend/src/stores/simuladorStore.ts` (Zustand persist)

Persiste no localStorage (chave `fii-simulador`), espelhando o padrão de `perfilStore`/`authStore`:
```ts
interface SimuladorState {
  aporteMensal: number;      // default 0
  meses: number;             // default 120 (10 anos)
  rendaAlvo: number | null;  // default null
  setAporte / setMeses / setRendaAlvo
}
```
`capitalInicial` e `taxaMensal` **não** são persistidos (vêm da carteira a cada sessão; editáveis em estado local de tela). Isso cobre o "lembrar objetivos + horizonte" do RF-43 sem mexer no perfil global nem em auth.

---

## 5. UI — sub-aba "Simulador" (mobile-first, RNF-05)

- **`CarteiraPage`** passa a ter 3 sub-abas: `posicoes | dividendos | simulador` (mesmo padrão de pills já usado).
- **`SimuladorView`**:
  - **Hero:** renda mensal projetada no fim do horizonte (`MoneyValue`) + linha "🎯 atinge a meta de R$Y no mês N" (quando há `rendaAlvo` e é atingida) ou "meta não atingida no período".
  - **Gráfico** (`ProjecaoRendaChart`, Recharts): linha/área da `renda` ao longo dos meses + linha tracejada horizontal na `rendaAlvo` (meta). Mostra também patrimônio? Não — foco em renda (YAGNI); patrimônio final aparece como número.
  - **Controles:** aporte mensal, horizonte (em anos, ex.: 1–30), capital inicial (editável, default carteira), DY mensal % (editável, default carteira). Recompute **instantâneo** (chama `projetarRenda` a cada mudança).
- Reusa `MoneyValue`, `cn`, `useCarteira`, `useDividendos`.

---

## 6. Arquivos afetados

```
frontend/src/
├─ lib/simulador.ts                          (novo — motor)
├─ lib/simulador.test.ts                     (novo — TDD)
├─ stores/simuladorStore.ts                  (novo)
├─ components/carteira/SimuladorView.tsx     (novo)
├─ components/charts/ProjecaoRendaChart.tsx  (novo)
└─ pages/CarteiraPage.tsx                     (3ª sub-aba)
   pages/CarteiraPage.test.tsx               (cobrir as 3 abas)
```
Sem mudanças no backend.

---

## 7. Testes (TDD obrigatório, Vitest)

- **`simulador.ts`:** snowball básico (valores conferidos à mão), reinvestimento aumenta a renda mês a mês, detecção de `mesMeta`, meta não atingida → null, `capital=0 & aporte=0` → zeros, `meses=0` → série vazia.
- **`SimuladorView`:** render dos controles, recompute ao alterar um input (renda projetada muda), exibição/ausência da linha de meta.
- **`CarteiraPage`:** troca entre Posições/Dividendos/Simulador.
- Verificação final: viewport mobile ≈375px (RNF-05).

---

## 8. Fora de escopo (YAGNI / trabalhos futuros)

- Modo **meta → aporte necessário** (goal-seeking reverso).
- Valorização de cota, imposto de renda, inflação/valor presente.
- Persistência no backend / perfil-por-usuário (RF-43 fica client-side).
- Múltiplos cenários comparados lado a lado.
