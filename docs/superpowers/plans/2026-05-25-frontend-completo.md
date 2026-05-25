# Frontend Completo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completar o frontend com TanStack Table (Ranking), Recharts (Dashboard), estados de loading/erro, e formulário de pesos customizados (Perfil) com validação Zod.

**Architecture:** Quatro features independentes em paralelo: (1) charts no Dashboard usando Recharts; (2) tabela completa no Ranking com TanStack Table (sort + paginação + busca); (3) skeleton/error states reutilizáveis; (4) pesos customizados no Perfil com React Hook Form + Zod, estendendo `scoring.ts` e o Zustand store.

**Tech Stack:** React 19, Vite, TypeScript strict, Tailwind CSS 3, recharts@2, @tanstack/react-table@8, react-hook-form@7, zod@3, zustand@5, vitest

---

## File Map

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `src/lib/scoring.ts` | Modificar | Exportar `PesosIndicadores`; adicionar `calcularScoreComPesos(fundo, pesos)` |
| `src/lib/scoring.test.ts` | Modificar | Testes para `calcularScoreComPesos` e schema Zod |
| `src/lib/pesosSchema.ts` | Criar | Schema Zod para validar pesos customizados |
| `src/stores/perfilStore.ts` | Modificar | Adicionar `pesosCustom` e `setPesosCustom` |
| `src/hooks/useDashboard.ts` | Modificar | Ler `pesosCustom` do store; usar `calcularScoreComPesos` quando custom |
| `src/hooks/useRanking.ts` | Modificar | Idem; aceitar `globalFilter` (busca por ticker) |
| `src/components/charts/ScoreBarChart.tsx` | Criar | BarChart Recharts: contagem por classificação |
| `src/components/ui/ErrorState.tsx` | Criar | Componente de erro reutilizável |
| `src/pages/DashboardPage.tsx` | Modificar | Adicionar `ScoreBarChart`; adicionar skeleton states |
| `src/pages/RankingPage.tsx` | Reescrever | TanStack Table com sort + paginação + busca |
| `src/pages/PerfilPage.tsx` | Modificar | Adicionar seção de pesos customizados com sliders + RHF |

---

## Task 1: Exportar `PesosIndicadores` e adicionar `calcularScoreComPesos`

**Files:**
- Modify: `src/lib/scoring.ts`
- Modify: `src/lib/scoring.test.ts`

- [ ] **1.1 — Escrever o teste que falha**

Adicionar ao final de `src/lib/scoring.test.ts`:

```typescript
import { calcularScoreComPesos } from "./scoring";
import type { PesosIndicadores } from "./scoring";

describe("calcularScoreComPesos", () => {
  const fundoBase: FundoComIndicadores = {
    id: 99,
    ticker: "TEST11",
    nome: "Teste",
    segmento: "Logística",
    gestora: null,
    dy_atual: 9.0,
    dy_12m: 10.0,
    p_vp: 0.90,
    vacancia_fisica: 3.0,
    vacancia_financeira: 3.0,
    liquidez_diaria: 6.0,
    volatilidade_12m: 9.0,
    patrimonio_liquido: 4.0,
    num_cotistas: 300,
  };

  const pesosIguais: PesosIndicadores = {
    dy_atual: 0.10,
    dy_12m: 0.10,
    p_vp: 0.10,
    vacancia_fisica: 0.10,
    vacancia_financeira: 0.10,
    liquidez: 0.10,
    volatilidade: 0.10,
    pl: 0.10,
    cotistas: 0.10,
    segmento: 0.10,
  };

  it("retorna número entre 0 e 100", () => {
    const score = calcularScoreComPesos(fundoBase, pesosIguais);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("produz resultado idêntico a calcularScore('moderado') com pesos moderados", () => {
    const pesosModerdo: PesosIndicadores = {
      dy_atual: 0.20,
      dy_12m: 0.10,
      p_vp: 0.15,
      vacancia_fisica: 0.10,
      vacancia_financeira: 0.10,
      liquidez: 0.10,
      volatilidade: 0.10,
      pl: 0.05,
      cotistas: 0.05,
      segmento: 0.05,
    };
    const scoreComPesos = calcularScoreComPesos(fundoBase, pesosModerdo);
    const scorePerfil = calcularScore(fundoBase, "moderado");
    expect(scoreComPesos).toBeCloseTo(scorePerfil, 5);
  });

  it("redistribui vacância nula dentro da dimensão Risco", () => {
    const fundoSemVacancia = { ...fundoBase, vacancia_fisica: null, vacancia_financeira: null };
    const score = calcularScoreComPesos(fundoSemVacancia, pesosIguais);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});
```

- [ ] **1.2 — Executar para confirmar falha**

```bash
cd frontend && npx vitest run src/lib/scoring.test.ts 2>&1 | tail -20
```
Esperado: `FAIL` com "calcularScoreComPesos is not a function".

- [ ] **1.3 — Exportar `PesosIndicadores` e adicionar `calcularScoreComPesos` em `src/lib/scoring.ts`**

Adicionar `export` à interface existente (linha 3):
```typescript
export interface PesosIndicadores {
  dy_atual: number;
  dy_12m: number;
  p_vp: number;
  vacancia_fisica: number;
  vacancia_financeira: number;
  liquidez: number;
  volatilidade: number;
  pl: number;
  cotistas: number;
  segmento: number;
}
```

Adicionar ao final do arquivo (após `calcularScore`):
```typescript
export function calcularScoreComPesos(
  fundo: FundoComIndicadores,
  pesos: PesosIndicadores
): number {
  const p = { ...pesos };

  if (fundo.vacancia_fisica === null) {
    const lib = p.vacancia_fisica;
    const tot = p.vacancia_financeira + p.liquidez + p.volatilidade;
    if (tot > 0) {
      p.vacancia_financeira += lib * (p.vacancia_financeira / tot);
      p.liquidez            += lib * (p.liquidez / tot);
      p.volatilidade        += lib * (p.volatilidade / tot);
    }
    p.vacancia_fisica = 0;
  }

  if (fundo.vacancia_financeira === null) {
    const lib = p.vacancia_financeira;
    const tot = p.vacancia_fisica + p.liquidez + p.volatilidade;
    if (tot > 0) {
      p.vacancia_fisica  += lib * (p.vacancia_fisica / tot);
      p.liquidez         += lib * (p.liquidez / tot);
      p.volatilidade     += lib * (p.volatilidade / tot);
    }
    p.vacancia_financeira = 0;
  }

  let soma = 0;
  if (fundo.dy_atual          !== null) soma += p.dy_atual          * calcularPontuacaoDY(fundo.dy_atual);
  if (fundo.dy_12m            !== null) soma += p.dy_12m            * calcularPontuacaoDY(fundo.dy_12m);
  if (fundo.p_vp              !== null) soma += p.p_vp              * calcularPontuacaoPVP(fundo.p_vp);
  if (fundo.vacancia_fisica   !== null) soma += p.vacancia_fisica   * calcularPontuacaoVacancia(fundo.vacancia_fisica);
  if (fundo.vacancia_financeira !== null) soma += p.vacancia_financeira * calcularPontuacaoVacancia(fundo.vacancia_financeira);
  if (fundo.liquidez_diaria   !== null) soma += p.liquidez          * calcularPontuacaoLiquidez(fundo.liquidez_diaria);
  if (fundo.volatilidade_12m  !== null) soma += p.volatilidade      * calcularPontuacaoVolatilidade(fundo.volatilidade_12m);
  if (fundo.patrimonio_liquido !== null) soma += p.pl               * calcularPontuacaoPL(fundo.patrimonio_liquido);
  if (fundo.num_cotistas      !== null) soma += p.cotistas          * calcularPontuacaoCotistas(fundo.num_cotistas);
  soma += p.segmento * calcularPontuacaoSegmento(fundo.segmento);

  return (soma / 5) * 100;
}
```

- [ ] **1.4 — Executar para confirmar aprovação**

```bash
npx vitest run src/lib/scoring.test.ts 2>&1 | tail -10
```
Esperado: todos os testes `PASS`.

- [ ] **1.5 — Commit**

```bash
git add src/lib/scoring.ts src/lib/scoring.test.ts
git commit -m "feat(scoring): exporta PesosIndicadores e adiciona calcularScoreComPesos"
```

---

## Task 2: Schema Zod para pesos customizados

**Files:**
- Create: `src/lib/pesosSchema.ts`
- Modify: `src/lib/scoring.test.ts`

- [ ] **2.1 — Escrever os testes que falham**

Adicionar ao final de `src/lib/scoring.test.ts`:

```typescript
import { pesosSchema, somaSchema } from "./pesosSchema";

describe("pesosSchema", () => {
  const pesosValidos = {
    dy_atual: 20, dy_12m: 10, p_vp: 15,
    vacancia_fisica: 10, vacancia_financeira: 10,
    liquidez: 10, volatilidade: 10,
    pl: 5, cotistas: 5, segmento: 5,
  };

  it("aceita pesos válidos que somam 100", () => {
    expect(pesosSchema.safeParse(pesosValidos).success).toBe(true);
  });

  it("rejeita quando a soma é diferente de 100", () => {
    const resultado = pesosSchema.safeParse({ ...pesosValidos, dy_atual: 25 });
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues[0].message).toContain("100");
    }
  });

  it("rejeita valores negativos", () => {
    const resultado = pesosSchema.safeParse({ ...pesosValidos, dy_atual: -5, dy_12m: 25 });
    expect(resultado.success).toBe(false);
  });

  it("rejeita valores acima de 60", () => {
    const resultado = pesosSchema.safeParse({ ...pesosValidos, dy_atual: 65, dy_12m: -25 });
    expect(resultado.success).toBe(false);
  });
});
```

- [ ] **2.2 — Executar para confirmar falha**

```bash
npx vitest run src/lib/scoring.test.ts 2>&1 | grep -E "FAIL|pesosSchema"
```
Esperado: `FAIL` com "Cannot find module './pesosSchema'".

- [ ] **2.3 — Criar `src/lib/pesosSchema.ts`**

```typescript
import { z } from "zod";

const campoSchema = z.number().min(0, "Mínimo 0").max(60, "Máximo 60 por indicador");

const basePesos = z.object({
  dy_atual:             campoSchema,
  dy_12m:               campoSchema,
  p_vp:                 campoSchema,
  vacancia_fisica:      campoSchema,
  vacancia_financeira:  campoSchema,
  liquidez:             campoSchema,
  volatilidade:         campoSchema,
  pl:                   campoSchema,
  cotistas:             campoSchema,
  segmento:             campoSchema,
});

export const pesosSchema = basePesos.superRefine((data, ctx) => {
  const soma = Object.values(data).reduce((acc, v) => acc + v, 0);
  if (Math.abs(soma - 100) > 0.01) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `A soma dos pesos deve ser 100 (atual: ${soma})`,
      path: ["_soma"],
    });
  }
});

export type PesosForm = z.infer<typeof basePesos>;
export type PesosValidados = z.infer<typeof pesosSchema>;

export const somaSchema = basePesos.transform((data) =>
  Object.values(data).reduce((acc, v) => acc + v, 0)
);
```

- [ ] **2.4 — Executar para confirmar aprovação**

```bash
npx vitest run src/lib/scoring.test.ts 2>&1 | tail -10
```
Esperado: todos os testes `PASS`.

- [ ] **2.5 — Commit**

```bash
git add src/lib/pesosSchema.ts src/lib/scoring.test.ts
git commit -m "feat(perfil): schema Zod para validação de pesos customizados"
```

---

## Task 3: Zustand store — adicionar pesos customizados

**Files:**
- Modify: `src/stores/perfilStore.ts`
- Modify: `src/hooks/useDashboard.ts`
- Modify: `src/hooks/useRanking.ts`

- [ ] **3.1 — Atualizar `src/stores/perfilStore.ts`**

```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TipoPerfil } from "@/types/domain";
import type { PesosIndicadores } from "@/lib/scoring";

interface PerfilState {
  tipo: TipoPerfil;
  pesosCustom: PesosIndicadores | null;
  setTipo: (tipo: TipoPerfil) => void;
  setPesosCustom: (pesos: PesosIndicadores | null) => void;
}

export const usePerfilStore = create<PerfilState>()(
  persist(
    (set) => ({
      tipo: "moderado",
      pesosCustom: null,
      setTipo: (tipo) => set({ tipo, pesosCustom: null }),
      setPesosCustom: (pesosCustom) => set({ pesosCustom }),
    }),
    { name: "fii-perfil-investidor" }
  )
);
```

Nota: `setTipo` zera `pesosCustom` para evitar inconsistência ao trocar de perfil.

- [ ] **3.2 — Atualizar `src/hooks/useDashboard.ts`**

Substituir o conteúdo completo:

```typescript
import { useMemo } from "react";
import { FUNDOS_MOCK } from "@/mocks";
import { calcularScore, calcularScoreComPesos, classificar } from "@/lib/scoring";
import { usePerfilStore } from "@/stores/perfilStore";
import type { FundoRanqueado, Classificacao } from "@/types/domain";

interface DashboardData {
  scoreMedio: number;
  totalFiis: number;
  topFiis: FundoRanqueado[];
  distribuicao: Record<Classificacao, number>;
}

export function useDashboard(): DashboardData {
  const perfil = usePerfilStore((s) => s.tipo);
  const pesosCustom = usePerfilStore((s) => s.pesosCustom);

  return useMemo(() => {
    const ranqueados: FundoRanqueado[] = FUNDOS_MOCK.map((f) => {
      const score = pesosCustom
        ? calcularScoreComPesos(f, pesosCustom)
        : calcularScore(f, perfil);
      return { ...f, score, classificacao: classificar(score) };
    }).sort((a, b) => b.score - a.score);

    const scoreMedio =
      ranqueados.reduce((acc, f) => acc + f.score, 0) / ranqueados.length;

    const distribuicao: Record<Classificacao, number> = {
      Excelente: 0, Bom: 0, Regular: 0, Evitar: 0,
    };
    ranqueados.forEach((f) => distribuicao[f.classificacao]++);

    return {
      scoreMedio: Math.round(scoreMedio * 10) / 10,
      totalFiis: ranqueados.length,
      topFiis: ranqueados.slice(0, 6),
      distribuicao,
    };
  }, [perfil, pesosCustom]);
}
```

- [ ] **3.3 — Atualizar `src/hooks/useRanking.ts`**

Substituir o conteúdo completo:

```typescript
import { useMemo, useState } from "react";
import { FUNDOS_MOCK } from "@/mocks";
import { calcularScore, calcularScoreComPesos, classificar } from "@/lib/scoring";
import { usePerfilStore } from "@/stores/perfilStore";
import type { FundoRanqueado, Classificacao } from "@/types/domain";

interface UseRankingResult {
  fundos: FundoRanqueado[];
  filtro: Classificacao | "Todas";
  setFiltro: (f: Classificacao | "Todas") => void;
  busca: string;
  setBusca: (b: string) => void;
}

export function useRanking(): UseRankingResult {
  const perfil = usePerfilStore((s) => s.tipo);
  const pesosCustom = usePerfilStore((s) => s.pesosCustom);
  const [filtro, setFiltro] = useState<Classificacao | "Todas">("Todas");
  const [busca, setBusca] = useState("");

  const fundos = useMemo(() => {
    const ranqueados: FundoRanqueado[] = FUNDOS_MOCK.map((f) => {
      const score = pesosCustom
        ? calcularScoreComPesos(f, pesosCustom)
        : calcularScore(f, perfil);
      return { ...f, score, classificacao: classificar(score) };
    }).sort((a, b) => b.score - a.score);

    return ranqueados.filter((f) => {
      const passaFiltro = filtro === "Todas" || f.classificacao === filtro;
      const passaBusca =
        busca === "" ||
        f.ticker.toLowerCase().includes(busca.toLowerCase()) ||
        f.nome.toLowerCase().includes(busca.toLowerCase());
      return passaFiltro && passaBusca;
    });
  }, [perfil, pesosCustom, filtro, busca]);

  return { fundos, filtro, setFiltro, busca, setBusca };
}
```

- [ ] **3.4 — Verificar build sem erros TypeScript**

```bash
npx tsc --noEmit 2>&1
```
Esperado: sem output (zero erros).

- [ ] **3.5 — Commit**

```bash
git add src/stores/perfilStore.ts src/hooks/useDashboard.ts src/hooks/useRanking.ts
git commit -m "feat(store): adiciona pesosCustom ao perfilStore; hooks consomem pesos customizados"
```

---

## Task 4: Recharts — ScoreBarChart no Dashboard

**Files:**
- Create: `src/components/charts/ScoreBarChart.tsx`
- Modify: `src/pages/DashboardPage.tsx`

- [ ] **4.1 — Criar `src/components/charts/ScoreBarChart.tsx`**

```typescript
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { Classificacao } from "@/types/domain";

interface Props {
  distribuicao: Record<Classificacao, number>;
}

const DADOS_ORDEM: Array<{ chave: Classificacao; cor: string }> = [
  { chave: "Excelente", cor: "#10b981" },
  { chave: "Bom",       cor: "#3b82f6" },
  { chave: "Regular",   cor: "#f59e0b" },
  { chave: "Evitar",    cor: "#ef4444" },
];

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 shadow-lg text-sm">
      <p className="font-medium text-gray-900 dark:text-gray-50">{label}</p>
      <p className="text-gray-500 dark:text-gray-400">{payload[0].value} FIIs</p>
    </div>
  );
}

export function ScoreBarChart({ distribuicao }: Props) {
  const dados = DADOS_ORDEM.map(({ chave, cor }) => ({
    nome: chave,
    valor: distribuicao[chave],
    cor,
  }));

  return (
    <ResponsiveContainer width="100%" height={120}>
      <BarChart data={dados} barSize={32} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
        <XAxis
          dataKey="nome"
          tick={{ fontSize: 11, fill: "currentColor" }}
          axisLine={false}
          tickLine={false}
          className="text-gray-500 dark:text-gray-400"
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: "currentColor" }}
          axisLine={false}
          tickLine={false}
          className="text-gray-500 dark:text-gray-400"
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "transparent" }} />
        <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
          {dados.map((entry) => (
            <Cell key={entry.nome} fill={entry.cor} opacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **4.2 — Adicionar o gráfico ao DashboardPage**

Em `src/pages/DashboardPage.tsx`, substituir o card "Distribuição" (segundo card da grid `<dl>`) pelo seguinte:

```tsx
import { ScoreBarChart } from "@/components/charts/ScoreBarChart";

{/* Card Distribuição — substituir o conteúdo de <dd> em diante */}
<div className={cardBase}>
  <dt className="text-sm font-medium text-gray-900 dark:text-gray-50">
    Distribuição por Classificação
  </dt>
  <dd className="mt-1 text-3xl font-semibold text-gray-900 dark:text-gray-50">
    {totalFiis}
    <span className="ml-1 text-base font-normal text-gray-500 dark:text-gray-400">
      fundos
    </span>
  </dd>
  <div className="mt-3">
    <ScoreBarChart distribuicao={distribuicao as Record<Classificacao, number>} />
  </div>
</div>
```

- [ ] **4.3 — Verificar build**

```bash
npx tsc --noEmit 2>&1
```
Esperado: sem output.

- [ ] **4.4 — Commit**

```bash
git add src/components/charts/ScoreBarChart.tsx src/pages/DashboardPage.tsx
git commit -m "feat(dashboard): adiciona ScoreBarChart com recharts"
```

---

## Task 5: Loading/Error states no Dashboard e Ranking

**Files:**
- Create: `src/components/ui/ErrorState.tsx`
- Modify: `src/pages/DashboardPage.tsx`
- Modify: `src/pages/RankingPage.tsx`

Nota: `src/components/ui/skeleton.tsx` já existe com `<Skeleton />` (animate-pulse, bg-muted).

- [ ] **5.1 — Criar `src/components/ui/ErrorState.tsx`**

```typescript
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Erro ao carregar dados",
  message = "Não foi possível conectar com o servidor. Verifique se o backend está rodando.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-red-200 dark:border-red-500/20",
        "bg-red-50 dark:bg-red-500/5 py-12 px-6 text-center",
        className
      )}
    >
      <AlertTriangle className="h-10 w-10 text-red-400 mb-3" />
      <p className="font-medium text-red-900 dark:text-red-300">{title}</p>
      <p className="text-sm text-red-600 dark:text-red-400 mt-1 max-w-sm">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}
```

- [ ] **5.2 — Adicionar skeletons de carregamento ao DashboardPage**

Em `src/pages/DashboardPage.tsx`, adicionar um estado `isLoading` simulado (preparado para a API futura) e renderizar skeletons. Adicionar no início do componente, logo após as importações existentes:

```tsx
import { Skeleton } from "@/components/ui/skeleton";
```

Adicionar no topo da função `DashboardPage`, antes do `return`:
```tsx
// Preparado para TanStack Query — quando a API chegar, isLoading vem do hook
const isLoading = false;
```

Envolver o conteúdo da `<dl>` com condicional. Substituir toda a `<dl>` por:

```tsx
{isLoading ? (
  <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
    {[1, 2, 3].map((i) => (
      <div key={i} className={cardBase}>
        <Skeleton className="h-4 w-32 mb-4" />
        <Skeleton className="h-8 w-20 mb-2" />
        <Skeleton className="h-2 w-full mt-4" />
        <Skeleton className="h-2 w-3/4 mt-2" />
      </div>
    ))}
  </dl>
) : (
  <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
    {/* ... cards existentes ... */}
  </dl>
)}
```

- [ ] **5.3 — Adicionar campo de busca ao RankingPage**

Em `src/pages/RankingPage.tsx`, adicionar o campo de busca usando o novo `busca`/`setBusca` do hook. No topo da função, após desestruturar `useRanking()`:

```tsx
const { fundos, filtro, setFiltro, busca, setBusca } = useRanking();
```

Adicionar o input de busca logo antes dos filtros pill (antes da div com `flex items-center gap-2 flex-wrap`):

```tsx
import { Search } from "lucide-react";

{/* Campo de busca */}
<div className="relative mb-4">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
  <input
    type="text"
    value={busca}
    onChange={(e) => setBusca(e.target.value)}
    placeholder="Buscar por ticker ou nome..."
    className={cn(
      "w-full sm:w-72 rounded-lg border py-2 pl-9 pr-3 text-sm outline-none transition-colors",
      "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
      "text-gray-900 dark:text-gray-50 placeholder:text-gray-400",
      "focus:border-blue-500 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
    )}
  />
</div>
```

- [ ] **5.4 — Verificar build**

```bash
npx tsc --noEmit 2>&1
```
Esperado: sem output.

- [ ] **5.5 — Commit**

```bash
git add src/components/ui/ErrorState.tsx src/pages/DashboardPage.tsx src/pages/RankingPage.tsx
git commit -m "feat(ux): ErrorState reutilizável, skeletons no dashboard, busca no ranking"
```

---

## Task 6: TanStack Table com sort e paginação no Ranking

**Files:**
- Modify: `src/pages/RankingPage.tsx`

- [ ] **6.1 — Reescrever `src/pages/RankingPage.tsx` com TanStack Table**

```tsx
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  createColumnHelper,
  flexRender,
  type SortingState,
} from "@tanstack/react-table";
import { useState } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useRanking } from "@/hooks/useRanking";
import { ClassificacaoBadge } from "@/components/ClassificacaoBadge";
import { Divider } from "@/components/ui/Divider";
import { cn } from "@/lib/utils";
import type { FundoRanqueado, Classificacao } from "@/types/domain";

type FiltroOpcao = Classificacao | "Todas";

const OPCOES_FILTRO: Array<{ valor: FiltroOpcao; rotulo: string }> = [
  { valor: "Todas",     rotulo: "Todas"     },
  { valor: "Excelente", rotulo: "Excelente" },
  { valor: "Bom",       rotulo: "Bom"       },
  { valor: "Regular",   rotulo: "Regular"   },
  { valor: "Evitar",    rotulo: "Evitar"    },
];

const SCORE_COLOR: Record<Classificacao, string> = {
  Excelente: "text-emerald-600 dark:text-emerald-400",
  Bom:       "text-blue-600 dark:text-blue-400",
  Regular:   "text-amber-600 dark:text-amber-400",
  Evitar:    "text-red-600 dark:text-red-400",
};

function fmt(v: number | null, suffix = "", dec = 1) {
  return v !== null ? `${v.toFixed(dec)}${suffix}` : "—";
}

function SortIcon({ sorted }: { sorted: false | "asc" | "desc" }) {
  if (sorted === "asc")  return <ChevronUp  className="h-3.5 w-3.5" />;
  if (sorted === "desc") return <ChevronDown className="h-3.5 w-3.5" />;
  return <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />;
}

const helper = createColumnHelper<FundoRanqueado>();

const columns = [
  helper.display({
    id: "posicao",
    header: "#",
    cell: (info) => (
      <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
        {info.row.index + 1}
      </span>
    ),
    enableSorting: false,
  }),
  helper.accessor("ticker", {
    header: "Ticker",
    cell: (info) => (
      <div>
        <p className="font-mono font-semibold text-sm text-gray-900 dark:text-gray-50">
          {info.getValue()}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[130px]">
          {info.row.original.nome}
        </p>
      </div>
    ),
  }),
  helper.accessor("segmento", {
    header: "Segmento",
    cell: (info) => (
      <span className="text-sm text-gray-500 dark:text-gray-400">
        {info.getValue() ?? "—"}
      </span>
    ),
  }),
  helper.accessor("score", {
    header: "Score",
    cell: (info) => (
      <span className={cn("font-bold tabular-nums text-sm", SCORE_COLOR[info.row.original.classificacao])}>
        {info.getValue().toFixed(1)}
      </span>
    ),
  }),
  helper.accessor("classificacao", {
    header: "Classificação",
    cell: (info) => <ClassificacaoBadge classificacao={info.getValue()} />,
    enableSorting: false,
  }),
  helper.accessor("dy_atual", {
    header: "DY Atual",
    cell: (info) => (
      <span className="text-sm tabular-nums text-gray-700 dark:text-gray-300">
        {fmt(info.getValue(), "%")}
      </span>
    ),
    meta: { align: "right" },
  }),
  helper.accessor("p_vp", {
    header: "P/VP",
    cell: (info) => (
      <span className="text-sm tabular-nums text-gray-700 dark:text-gray-300">
        {fmt(info.getValue(), "", 2)}
      </span>
    ),
    meta: { align: "right" },
  }),
  helper.accessor("vacancia_fisica", {
    header: "Vacância",
    cell: (info) => (
      <span className="text-sm tabular-nums text-gray-700 dark:text-gray-300">
        {fmt(info.getValue(), "%")}
      </span>
    ),
    meta: { align: "right" },
  }),
  helper.accessor("volatilidade_12m", {
    header: "Volatilidade",
    cell: (info) => (
      <span className="text-sm tabular-nums text-gray-700 dark:text-gray-300">
        {fmt(info.getValue(), "%")}
      </span>
    ),
    meta: { align: "right" },
  }),
];

export function RankingPage() {
  const { fundos, filtro, setFiltro, busca, setBusca } = useRanking();
  const [sorting, setSorting] = useState<SortingState>([{ id: "score", desc: true }]);

  const table = useReactTable({
    data: fundos,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">
            Ranking de FIIs
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {fundos.length} fundo{fundos.length !== 1 ? "s" : ""} encontrado{fundos.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <Divider />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar ticker ou nome..."
            className={cn(
              "w-full sm:w-64 rounded-lg border py-2 pl-9 pr-3 text-sm outline-none transition-colors",
              "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
              "text-gray-900 dark:text-gray-50 placeholder:text-gray-400",
              "focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            )}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {OPCOES_FILTRO.map(({ valor, rotulo }) => (
            <button
              key={valor}
              onClick={() => setFiltro(valor as FiltroOpcao)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-medium transition-all",
                filtro === valor
                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
              )}
            >
              {rotulo}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#090E1A] shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-gray-100 dark:border-gray-800">
                {hg.headers.map((header) => {
                  const meta = header.column.columnDef.meta as { align?: string } | undefined;
                  return (
                    <th
                      key={header.id}
                      className={cn(
                        "px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400",
                        meta?.align === "right" && "text-right",
                        header.column.getCanSort() && "cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-300"
                      )}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <span className="inline-flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          <SortIcon sorted={header.column.getIsSorted()} />
                        )}
                      </span>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-16 text-gray-400 dark:text-gray-500">
                  Nenhum FII encontrado.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-gray-100 dark:border-gray-800/60 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta as { align?: string } | undefined;
                    return (
                      <td
                        key={cell.id}
                        className={cn("px-4 py-3", meta?.align === "right" && "text-right")}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      <div className="flex items-center justify-between mt-4 text-sm text-gray-500 dark:text-gray-400">
        <span>
          Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()} · {fundos.length} FIIs
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **6.2 — Verificar build**

```bash
npx tsc --noEmit 2>&1
```
Esperado: sem output.

- [ ] **6.3 — Commit**

```bash
git add src/pages/RankingPage.tsx
git commit -m "feat(ranking): TanStack Table com sort, paginação e busca por ticker"
```

---

## Task 7: Formulário de pesos customizados no PerfilPage

**Files:**
- Modify: `src/pages/PerfilPage.tsx`

- [ ] **7.1 — Adicionar seção de pesos customizados ao `PerfilPage.tsx`**

Adicionar os imports no topo:

```tsx
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { pesosSchema, type PesosForm } from "@/lib/pesosSchema";
import { calcularScoreComPesos, classificar, type PesosIndicadores } from "@/lib/scoring";
import { FUNDOS_MOCK } from "@/mocks";
import { useMemo } from "react";
```

Adicionar os indicadores no arquivo (após as imports, antes do componente):

```tsx
const INDICADORES: Array<{ chave: keyof PesosForm; rotulo: string; dimensao: string }> = [
  { chave: "dy_atual",            rotulo: "DY Atual",             dimensao: "Rentabilidade" },
  { chave: "dy_12m",              rotulo: "DY 12M",               dimensao: "Rentabilidade" },
  { chave: "p_vp",                rotulo: "P/VP",                 dimensao: "Valuation"     },
  { chave: "vacancia_fisica",     rotulo: "Vacância Física",      dimensao: "Risco"         },
  { chave: "vacancia_financeira", rotulo: "Vacância Financeira",  dimensao: "Risco"         },
  { chave: "liquidez",            rotulo: "Liquidez Diária",      dimensao: "Risco"         },
  { chave: "volatilidade",        rotulo: "Volatilidade 12M",     dimensao: "Risco"         },
  { chave: "pl",                  rotulo: "Patrimônio Líquido",   dimensao: "Estrutura"     },
  { chave: "cotistas",            rotulo: "Nº de Cotistas",       dimensao: "Estrutura"     },
  { chave: "segmento",            rotulo: "Segmento",             dimensao: "Estrutura"     },
];

const PESOS_PADRAO_MODERADO: PesosForm = {
  dy_atual: 20, dy_12m: 10, p_vp: 15,
  vacancia_fisica: 10, vacancia_financeira: 10,
  liquidez: 10, volatilidade: 10,
  pl: 5, cotistas: 5, segmento: 5,
};
```

Adicionar o componente de pesos customizados no final do arquivo (antes do export):

```tsx
function PesosCustomizadosForm() {
  const { pesosCustom, setPesosCustom } = usePerfilStore();

  const defaultValues: PesosForm = pesosCustom
    ? {
        dy_atual:            Math.round(pesosCustom.dy_atual * 100),
        dy_12m:              Math.round(pesosCustom.dy_12m * 100),
        p_vp:                Math.round(pesosCustom.p_vp * 100),
        vacancia_fisica:     Math.round(pesosCustom.vacancia_fisica * 100),
        vacancia_financeira: Math.round(pesosCustom.vacancia_financeira * 100),
        liquidez:            Math.round(pesosCustom.liquidez * 100),
        volatilidade:        Math.round(pesosCustom.volatilidade * 100),
        pl:                  Math.round(pesosCustom.pl * 100),
        cotistas:            Math.round(pesosCustom.cotistas * 100),
        segmento:            Math.round(pesosCustom.segmento * 100),
      }
    : PESOS_PADRAO_MODERADO;

  const { control, handleSubmit, watch, reset, formState: { errors } } = useForm<PesosForm>({
    resolver: zodResolver(pesosSchema),
    defaultValues,
    mode: "onChange",
  });

  const valores = watch();
  const soma = Object.values(valores).reduce((a, v) => a + (Number(v) || 0), 0);

  const previewTop3 = useMemo(() => {
    if (Math.abs(soma - 100) > 0.01) return [];
    const pesos: PesosIndicadores = {
      dy_atual:            valores.dy_atual / 100,
      dy_12m:              valores.dy_12m / 100,
      p_vp:                valores.p_vp / 100,
      vacancia_fisica:     valores.vacancia_fisica / 100,
      vacancia_financeira: valores.vacancia_financeira / 100,
      liquidez:            valores.liquidez / 100,
      volatilidade:        valores.volatilidade / 100,
      pl:                  valores.pl / 100,
      cotistas:            valores.cotistas / 100,
      segmento:            valores.segmento / 100,
    };
    return FUNDOS_MOCK.map((f) => ({
      ticker: f.ticker,
      score: calcularScoreComPesos(f, pesos),
      classificacao: classificar(calcularScoreComPesos(f, pesos)),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  }, [valores, soma]);

  function onSubmit(data: PesosForm) {
    const pesos: PesosIndicadores = {
      dy_atual:            data.dy_atual / 100,
      dy_12m:              data.dy_12m / 100,
      p_vp:                data.p_vp / 100,
      vacancia_fisica:     data.vacancia_fisica / 100,
      vacancia_financeira: data.vacancia_financeira / 100,
      liquidez:            data.liquidez / 100,
      volatilidade:        data.volatilidade / 100,
      pl:                  data.pl / 100,
      cotistas:            data.cotistas / 100,
      segmento:            data.segmento / 100,
    };
    setPesosCustom(pesos);
  }

  function handleReset() {
    reset(PESOS_PADRAO_MODERADO);
    setPesosCustom(null);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={cn(cardBase, "mt-6")}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50">
            Pesos Customizados
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Ajuste os pesos individualmente. Soma deve ser exatamente 100%.
          </p>
        </div>
        {pesosCustom && (
          <span className="text-xs bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 rounded-full px-2.5 py-0.5 font-medium">
            Customizado ativo
          </span>
        )}
      </div>

      <div className="space-y-3 mb-5">
        {INDICADORES.map(({ chave, rotulo, dimensao }) => (
          <Controller
            key={chave}
            name={chave}
            control={control}
            render={({ field }) => (
              <div className="flex items-center gap-3">
                <span className="w-40 text-sm text-gray-600 dark:text-gray-300 shrink-0">{rotulo}</span>
                <input
                  type="range"
                  min={0}
                  max={60}
                  step={1}
                  value={Number(field.value)}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  className="flex-1 accent-blue-500"
                />
                <span className="w-10 text-right text-sm tabular-nums font-medium text-gray-700 dark:text-gray-300">
                  {field.value}%
                </span>
                <span className={cn("w-24 text-right text-xs", dimensaoCores[dimensao])}>
                  {dimensao}
                </span>
              </div>
            )}
          />
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-4 mb-4">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Soma atual:{" "}
          <span className={cn("font-semibold tabular-nums", Math.abs(soma - 100) < 0.01 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
            {soma}%
          </span>
          {" "}(meta: 100%)
        </span>
        {errors._soma && (
          <span className="text-xs text-red-500">{errors._soma.message as string}</span>
        )}
      </div>

      {previewTop3.length > 0 && (
        <div className="mb-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            Preview — Top 3 com estes pesos:
          </p>
          <div className="flex gap-4">
            {previewTop3.map((f, i) => (
              <div key={f.ticker}>
                <span className="text-xs text-gray-400">{i + 1}. </span>
                <span className="text-sm font-mono font-semibold text-gray-900 dark:text-gray-50">{f.ticker}</span>
                <span className={cn("ml-1 text-sm tabular-nums font-medium", SCORE_COLOR[f.classificacao])}>
                  {f.score.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={Math.abs(soma - 100) > 0.01}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Aplicar pesos
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Restaurar padrão
        </button>
      </div>
    </form>
  );
}
```

Por fim, adicionar `<PesosCustomizadosForm />` ao final do JSX do `PerfilPage`, após o card de explicação do modelo:

```tsx
<PesosCustomizadosForm />
```

Também adicionar `SCORE_COLOR` constante antes dos componentes (reutilizando a mesma paleta do RankingPage):

```tsx
const SCORE_COLOR: Record<Classificacao, string> = {
  Excelente: "text-emerald-600 dark:text-emerald-400",
  Bom:       "text-blue-600 dark:text-blue-400",
  Regular:   "text-amber-600 dark:text-amber-400",
  Evitar:    "text-red-600 dark:text-red-400",
};
```

- [ ] **7.2 — Instalar `@hookform/resolvers` (necessário para o zodResolver)**

```bash
npm install @hookform/resolvers 2>&1 | tail -5
```

- [ ] **7.3 — Verificar build**

```bash
npx tsc --noEmit 2>&1
```
Esperado: sem output.

- [ ] **7.4 — Commit**

```bash
git add src/pages/PerfilPage.tsx
git commit -m "feat(perfil): formulário de pesos customizados com React Hook Form + Zod"
```

---

## Self-Review

**Cobertura da spec:**
- ✅ TanStack Table com sort e paginação → Task 6
- ✅ Busca por ticker/nome → Tasks 5 e 6
- ✅ Recharts no Dashboard → Task 4
- ✅ Loading skeleton states → Task 5
- ✅ Error state reutilizável → Task 5
- ✅ Pesos customizados com Zod → Tasks 1, 2, 7
- ✅ React Hook Form → Task 7
- ✅ Zustand persistindo pesos → Task 3
- ✅ TDD para lógica de negócio → Tasks 1 e 2

**Tipos consistentes:**
- `PesosIndicadores` (exported de `scoring.ts`) → usada em Tasks 1, 3, 7
- `PesosForm` (de `pesosSchema.ts`) usa `number` inteiro (0-60); convertida para decimal (÷100) antes de passar ao scoring → consistente em Tasks 2 e 7
- `calcularScoreComPesos(fundo, pesos)` definida em Task 1, consumida em Tasks 3 e 7

**Dependências externas adicionadas:**
- `@hookform/resolvers` → Task 7.2

**Ordem de execução:** Tasks podem ser feitas na sequência 1→2→3→4→5→6→7. Tasks 4, 5, 6 são independentes entre si após a Task 3.
