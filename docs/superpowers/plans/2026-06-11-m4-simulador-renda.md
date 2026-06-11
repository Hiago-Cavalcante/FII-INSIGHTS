# M4 — Simulador de Renda Mensal Futura — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar um simulador de renda mensal futura (bola de neve com aportes) como 3ª sub-aba da Carteira, com motor de cálculo no frontend e parâmetros lembrados no cliente.

**Architecture:** 100% frontend. Motor é uma função pura (`lib/simulador.ts`) testada com Vitest. Parâmetros do usuário (aporte, horizonte, meta) ficam num store Zustand persistido; capital inicial e DY mensal vêm como defaults editáveis da carteira (hooks do M2). UI numa nova `SimuladorView` com gráfico Recharts. Sem backend, sem endpoints, sem migrações.

**Tech Stack:** React + TypeScript (strict) · Zustand (persist) · Recharts · Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-06-11-m4-simulador-renda-design.md`

**AMBIENTE (crítico):** o frontend roda com **node Linux via nvm dentro do WSL**. A ferramenta Bash é git-bash no Windows; NUNCA rode npm/npx direto nela (ERR_INVALID_URL no caminho UNC). SEMPRE:
```
wsl.exe bash -lc 'export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:$PATH"; cd /home/hiago/projetos/fii-insights/frontend && <comando>'
```
(aspas obrigatórias no `export PATH`). Edite/leia arquivos via UNC `\\wsl.localhost\Ubuntu\home\hiago\projetos\fii-insights\...`. Git pela ferramenta Bash normal (já no repo). Branch: `feature/m4-simulador-renda` — NÃO troque de branch.

---

## Task 1: Motor de projeção `lib/simulador.ts` (TDD)

**Files:**
- Create: `frontend/src/lib/simulador.ts`
- Test: `frontend/src/lib/simulador.test.ts`

- [ ] **Step 1: Escrever os testes que falham**

Create `frontend/src/lib/simulador.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { projetarRenda } from "./simulador";

describe("projetarRenda — snowball com aportes", () => {
  it("acumula aporte + reinveste dividendos a cada mês", () => {
    // capital 1000, aporte 100, taxa 1%/mês, 3 meses
    // m1: 1100*0.01=11 -> pat 1111 ; m2: 1211*0.01=12.11 -> pat 1223.11
    // m3: 1323.11*0.01=13.2311 -> pat 1336.3411
    const r = projetarRenda({ capitalInicial: 1000, aporteMensal: 100, taxaMensal: 0.01, meses: 3 });
    expect(r.serie).toHaveLength(3);
    expect(r.serie[0].mes).toBe(1);
    expect(r.serie[0].renda).toBeCloseTo(11, 4);
    expect(r.serie[0].patrimonio).toBeCloseTo(1111, 4);
    expect(r.rendaFinal).toBeCloseTo(13.2311, 4);
    expect(r.patrimonioFinal).toBeCloseTo(1336.3411, 4);
    expect(r.mesMeta).toBeNull();
  });

  it("detecta o primeiro mês que atinge a meta de renda", () => {
    const r = projetarRenda({ capitalInicial: 1000, aporteMensal: 100, taxaMensal: 0.01, meses: 3, rendaAlvo: 12.5 });
    expect(r.mesMeta).toBe(3); // m1=11, m2=12.11, m3=13.2311 >= 12.5
  });

  it("retorna mesMeta null quando a meta não é atingida no horizonte", () => {
    const r = projetarRenda({ capitalInicial: 1000, aporteMensal: 100, taxaMensal: 0.01, meses: 3, rendaAlvo: 1000 });
    expect(r.mesMeta).toBeNull();
  });

  it("capital e aporte zerados produzem renda e patrimônio zero", () => {
    const r = projetarRenda({ capitalInicial: 0, aporteMensal: 0, taxaMensal: 0.01, meses: 2, rendaAlvo: 10 });
    expect(r.rendaFinal).toBe(0);
    expect(r.patrimonioFinal).toBe(0);
    expect(r.mesMeta).toBeNull();
  });

  it("horizonte zero retorna série vazia sem quebrar", () => {
    const r = projetarRenda({ capitalInicial: 500, aporteMensal: 100, taxaMensal: 0.01, meses: 0 });
    expect(r.serie).toEqual([]);
    expect(r.rendaFinal).toBe(0);
    expect(r.patrimonioFinal).toBe(500);
    expect(r.mesMeta).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `wsl.exe bash -lc 'export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:$PATH"; cd /home/hiago/projetos/fii-insights/frontend && npx vitest run src/lib/simulador.test.ts'`
Expected: FAIL — `Failed to resolve import "./simulador"`.

- [ ] **Step 3: Implementar o motor**

Create `frontend/src/lib/simulador.ts`:
```typescript
export interface SimuladorParams {
  capitalInicial: number; // R$
  aporteMensal: number; // R$/mês
  taxaMensal: number; // fração (0.008 = 0,8%/mês)
  meses: number; // horizonte
  rendaAlvo?: number | null; // R$/mês (meta, opcional)
}

export interface PontoProjecao {
  mes: number;
  renda: number;
  patrimonio: number;
}

export interface ResultadoSimulacao {
  serie: PontoProjecao[];
  rendaFinal: number;
  patrimonioFinal: number;
  mesMeta: number | null;
}

/**
 * Projeta a renda mensal futura pela bola de neve: a cada mês soma o aporte,
 * calcula a renda gerada (principal × taxa) e a reinveste no principal.
 * Premissas: dividendos reinvestidos, taxa constante, sem valorização de cota.
 */
export function projetarRenda(params: SimuladorParams): ResultadoSimulacao {
  const { capitalInicial, aporteMensal, taxaMensal, meses, rendaAlvo = null } = params;

  const serie: PontoProjecao[] = [];
  let principal = capitalInicial;
  let mesMeta: number | null = null;

  for (let mes = 1; mes <= meses; mes++) {
    principal += aporteMensal;
    const renda = principal * taxaMensal;
    principal += renda;
    serie.push({ mes, renda, patrimonio: principal });
    if (mesMeta === null && rendaAlvo != null && rendaAlvo > 0 && renda >= rendaAlvo) {
      mesMeta = mes;
    }
  }

  const ultimo = serie[serie.length - 1];
  return {
    serie,
    rendaFinal: ultimo ? ultimo.renda : 0,
    patrimonioFinal: ultimo ? ultimo.patrimonio : capitalInicial,
    mesMeta,
  };
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `wsl.exe bash -lc 'export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:$PATH"; cd /home/hiago/projetos/fii-insights/frontend && npx vitest run src/lib/simulador.test.ts'`
Expected: PASS (5).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/simulador.ts frontend/src/lib/simulador.test.ts
git commit -m "feat(simulador): motor de projeção de renda (snowball) (RF-24)"
```

---

## Task 2: Store `stores/simuladorStore.ts` (Zustand persist)

**Files:**
- Create: `frontend/src/stores/simuladorStore.ts`
- Test: `frontend/src/stores/simuladorStore.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

Create `frontend/src/stores/simuladorStore.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { useSimuladorStore } from "./simuladorStore";

describe("simuladorStore", () => {
  beforeEach(() => {
    useSimuladorStore.setState({ aporteMensal: 0, meses: 120, rendaAlvo: null });
  });

  it("tem defaults sensatos (10 anos, sem meta)", () => {
    const s = useSimuladorStore.getState();
    expect(s.meses).toBe(120);
    expect(s.aporteMensal).toBe(0);
    expect(s.rendaAlvo).toBeNull();
  });

  it("setters atualizam o estado", () => {
    useSimuladorStore.getState().setAporte(1000);
    useSimuladorStore.getState().setMeses(60);
    useSimuladorStore.getState().setRendaAlvo(3000);
    const s = useSimuladorStore.getState();
    expect(s.aporteMensal).toBe(1000);
    expect(s.meses).toBe(60);
    expect(s.rendaAlvo).toBe(3000);
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `wsl.exe bash -lc 'export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:$PATH"; cd /home/hiago/projetos/fii-insights/frontend && npx vitest run src/stores/simuladorStore.test.ts'`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Implementar o store** (espelha `stores/perfilStore.ts`)

Create `frontend/src/stores/simuladorStore.ts`:
```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SimuladorState {
  aporteMensal: number;
  meses: number;
  rendaAlvo: number | null;
  setAporte: (v: number) => void;
  setMeses: (v: number) => void;
  setRendaAlvo: (v: number | null) => void;
}

export const useSimuladorStore = create<SimuladorState>()(
  persist(
    (set) => ({
      aporteMensal: 0,
      meses: 120, // 10 anos
      rendaAlvo: null,
      setAporte: (aporteMensal) => set({ aporteMensal }),
      setMeses: (meses) => set({ meses }),
      setRendaAlvo: (rendaAlvo) => set({ rendaAlvo }),
    }),
    { name: "fii-simulador" }
  )
);
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `wsl.exe bash -lc 'export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:$PATH"; cd /home/hiago/projetos/fii-insights/frontend && npx vitest run src/stores/simuladorStore.test.ts'`
Expected: PASS (2).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/stores/simuladorStore.ts frontend/src/stores/simuladorStore.test.ts
git commit -m "feat(simulador): store de parâmetros (aporte/horizonte/meta) persistido (RF-43)"
```

---

## Task 3: Gráfico `components/charts/ProjecaoRendaChart.tsx`

**Files:**
- Create: `frontend/src/components/charts/ProjecaoRendaChart.tsx`

> Componente de apresentação puro (sem teste dedicado; é coberto pelo render da SimuladorView na Task 4 e pelo polyfill de ResizeObserver já existente em `src/test/setup.ts`). Espelha o estilo de `components/charts/RendaPorFundoChart.tsx`.

- [ ] **Step 1: Criar o componente**

Create `frontend/src/components/charts/ProjecaoRendaChart.tsx`:
```typescript
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { PontoProjecao } from "@/lib/simulador";

interface Props {
  serie: PontoProjecao[];
  rendaAlvo?: number | null;
}

export function ProjecaoRendaChart({ serie, rendaAlvo }: Props) {
  if (serie.length === 0)
    return <p className="text-xs text-muted-foreground">Ajuste os parâmetros para ver a projeção.</p>;

  const dados = serie.map((p) => ({ mes: p.mes, renda: p.renda }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={dados} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <XAxis
          dataKey="mes"
          tick={{ fontSize: 10 }}
          tickFormatter={(m: number) => `${Math.round(m / 12)}a`}
          interval="preserveStartEnd"
        />
        <YAxis hide />
        <Tooltip
          formatter={(v: number | string | readonly (number | string)[]) => `R$ ${Number(v).toFixed(2)}/mês`}
          labelFormatter={(m: number) => `Mês ${m}`}
        />
        {rendaAlvo != null && rendaAlvo > 0 && (
          <ReferenceLine
            y={rendaAlvo}
            stroke="hsl(var(--accent-foreground))"
            strokeDasharray="4 4"
            label={{ value: "meta", position: "insideTopRight", fontSize: 10 }}
          />
        )}
        <Area dataKey="renda" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.18} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `wsl.exe bash -lc 'export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:$PATH"; cd /home/hiago/projetos/fii-insights/frontend && npx tsc --noEmit'`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/charts/ProjecaoRendaChart.tsx
git commit -m "feat(simulador): gráfico de projeção de renda com linha de meta (RF-24)"
```

---

## Task 4: `components/carteira/SimuladorView.tsx` (TDD)

**Files:**
- Create: `frontend/src/components/carteira/SimuladorView.tsx`
- Test: `frontend/src/components/carteira/SimuladorView.test.tsx`

- [ ] **Step 1: Escrever o teste que falha**

Create `frontend/src/components/carteira/SimuladorView.test.tsx`:
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SimuladorView } from "./SimuladorView";
import { useSimuladorStore } from "@/stores/simuladorStore";

vi.mock("@/hooks/useCarteira", () => ({
  useCarteira: () => ({ resumo: { total_investido: "10000.00", por_classe: {}, num_posicoes: 1 } }),
}));
vi.mock("@/hooks/useDividendos", () => ({
  useDividendos: () => ({
    dividendos: { renda_mensal: "100.00", renda_anual: "1200.00", yield_on_cost: 0.12, por_fundo: [] },
    isLoading: false,
    isError: false,
  }),
}));

describe("SimuladorView", () => {
  beforeEach(() => useSimuladorStore.setState({ aporteMensal: 0, meses: 120, rendaAlvo: null }));

  it("renderiza a renda projetada e reage à mudança de aporte", () => {
    render(<SimuladorView />);
    expect(screen.getByText(/Renda mensal projetada/i)).toBeInTheDocument();
    const aporte = screen.getByLabelText("Aporte mensal");
    // aumentar o aporte deve aumentar a renda projetada (recompute)
    fireEvent.change(aporte, { target: { value: "2000" } });
    expect(useSimuladorStore.getState().aporteMensal).toBe(2000);
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `wsl.exe bash -lc 'export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:$PATH"; cd /home/hiago/projetos/fii-insights/frontend && npx vitest run src/components/carteira/SimuladorView.test.tsx'`
Expected: FAIL — módulo `./SimuladorView` não existe.

- [ ] **Step 3: Implementar a view**

Create `frontend/src/components/carteira/SimuladorView.tsx`:
```typescript
import { useState } from "react";
import { useCarteira } from "@/hooks/useCarteira";
import { useDividendos } from "@/hooks/useDividendos";
import { useSimuladorStore } from "@/stores/simuladorStore";
import { projetarRenda } from "@/lib/simulador";
import { MoneyValue } from "@/components/ui/MoneyValue";
import { ProjecaoRendaChart } from "@/components/charts/ProjecaoRendaChart";
import { formatPercent } from "@/lib/formato";

const TAXA_FALLBACK = 0.008; // 0,8%/mês (~10% a.a.) quando não há carteira

export function SimuladorView() {
  const { resumo } = useCarteira();
  const { dividendos } = useDividendos();
  const { aporteMensal, meses, rendaAlvo, setAporte, setMeses, setRendaAlvo } = useSimuladorStore();

  const totalInvestido = Number(resumo?.total_investido ?? 0);
  const capitalDefault = totalInvestido;
  const taxaDefault =
    totalInvestido > 0 && dividendos ? Number(dividendos.renda_mensal) / totalInvestido : TAXA_FALLBACK;

  // overrides editáveis (null = usa o default da carteira)
  const [capitalOverride, setCapitalOverride] = useState<number | null>(null);
  const [taxaOverride, setTaxaOverride] = useState<number | null>(null);
  const capitalInicial = capitalOverride ?? capitalDefault;
  const taxaMensal = taxaOverride ?? taxaDefault;

  const r = projetarRenda({ capitalInicial, aporteMensal, taxaMensal, meses, rendaAlvo });
  const anos = Math.round(meses / 12);

  return (
    <div className="flex flex-col gap-4">
      <section className="glass rounded-2xl p-4">
        <p className="text-sm text-muted-foreground">Renda mensal projetada em {anos} anos</p>
        <MoneyValue valor={r.rendaFinal} className="text-3xl font-extrabold text-primary" />
        <p className="mt-1 text-xs text-muted-foreground">
          patrimônio <MoneyValue valor={r.patrimonioFinal} />
          {rendaAlvo != null && rendaAlvo > 0 && (
            <>
              {" · "}
              {r.mesMeta != null ? `🎯 meta atingida no mês ${r.mesMeta}` : "meta não atingida no período"}
            </>
          )}
        </p>
      </section>

      <div className="rounded-2xl border border-border bg-card p-3">
        <ProjecaoRendaChart serie={r.serie} rendaAlvo={rendaAlvo} />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
        <label className="flex flex-col gap-1 text-sm text-foreground">
          Aporte mensal
          <input
            aria-label="Aporte mensal"
            type="number"
            min="0"
            step="50"
            value={aporteMensal}
            onChange={(e) => setAporte(Number(e.target.value))}
            className="rounded-xl border border-input bg-background px-3 py-2.5 text-foreground"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-foreground">
          Horizonte: {anos} anos
          <input
            aria-label="Horizonte em anos"
            type="range"
            min="1"
            max="30"
            value={anos}
            onChange={(e) => setMeses(Number(e.target.value) * 12)}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-foreground">
          Meta de renda mensal (opcional)
          <input
            aria-label="Meta de renda mensal"
            type="number"
            min="0"
            step="100"
            value={rendaAlvo ?? ""}
            onChange={(e) => setRendaAlvo(e.target.value === "" ? null : Number(e.target.value))}
            className="rounded-xl border border-input bg-background px-3 py-2.5 text-foreground"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-foreground">
          Capital inicial
          <input
            aria-label="Capital inicial"
            type="number"
            min="0"
            step="100"
            value={capitalInicial}
            onChange={(e) => setCapitalOverride(Number(e.target.value))}
            className="rounded-xl border border-input bg-background px-3 py-2.5 text-foreground"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-foreground">
          DY mensal: {formatPercent(taxaMensal * 100)}
          <input
            aria-label="DY mensal"
            type="range"
            min="1"
            max="20"
            value={Math.round(taxaMensal * 1000)}
            onChange={(e) => setTaxaOverride(Number(e.target.value) / 1000)}
          />
        </label>
        <p className="text-xs text-muted-foreground">
          Capital e DY vêm da sua carteira; ajuste para simular cenários. Premissa: dividendos reinvestidos, sem
          valorização de cota.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `wsl.exe bash -lc 'export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:$PATH"; cd /home/hiago/projetos/fii-insights/frontend && npx vitest run src/components/carteira/SimuladorView.test.tsx'`
Expected: PASS (1).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/carteira/SimuladorView.tsx frontend/src/components/carteira/SimuladorView.test.tsx
git commit -m "feat(simulador): SimuladorView com controles e projeção (RF-24, RF-43, RNF-05)"
```

---

## Task 5: 3ª sub-aba "Simulador" na `CarteiraPage`

**Files:**
- Modify: `frontend/src/pages/CarteiraPage.tsx`
- Modify: `frontend/src/pages/CarteiraPage.test.tsx`

- [ ] **Step 1: Escrever o teste que falha** (acrescentar mock + caso em `CarteiraPage.test.tsx`)

Acrescentar o mock de `SimuladorView` no topo dos `vi.mock` existentes do arquivo (para isolar do recharts/hooks) e um teste de troca de aba:
```typescript
vi.mock("@/components/carteira/SimuladorView", () => ({
  SimuladorView: () => <div>Renda mensal projetada</div>,
}));
```
```typescript
it("troca para a aba Simulador", () => {
  render(<CarteiraPage />);
  fireEvent.click(screen.getByRole("tab", { name: "Simulador" }));
  expect(screen.getByText(/Renda mensal projetada/)).toBeInTheDocument();
});
```
> Leia o arquivo atual primeiro: ele já tem `import { describe, it, expect, vi } from "vitest"`, `render, screen, fireEvent`, e mocks de `useCarteira`/`useDividendos`. Adicione o `vi.mock` de SimuladorView junto aos outros e o `it(...)` dentro do `describe` existente.

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `wsl.exe bash -lc 'export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:$PATH"; cd /home/hiago/projetos/fii-insights/frontend && npx vitest run src/pages/CarteiraPage.test.tsx'`
Expected: FAIL — não há aba "Simulador" (getByRole tab name "Simulador" não encontrado).

- [ ] **Step 3: Adicionar a 3ª aba** — Replace `frontend/src/pages/CarteiraPage.tsx` inteiramente por:
```typescript
import { useState } from "react";
import { cn } from "@/lib/utils";
import { PosicoesView } from "@/components/carteira/PosicoesView";
import { DividendosView } from "@/components/carteira/DividendosView";
import { SimuladorView } from "@/components/carteira/SimuladorView";

type Sub = "posicoes" | "dividendos" | "simulador";

const ROTULOS: Record<Sub, string> = {
  posicoes: "Posições",
  dividendos: "Dividendos",
  simulador: "Simulador",
};

export function CarteiraPage() {
  const [sub, setSub] = useState<Sub>("posicoes");
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">Minha Carteira</h1>
      <div role="tablist" className="flex gap-2">
        {(["posicoes", "dividendos", "simulador"] as const).map((s) => (
          <button
            key={s}
            role="tab"
            aria-selected={sub === s}
            onClick={() => setSub(s)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium",
              sub === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}
          >
            {ROTULOS[s]}
          </button>
        ))}
      </div>
      {sub === "posicoes" && <PosicoesView />}
      {sub === "dividendos" && <DividendosView />}
      {sub === "simulador" && <SimuladorView />}
    </div>
  );
}
```

- [ ] **Step 4: Rodar os testes e ver passar**

Run: `wsl.exe bash -lc 'export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:$PATH"; cd /home/hiago/projetos/fii-insights/frontend && npx vitest run src/pages/CarteiraPage.test.tsx'`
Expected: PASS (todos, incluindo o novo).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/CarteiraPage.tsx frontend/src/pages/CarteiraPage.test.tsx
git commit -m "feat(simulador): 3ª sub-aba Simulador na Carteira (RF-24, RNF-05)"
```

---

## Task 6: Gate final + smoke mobile (verification-before-completion)

**Files:** nenhum (verificação)

- [ ] **Step 1: Suíte + tipos + build + lint**

Run:
```
wsl.exe bash -lc 'export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:$PATH"; cd /home/hiago/projetos/fii-insights/frontend && npx vitest run && npx tsc --noEmit && npx vite build 2>&1 | tail -3 && npx eslint src 2>&1 | tail -5'
```
Expected: vitest tudo verde (incluindo os novos de simulador) · tsc sem erros · build OK · eslint sem **erros** (os 3 warnings pré-existentes em `badge.tsx`/`button.tsx`/`PerfilPage.tsx` não contam e não devem aumentar).

- [ ] **Step 2: Smoke mobile (≈375px)** — com `uvicorn` :8000 e `vite` dev:
  - Carteira → aba **Simulador**: hero mostra renda projetada; arrastar **Horizonte** e mudar **Aporte** recalcula na hora; definir **Meta** mostra a linha tracejada e "🎯 meta no mês N"; **Capital/DY** editáveis (default da carteira).
  - Carteira vazia: usa fallback (capital 0, DY 0,8%/mês) e ainda simula.
  - Sem overflow em 375px (RNF-05).

- [ ] **Step 3: Finalizar a branch** — usar `superpowers:finishing-a-development-branch` para `feature/m4-simulador-renda`.

---

## Self-Review

**1. Cobertura da spec:**
- Motor snowball (`projetarRenda`, premissas, casos de borda) → Task 1 ✅
- Defaults da carteira editáveis + fallback → Task 4 (capitalDefault/taxaDefault/TAXA_FALLBACK) ✅
- Persistência client-side (aporte/horizonte/meta), RF-43 → Task 2 ✅
- Objetivo = linha de meta + "atinge no mês N" → Tasks 1 (mesMeta), 3 (ReferenceLine), 4 (hero) ✅
- Sub-aba Simulador (RF-24) → Task 5 ✅
- Gráfico de projeção → Task 3 ✅
- Testes TDD por unidade + gate + smoke mobile → Tasks 1,2,4,5,6 ✅
- Fora de escopo (goal-seeking, valorização, imposto, backend) respeitado ✅

**2. Placeholders:** nenhum "TBD/TODO"; todo passo com código real. ProjecaoRendaChart sem teste dedicado é justificado (componente de apresentação coberto pelo render da SimuladorView).

**3. Consistência de tipos:** `projetarRenda(SimuladorParams) → ResultadoSimulacao{serie:PontoProjecao[],rendaFinal,patrimonioFinal,mesMeta}` usado igual na SimuladorView (Task 4) e o `PontoProjecao[]` consumido pelo `ProjecaoRendaChart` (Task 3). Store `useSimuladorStore` expõe `aporteMensal/meses/rendaAlvo` + `setAporte/setMeses/setRendaAlvo` (Task 2) consumidos exatamente assim na Task 4. `formatPercent(taxaMensal*100)` e `MoneyValue valor={number}` coerentes com `lib/formato.ts` e o componente existente.
