# Fundação UX — Redesign + Auth-everywhere — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> ⚠️ **Git:** o usuário exige autorização explícita antes de QUALQUER comando git. Os `git commit` abaixo só rodam após o "pode commitar". Trabalhar de dentro de `frontend/` (cwd) — `npx vitest`/`tsc`/`npm` precisam rodar lá, não na raiz.

**Goal:** Tornar o app 100% mobile-first com bottom-nav de 5 abas, design system "acolhedor" (teal) e todas as rotas atrás de login — reaproveitando as telas atuais reestilizadas.

**Architecture:** Tailwind v3 + tokens oklch (variáveis CSS) **ligados** ao `tailwind.config` (corrige gap onde `bg-primary` era no-op). `AppShell` autenticado com `BottomNav` fixa; `/login` e `/registro` fora do shell. Telas atuais viram sub-seções das 5 abas (Início, Carteira, Análise=Ranking+Clusters, IA=em breve, Perfil). Componentes reutilizáveis novos (`MoneyValue`, `ClasseBadge`, `IndicadorExplain`, `EmptyState`).

**Tech Stack:** React 19 · TS strict · Vite · Tailwind v3 · shadcn/ui · React Router v6 · TanStack Query · Zustand · Vitest/RTL.

Spec: [`docs/superpowers/specs/2026-06-07-fundacao-ux-redesign-auth-design.md`](../specs/2026-06-07-fundacao-ux-redesign-auth-design.md).

> **Nota de teste (React 19 + Vitest 4):** NÃO testar caminho de erro via Promise rejeitada em event handler (surfaceia como falha mesmo tratada). Testar caminho feliz; erro no e2e. Sempre rodar vitest/tsc de dentro de `frontend/`.

---

## File Structure

**Criados:** `src/lib/formato.ts`, `src/lib/glossario.ts`, `src/components/ui/MoneyValue.tsx`, `src/components/ui/ClasseBadge.tsx`, `src/components/ui/IndicadorExplain.tsx`, `src/components/ui/EmptyState.tsx`, `src/components/layout/BottomNav.tsx`, `src/components/layout/AppShell.tsx`, `src/pages/InicioPage.tsx`, `src/pages/AnalisePage.tsx`, `src/pages/IAPage.tsx` (+ testes `*.test.ts(x)`).

**Modificados:** `src/index.css` (tokens teal/warm), `tailwind.config.ts` (mapear cores), `src/App.tsx` (rotas + auth-everywhere), `src/components/layout/Layout.tsx` (→ AppShell), e reestilização de `LoginPage`, `RegisterPage`, `CarteiraPage`, `RankingPage`, `ClustersPage`, `PerfilPage`.

**Aposentado:** `src/components/layout/Navigation.tsx` (substituído por AppShell+BottomNav).

---

# PARTE A — DESIGN SYSTEM

## Task 1: Ligar tokens ao Tailwind + paleta teal/acolhedor

**Files:** Modify `frontend/tailwind.config.ts`, `frontend/src/index.css`

- [ ] **Step 1: Mapear as cores no Tailwind** (hoje só `--radius` é mapeado → `bg-primary` é no-op)

Substituir `theme.extend` em `frontend/tailwind.config.ts` por:
```ts
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: { DEFAULT: "var(--card)", foreground: "var(--card-foreground)" },
        popover: { DEFAULT: "var(--popover)", foreground: "var(--popover-foreground)" },
        primary: { DEFAULT: "var(--primary)", foreground: "var(--primary-foreground)" },
        secondary: { DEFAULT: "var(--secondary)", foreground: "var(--secondary-foreground)" },
        muted: { DEFAULT: "var(--muted)", foreground: "var(--muted-foreground)" },
        accent: { DEFAULT: "var(--accent)", foreground: "var(--accent-foreground)" },
        destructive: { DEFAULT: "var(--destructive)", foreground: "var(--destructive-foreground)" },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
```

- [ ] **Step 2: Paleta teal + neutro quente** — em `frontend/src/index.css`, no `:root` trocar os valores de `--background`, `--primary`, `--primary-foreground`, `--ring`, `--accent`, `--radius`:
```css
  --background: oklch(0.975 0.006 90);   /* off-white quente */
  --primary: oklch(0.52 0.10 180);        /* teal #0f766e ~ */
  --primary-foreground: oklch(0.99 0 0);
  --accent: oklch(0.95 0.03 180);
  --accent-foreground: oklch(0.35 0.06 180);
  --ring: oklch(0.52 0.10 180);
  --radius: 0.875rem;                     /* cards mais arredondados */
```
No `.dark`, trocar `--primary` e `--ring`:
```css
  --primary: oklch(0.72 0.12 180);
  --ring: oklch(0.72 0.12 180);
```

- [ ] **Step 3: Verificar build + sem regressão**

Run: `cd frontend && npx tsc --noEmit && npm run build 2>&1 | tail -3 && npx vitest run 2>&1 | tail -4`
Expected: tsc limpo, build ok, todos os testes passam (20).

- [ ] **Step 4: Commit**
```bash
git add frontend/tailwind.config.ts frontend/src/index.css
git commit -m "feat(ui): liga tokens ao Tailwind + paleta acolhedor teal (RNF-05, RNF-01)"
```

---

## Task 2: `lib/formato.ts` — formatadores pt-BR (TDD)

**Files:** Test `frontend/src/lib/formato.test.ts` · Create `frontend/src/lib/formato.ts`

- [ ] **Step 1: Teste que falha** — criar `frontend/src/lib/formato.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { formatMoeda, formatPercent, formatNumero } from "./formato";

describe("formato pt-BR", () => {
  it("moeda a partir de string decimal", () => {
    expect(formatMoeda("1000.00")).toBe("R$ 1.000,00");
    expect(formatMoeda(2200.5)).toBe("R$ 2.200,50");
  });
  it("percentual com 1 casa", () => {
    expect(formatPercent(9.2)).toBe("9,2%");
  });
  it("numero com separador de milhar", () => {
    expect(formatNumero(12400)).toBe("12.400");
  });
});
```

- [ ] **Step 2: Rodar (RED)** — `cd frontend && npx vitest run src/lib/formato.test.ts` → FAIL (módulo inexistente).

- [ ] **Step 3: Implementar** — criar `frontend/src/lib/formato.ts`:
```ts
const NBSP = " "; // Intl usa NBSP entre "R$" e o número

export function formatMoeda(valor: string | number): string {
  const n = typeof valor === "string" ? Number(valor) : valor;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
    .format(n)
    .replace(NBSP, " ");
}

export function formatPercent(valor: number, casas = 1): string {
  return `${new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }).format(valor)}%`;
}

export function formatNumero(valor: number): string {
  return new Intl.NumberFormat("pt-BR").format(valor);
}
```

- [ ] **Step 4: Rodar (GREEN)** — `cd frontend && npx vitest run src/lib/formato.test.ts` → PASS (3).

- [ ] **Step 5: Commit**
```bash
git add frontend/src/lib/formato.ts frontend/src/lib/formato.test.ts
git commit -m "feat(ui): formatadores de moeda/percentual/numero pt-BR (RNF-01)"
```

---

## Task 3: `lib/glossario.ts` — glossário de indicadores (TDD)

**Files:** Test `frontend/src/lib/glossario.test.ts` · Create `frontend/src/lib/glossario.ts`

- [ ] **Step 1: Teste que falha**:
```ts
import { describe, it, expect } from "vitest";
import { explicarIndicador, GLOSSARIO } from "./glossario";

describe("glossario", () => {
  it("retorna explicação de iniciante para DY", () => {
    const e = explicarIndicador("dy_atual");
    expect(e).not.toBeNull();
    expect(e!.titulo.toLowerCase()).toContain("dividend");
    expect(e!.simples.length).toBeGreaterThan(10);
  });
  it("retorna null para chave desconhecida", () => {
    expect(explicarIndicador("inexistente")).toBeNull();
  });
  it("cobre os indicadores principais", () => {
    for (const k of ["dy_atual", "p_vp", "vacancia_fisica", "liquidez_diaria", "volatilidade_12m"])
      expect(GLOSSARIO[k]).toBeDefined();
  });
});
```

- [ ] **Step 2: RED** — `cd frontend && npx vitest run src/lib/glossario.test.ts` → FAIL.

- [ ] **Step 3: Implementar** — criar `frontend/src/lib/glossario.ts`:
```ts
export interface ExplicacaoIndicador {
  titulo: string;
  simples: string; // linguagem de iniciante (P1)
}

export const GLOSSARIO: Record<string, ExplicacaoIndicador> = {
  dy_atual: { titulo: "Dividend Yield (DY)", simples: "Quanto o fundo paga de rendimento por ano em relação ao preço da cota. Quanto maior, mais renda — mas DY muito alto pode indicar risco." },
  dy_12m: { titulo: "DY 12 meses", simples: "A média do rendimento pago nos últimos 12 meses. Mostra a consistência dos pagamentos." },
  p_vp: { titulo: "P/VP", simples: "Compara o preço da cota com o valor patrimonial. Abaixo de 1 significa que está 'mais barato' que o patrimônio." },
  vacancia_fisica: { titulo: "Vacância física", simples: "Percentual dos imóveis do fundo que estão desocupados. Quanto menor, melhor." },
  vacancia_financeira: { titulo: "Vacância financeira", simples: "Percentual da receita de aluguéis que o fundo deixa de receber por inadimplência ou desocupação." },
  liquidez_diaria: { titulo: "Liquidez diária", simples: "Quanto é negociado por dia. Alta liquidez facilita comprar e vender sem afetar muito o preço." },
  volatilidade_12m: { titulo: "Volatilidade 12M", simples: "O quanto o preço da cota oscila. Menor volatilidade costuma significar menos sustos." },
  patrimonio_liquido: { titulo: "Patrimônio líquido", simples: "O tamanho do fundo. Fundos maiores tendem a ser mais estáveis." },
  num_cotistas: { titulo: "Número de cotistas", simples: "Quantas pessoas investem no fundo. Mais cotistas costuma indicar mais liquidez e pulverização." },
  duration: { titulo: "Duration", simples: "Prazo médio dos recebíveis de um FIAGRO/FII de papel. Duration maior é mais sensível a juros." },
};

export function explicarIndicador(chave: string): ExplicacaoIndicador | null {
  return GLOSSARIO[chave] ?? null;
}
```

- [ ] **Step 4: GREEN** — PASS (3).

- [ ] **Step 5: Commit**
```bash
git add frontend/src/lib/glossario.ts frontend/src/lib/glossario.test.ts
git commit -m "feat(ui): glossário inicial de indicadores em linguagem de iniciante (RF-42)"
```

---

## Task 4: `MoneyValue` (TDD)

**Files:** Test `frontend/src/components/ui/MoneyValue.test.tsx` · Create `frontend/src/components/ui/MoneyValue.tsx`

- [ ] **Step 1: Teste**:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MoneyValue } from "./MoneyValue";

describe("MoneyValue", () => {
  it("formata string decimal como R$ pt-BR", () => {
    render(<MoneyValue valor="1000.00" />);
    expect(screen.getByText("R$ 1.000,00")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: RED** — FAIL.

- [ ] **Step 3: Implementar**:
```tsx
import { formatMoeda } from "@/lib/formato";

interface Props {
  valor: string | number;
  className?: string;
}

export function MoneyValue({ valor, className }: Props) {
  return <span className={className}>{formatMoeda(valor)}</span>;
}
```

- [ ] **Step 4: GREEN** — PASS.

- [ ] **Step 5: Commit**
```bash
git add frontend/src/components/ui/MoneyValue.tsx frontend/src/components/ui/MoneyValue.test.tsx
git commit -m "feat(ui): componente MoneyValue (R$ pt-BR)"
```

---

## Task 5: `ClasseBadge` (TDD)

**Files:** Test `frontend/src/components/ui/ClasseBadge.test.tsx` · Create `frontend/src/components/ui/ClasseBadge.tsx`

- [ ] **Step 1: Teste**:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ClasseBadge } from "./ClasseBadge";

describe("ClasseBadge", () => {
  it("mostra FII", () => { render(<ClasseBadge classe="FII" />); expect(screen.getByText("FII")).toBeInTheDocument(); });
  it("mostra FIAGRO", () => { render(<ClasseBadge classe="FIAGRO" />); expect(screen.getByText("FIAGRO")).toBeInTheDocument(); });
});
```

- [ ] **Step 2: RED** — FAIL.

- [ ] **Step 3: Implementar**:
```tsx
interface Props {
  classe: string;
}

export function ClasseBadge({ classe }: Props) {
  const isFiagro = classe === "FIAGRO";
  const cor = isFiagro
    ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
    : "bg-primary/10 text-primary";
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${cor}`}>
      {classe}
    </span>
  );
}
```

- [ ] **Step 4: GREEN** — PASS.

- [ ] **Step 5: Commit**
```bash
git add frontend/src/components/ui/ClasseBadge.tsx frontend/src/components/ui/ClasseBadge.test.tsx
git commit -m "feat(ui): ClasseBadge FII/FIAGRO"
```

---

## Task 6: `IndicadorExplain` (TDD)

**Files:** Test `frontend/src/components/ui/IndicadorExplain.test.tsx` · Create `frontend/src/components/ui/IndicadorExplain.tsx`

- [ ] **Step 1: Teste** (toque no "?" revela a explicação):
```tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { IndicadorExplain } from "./IndicadorExplain";

describe("IndicadorExplain", () => {
  it("mostra rótulo e valor; explicação só após clicar", () => {
    render(<IndicadorExplain chave="dy_atual" rotulo="DY" valor="9,2%" />);
    expect(screen.getByText("DY")).toBeInTheDocument();
    expect(screen.getByText("9,2%")).toBeInTheDocument();
    expect(screen.queryByText(/rendimento por ano/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /explicar dy/i }));
    expect(screen.getByText(/rendimento por ano/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: RED** — FAIL.

- [ ] **Step 3: Implementar**:
```tsx
import { useState } from "react";
import { explicarIndicador } from "@/lib/glossario";

interface Props {
  chave: string;
  rotulo: string;
  valor: string;
}

export function IndicadorExplain({ chave, rotulo, valor }: Props) {
  const [aberto, setAberto] = useState(false);
  const exp = explicarIndicador(chave);
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{rotulo}</span>
        {exp && (
          <button
            type="button"
            aria-label={`Explicar ${rotulo}`}
            onClick={() => setAberto((a) => !a)}
            className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary"
          >
            ?
          </button>
        )}
      </div>
      <div className="text-lg font-semibold text-foreground">{valor}</div>
      {aberto && exp && (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{exp.simples}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: GREEN** — PASS.

- [ ] **Step 5: Commit**
```bash
git add frontend/src/components/ui/IndicadorExplain.tsx frontend/src/components/ui/IndicadorExplain.test.tsx
git commit -m "feat(ui): IndicadorExplain — explicação de indicador em 1 toque (RF-39/40/42)"
```

---

## Task 7: `EmptyState` (TDD leve)

**Files:** Test `frontend/src/components/ui/EmptyState.test.tsx` · Create `frontend/src/components/ui/EmptyState.tsx`

- [ ] **Step 1: Teste**:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "./EmptyState";

it("renderiza título e descrição", () => {
  render(<EmptyState titulo="Em breve" descricao="Assistente de IA" />);
  expect(screen.getByText("Em breve")).toBeInTheDocument();
  expect(screen.getByText("Assistente de IA")).toBeInTheDocument();
});
```

- [ ] **Step 2: RED** — FAIL.

- [ ] **Step 3: Implementar**:
```tsx
import type { ReactNode } from "react";

interface Props {
  titulo: string;
  descricao: string;
  icone?: ReactNode;
}

export function EmptyState({ titulo, descricao, icone }: Props) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-6 text-center">
      {icone && <div className="text-4xl">{icone}</div>}
      <h2 className="text-lg font-semibold text-foreground">{titulo}</h2>
      <p className="max-w-xs text-sm text-muted-foreground">{descricao}</p>
    </div>
  );
}
```

- [ ] **Step 4: GREEN** — PASS.

- [ ] **Step 5: Commit**
```bash
git add frontend/src/components/ui/EmptyState.tsx frontend/src/components/ui/EmptyState.test.tsx
git commit -m "feat(ui): EmptyState"
```

---

# PARTE B — SHELL + AUTH-EVERYWHERE

## Task 8: `BottomNav` (TDD)

**Files:** Test `frontend/src/components/layout/BottomNav.test.tsx` · Create `frontend/src/components/layout/BottomNav.tsx`

- [ ] **Step 1: Teste**:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { BottomNav } from "./BottomNav";

it("renderiza as 5 abas", () => {
  render(<MemoryRouter><BottomNav /></MemoryRouter>);
  for (const t of ["Início", "Carteira", "Análise", "IA", "Perfil"])
    expect(screen.getByText(t)).toBeInTheDocument();
});
```

- [ ] **Step 2: RED** — FAIL.

- [ ] **Step 3: Implementar** (ícones lucide; estado ativo via NavLink):
```tsx
import { NavLink } from "react-router-dom";
import { Home, Wallet, BarChart3, Sparkles, User } from "lucide-react";
import { cn } from "@/lib/utils";

const ABAS = [
  { to: "/", label: "Início", Icon: Home, end: true },
  { to: "/carteira", label: "Carteira", Icon: Wallet, end: false },
  { to: "/analise", label: "Análise", Icon: BarChart3, end: false },
  { to: "/ia", label: "IA", Icon: Sparkles, end: false },
  { to: "/perfil", label: "Perfil", Icon: User, end: false },
];

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {ABAS.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px]",
                isActive ? "text-primary" : "text-muted-foreground"
              )
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
```

- [ ] **Step 4: GREEN** — PASS.

- [ ] **Step 5: Commit**
```bash
git add frontend/src/components/layout/BottomNav.tsx frontend/src/components/layout/BottomNav.test.tsx
git commit -m "feat(ui): BottomNav mobile com 5 abas (RNF-05)"
```

---

## Task 9: `AppShell`

**Files:** Create `frontend/src/components/layout/AppShell.tsx`

- [ ] **Step 1: Implementar** (conteúdo + BottomNav; padding-bottom p/ não cobrir conteúdo):
```tsx
import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto w-full max-w-md px-4 pb-20 pt-4">{children}</main>
      <BottomNav />
    </div>
  );
}
```

- [ ] **Step 2: Verificar tipos** — `cd frontend && npx tsc --noEmit` → limpo.

- [ ] **Step 3: Commit**
```bash
git add frontend/src/components/layout/AppShell.tsx
git commit -m "feat(ui): AppShell (conteúdo + BottomNav)"
```

---

## Task 10: Auth-everywhere — rotas (TDD)

**Files:** Test `frontend/src/App.routing.test.tsx` · Modify `frontend/src/App.tsx`, `frontend/src/components/layout/Layout.tsx`

- [ ] **Step 1: Teste de roteamento** — criar `frontend/src/App.routing.test.tsx` (deslogado → login; logado → Início). Mocka as páginas pesadas para isolar o roteamento:
```tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";

vi.mock("@/pages/InicioPage", () => ({ InicioPage: () => <div>INICIO</div> }));
vi.mock("@/pages/LoginPage", () => ({ LoginPage: () => <div>LOGIN</div> }));
vi.mock("@/components/layout/BottomNav", () => ({ BottomNav: () => <nav /> }));

import { AppRoutes } from "./App";

function renderEm(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}><AppRoutes /></MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => useAuthStore.getState().logout());

describe("auth-everywhere", () => {
  it("rota raiz sem token redireciona para login", () => {
    renderEm("/");
    expect(screen.getByText("LOGIN")).toBeInTheDocument();
  });
  it("rota raiz com token mostra Início", () => {
    useAuthStore.getState().setAuth("t", { id: 1, email: "a@b.com" });
    renderEm("/");
    expect(screen.getByText("INICIO")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: RED** — `cd frontend && npx vitest run src/App.routing.test.tsx` → FAIL (`AppRoutes` não exportado).

- [ ] **Step 3: Reescrever `App.tsx`** — exporta `AppRoutes` (testável) e protege tudo:
```tsx
import { Routes, Route } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { InicioPage } from "@/pages/InicioPage";
import { CarteiraPage } from "@/pages/CarteiraPage";
import { AnalisePage } from "@/pages/AnalisePage";
import { IAPage } from "@/pages/IAPage";
import { PerfilPage } from "@/pages/PerfilPage";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registro" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route
          element={
            <AppShell>
              <Outlet />
            </AppShell>
          }
        >
          <Route path="/" element={<InicioPage />} />
          <Route path="/carteira" element={<CarteiraPage />} />
          <Route path="/analise" element={<AnalisePage />} />
          <Route path="/ia" element={<IAPage />} />
          <Route path="/perfil" element={<PerfilPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default function App() {
  return <AppRoutes />;
}
```
> Adicionar no topo: `import { Routes, Route, Outlet } from "react-router-dom";` (inclui `Outlet`). `ProtectedRoute` já renderiza `<Outlet/>` quando autenticado (S1) — aqui o Outlet interno injeta a página dentro do AppShell.

- [ ] **Step 4: Layout deixa de embrulhar** — `App` não usa mais `Layout`/`Navigation` (o AppShell assume). Em `frontend/src/main.tsx` confirmar que `App` é renderizado dentro de `BrowserRouter` (já é). Não mexer no `Layout.tsx` ainda (removido na Task 18).

- [ ] **Step 5: GREEN** — `cd frontend && npx vitest run src/App.routing.test.tsx` → PASS (2). (As páginas Inicio/Analise/IA são criadas nas Tasks 11-13; se ainda não existirem, este passo roda após elas — ver ordem. Para destravar, pode criar stubs mínimos que exportam um div e substituí-los nas tasks seguintes.)

> **Ordem:** Tasks 11-13 (páginas) podem vir ANTES da Task 10 para evitar import quebrado. Recomendado executar 11→12→13→10. O teste de roteamento mocka InicioPage/LoginPage, então não exige as reais — mas o import de `AnalisePage`/`IAPage`/`CarteiraPage`/`PerfilPage` precisa resolver. Crie as páginas (11-13) antes de reescrever o App.

- [ ] **Step 6: Commit**
```bash
git add frontend/src/App.tsx frontend/src/App.routing.test.tsx
git commit -m "feat(auth): auth-everywhere — todas as rotas dentro do AppShell protegido (RNF-02')"
```

---

# PARTE C — PÁGINAS

> Execute 11→12→13 ANTES da Task 10 (imports). Cada página usa os componentes das Partes A/B.

## Task 11: `IAPage` (em breve)

**Files:** Test `frontend/src/pages/IAPage.test.tsx` · Create `frontend/src/pages/IAPage.tsx`

- [ ] **Step 1: Teste**:
```tsx
import { it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { IAPage } from "./IAPage";

it("anuncia o assistente em breve", () => {
  render(<IAPage />);
  expect(screen.getByText(/em breve/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: RED** — FAIL.

- [ ] **Step 3: Implementar**:
```tsx
import { EmptyState } from "@/components/ui/EmptyState";

export function IAPage() {
  return (
    <EmptyState
      icone={<span>✨</span>}
      titulo="Assistente de IA — em breve"
      descricao="Aqui você vai poder perguntar, em linguagem simples, por que um fundo recebeu cada nota — sempre ancorado nos dados que o sistema calculou."
    />
  );
}
```

- [ ] **Step 4: GREEN** — PASS.

- [ ] **Step 5: Commit**
```bash
git add frontend/src/pages/IAPage.tsx frontend/src/pages/IAPage.test.tsx
git commit -m "feat(ia): aba IA com empty-state 'em breve' (RF-38 placeholder)"
```

---

## Task 12: `AnalisePage` — Ranking + Clusters em sub-abas (TDD)

**Files:** Test `frontend/src/pages/AnalisePage.test.tsx` · Create `frontend/src/pages/AnalisePage.tsx`

> Reaproveita os componentes existentes `RankingPage` e `ClustersPage` como sub-views (sem reescrevê-los aqui; a reestilização deles é a Task 16).

- [ ] **Step 1: Teste** (troca de sub-aba):
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AnalisePage } from "./AnalisePage";

vi.mock("./RankingPage", () => ({ RankingPage: () => <div>RANKING</div> }));
vi.mock("./ClustersPage", () => ({ ClustersPage: () => <div>CLUSTERS</div> }));

describe("AnalisePage", () => {
  it("mostra Ranking por padrão e troca para Clusters", () => {
    render(<AnalisePage />);
    expect(screen.getByText("RANKING")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /clusters/i }));
    expect(screen.getByText("CLUSTERS")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: RED** — FAIL.

- [ ] **Step 3: Implementar**:
```tsx
import { useState } from "react";
import { cn } from "@/lib/utils";
import { RankingPage } from "./RankingPage";
import { ClustersPage } from "./ClustersPage";

type Sub = "ranking" | "clusters";

export function AnalisePage() {
  const [sub, setSub] = useState<Sub>("ranking");
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">Análise</h1>
      <div role="tablist" className="flex gap-2">
        {(["ranking", "clusters"] as const).map((s) => (
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
            {s === "ranking" ? "Ranking" : "Clusters"}
          </button>
        ))}
      </div>
      {sub === "ranking" ? <RankingPage /> : <ClustersPage />}
    </div>
  );
}
```

- [ ] **Step 4: GREEN** — PASS.

- [ ] **Step 5: Commit**
```bash
git add frontend/src/pages/AnalisePage.tsx frontend/src/pages/AnalisePage.test.tsx
git commit -m "feat(analise): aba Análise unindo Ranking e Clusters em sub-abas (RF-15/20)"
```

---

## Task 13: `InicioPage` — home agregadora (TDD)

**Files:** Test `frontend/src/pages/InicioPage.test.tsx` · Create `frontend/src/pages/InicioPage.tsx`

> Compõe `useCarteira` (patrimônio) + `useDashboard` (destaques do ranking, já existente). Mocka ambos no teste.

- [ ] **Step 1: Teste**:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { InicioPage } from "./InicioPage";

vi.mock("@/hooks/useCarteira", () => ({
  useCarteira: () => ({
    resumo: { total_investido: "12400.00", por_classe: { FII: "9400.00", FIAGRO: "3000.00" }, num_posicoes: 4 },
    posicoes: [], isLoading: false, isError: false,
    aporte: { mutate: vi.fn() }, remover: { mutate: vi.fn() },
  }),
}));
vi.mock("@/hooks/useDashboard", () => ({
  useDashboard: () => ({
    scoreMedio: 70, totalFiis: 50,
    topFiis: [{ ticker: "HGLG11", nome: "CSHG Log", segmento: "Logística", score: 72, classificacao: "Bom" }],
    distribuicao: { Excelente: 5, Bom: 20, Regular: 15, Evitar: 10 }, isLoading: false, isError: false,
  }),
}));

describe("InicioPage", () => {
  it("mostra patrimônio e um destaque do ranking", () => {
    render(<MemoryRouter><InicioPage /></MemoryRouter>);
    expect(screen.getByText("R$ 12.400,00")).toBeInTheDocument();
    expect(screen.getByText("HGLG11")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: RED** — FAIL.

- [ ] **Step 3: Implementar**:
```tsx
import { Link } from "react-router-dom";
import { useCarteira } from "@/hooks/useCarteira";
import { useDashboard } from "@/hooks/useDashboard";
import { MoneyValue } from "@/components/ui/MoneyValue";
import { ClassificacaoBadge } from "@/components/ClassificacaoBadge";

export function InicioPage() {
  const { resumo } = useCarteira();
  const { topFiis } = useDashboard();

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold text-foreground">Olá 👋</h1>

      <Link to="/carteira" className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <p className="text-sm text-muted-foreground">Patrimônio investido</p>
        <MoneyValue
          valor={resumo?.total_investido ?? "0.00"}
          className="text-3xl font-extrabold text-primary"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          FII <MoneyValue valor={resumo?.por_classe?.FII ?? "0.00"} /> · FIAGRO{" "}
          <MoneyValue valor={resumo?.por_classe?.FIAGRO ?? "0.00"} />
        </p>
      </Link>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Destaques para você</h2>
          <Link to="/analise" className="text-xs font-medium text-primary">Ver análise</Link>
        </div>
        <ul className="flex flex-col gap-2">
          {topFiis.slice(0, 3).map((f) => (
            <li key={f.ticker} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
              <div>
                <p className="font-medium text-foreground">{f.ticker}</p>
                <p className="text-xs text-muted-foreground">{f.nome ?? f.ticker}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold tabular-nums text-foreground">{f.score.toFixed(0)}</span>
                <ClassificacaoBadge classificacao={f.classificacao} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="rounded-2xl border border-border bg-accent/40 p-4">
        <p className="text-sm font-semibold text-foreground">💡 Aprenda enquanto investe</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Toque no "?" ao lado de qualquer indicador para entender o que ele significa, sem jargão.
        </p>
      </div>
    </div>
  );
}
```
> Verificar a assinatura real de `ClassificacaoBadge` (prop `classificacao`) ao implementar; se diferir, ajustar. `useDashboard` já existe e expõe `topFiis`/`distribuicao`.

- [ ] **Step 4: GREEN** — PASS.

- [ ] **Step 5: Commit**
```bash
git add frontend/src/pages/InicioPage.tsx frontend/src/pages/InicioPage.test.tsx
git commit -m "feat(inicio): home agregadora (patrimônio + destaques + educação) (RF-04, RF-42)"
```

---

## Task 14: Re-skin Login + Registro (tela cheia acolhedor)

**Files:** Modify `frontend/src/pages/LoginPage.tsx`, `frontend/src/pages/RegisterPage.tsx`

> Mantém a lógica (useAuth, useState, navigate) — troca só o wrapper/estilo para tela cheia centrada com o card acolhedor. Os testes existentes (`LoginPage.test.tsx`) devem continuar passando (labels e botão inalterados).

- [ ] **Step 1: Aplicar o shell de auth** — em ambas, trocar o `<div>` raiz por:
```tsx
    <div className="flex min-h-screen flex-col justify-center gap-6 bg-background px-6">
      <div className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-2xl">📈</div>
        <h1 className="text-2xl font-bold text-foreground">{/* "Entrar" ou "Criar conta" */}</h1>
        <p className="text-sm text-muted-foreground">FII Insights</p>
      </div>
      {/* ...form existente, com inputs: className="rounded-xl border border-input bg-card px-3 py-2.5 text-foreground" ... */}
      {/* botão: className="rounded-xl bg-primary py-2.5 font-semibold text-primary-foreground" */}
    </div>
```
Aplicar as classes de input/botão acima nos campos e no submit; manter `aria-label`/labels e o `role="alert"` do erro. Não alterar handlers.

- [ ] **Step 2: Verificar** — `cd frontend && npx vitest run src/pages/LoginPage.test.tsx && npx tsc --noEmit` → PASS + tipos limpos.

- [ ] **Step 3: Commit**
```bash
git add frontend/src/pages/LoginPage.tsx frontend/src/pages/RegisterPage.tsx
git commit -m "feat(auth): re-skin de login/registro tela cheia acolhedor (RNF-05)"
```

---

## Task 15: Re-skin CarteiraPage

**Files:** Modify `frontend/src/pages/CarteiraPage.tsx`

> Trocar valores monetários por `MoneyValue`, adicionar `ClasseBadge`, aplicar tokens. Manter `useCarteira` e o form. O teste `CarteiraPage.test.tsx` usa `getAllByText(/1000[.,]00/)` — após formatar para `R$ 1.000,00`, **atualizar o teste** para `getAllByText(/1\.000,00/)`.

- [ ] **Step 1: Atualizar o teste** para o novo formato pt-BR:
em `frontend/src/pages/CarteiraPage.test.tsx`, trocar a asserção do valor para:
```tsx
    expect(screen.getAllByText(/1\.000,00/).length).toBeGreaterThan(0);
```

- [ ] **Step 2: Aplicar componentes/tokens** em `CarteiraPage.tsx`:
  - resumo: `R$ {resumo.total_investido}` → `<MoneyValue valor={resumo.total_investido} className="text-2xl font-bold text-primary" />`; idem por_classe.
  - cada posição: `R$ {p.valor_investido}` → `<MoneyValue valor={p.valor_investido} />`; PM idem; adicionar `<ClasseBadge classe={p.classe} />` ao lado do ticker (no lugar do `<span>{p.classe}</span>`).
  - cards: `rounded-lg border` → `rounded-2xl border border-border bg-card`; botão Adicionar → `bg-primary text-primary-foreground`.

- [ ] **Step 3: Verificar** — `cd frontend && npx vitest run src/pages/CarteiraPage.test.tsx && npx tsc --noEmit` → PASS + limpo.

- [ ] **Step 4: Commit**
```bash
git add frontend/src/pages/CarteiraPage.tsx frontend/src/pages/CarteiraPage.test.tsx
git commit -m "feat(carteira): re-skin com MoneyValue/ClasseBadge e tokens (RF-01/04, RNF-05)"
```

---

## Task 16: Re-skin Ranking + Clusters

**Files:** Modify `frontend/src/pages/RankingPage.tsx`, `frontend/src/pages/ClustersPage.tsx`

> Aplicar tokens (cards/cores → `bg-card`, `text-foreground`, `text-muted-foreground`, `bg-primary`), garantir layout mobile (largura total, sem tabela larga estourando — usar cards/lista em <640px). Corrigir o lint pré-existente do `useReactTable` (regra `react-hooks/incompatible-library`) com um disable localizado e comentado, já que tocamos o arquivo:
```tsx
  // eslint-disable-next-line react-hooks/incompatible-library -- API do TanStack Table não é memoizável; uso intencional
  const table = useReactTable({ ... });
```

- [ ] **Step 1: Aplicar tokens + responsividade mobile** nas duas páginas (substituir `text-gray-*`/`bg-white dark:bg-[#...]` por `text-foreground`/`bg-card border-border`). Manter a lógica/hooks.

- [ ] **Step 2: Verificar** — `cd frontend && npx vitest run && npx tsc --noEmit && npm run lint 2>&1 | tail -3`
Expected: testes PASS, tipos limpos, lint sem os erros de `RankingPage` (idealmente 0 erros).

- [ ] **Step 3: Commit**
```bash
git add frontend/src/pages/RankingPage.tsx frontend/src/pages/ClustersPage.tsx
git commit -m "feat(analise): re-skin de Ranking/Clusters com tokens + mobile + fix lint (RNF-05, RNF-04)"
```

---

## Task 17: Re-skin PerfilPage

**Files:** Modify `frontend/src/pages/PerfilPage.tsx`

- [ ] **Step 1: Aplicar tokens** (cards/seções → `bg-card border-border`, textos → `text-foreground`/`text-muted-foreground`, acento → `text-primary`/`bg-primary`). Manter lógica (perfil store, pesos, preview). Corrigir o lint pré-existente do arquivo se aparecer (disable localizado e comentado).

- [ ] **Step 2: Verificar** — `cd frontend && npx vitest run src/pages/PerfilPage.test.tsx && npx tsc --noEmit` → PASS + limpo.

- [ ] **Step 3: Commit**
```bash
git add frontend/src/pages/PerfilPage.tsx
git commit -m "feat(perfil): re-skin com tokens acolhedor (RNF-05)"
```

---

# PARTE D — LIMPEZA + VERIFICAÇÃO

## Task 18: Aposentar Navigation/Layout antigos

**Files:** Delete `frontend/src/components/layout/Navigation.tsx`; revisar `frontend/src/components/layout/Layout.tsx`, `Header.tsx`, `PerfilBanner.tsx`

- [ ] **Step 1: Remover imports órfãos** — confirmar que nada importa mais `Navigation`/`Layout`/`Header`/`PerfilBanner` (o App agora usa `AppShell`):
```bash
cd frontend && grep -rnE "components/layout/(Navigation|Layout|Header|PerfilBanner)" src/ || echo "sem referências"
```
- [ ] **Step 2: Apagar os não usados** — remover `Navigation.tsx` (e `Layout.tsx`/`Header.tsx`/`PerfilBanner.tsx` se sem referência). Manter `useDarkMode` (será religado num botão do `ScreenHeader`/Perfil futuramente; YAGNI agora).

- [ ] **Step 3: Verificar** — `cd frontend && npx tsc --noEmit && npx vitest run && npm run build 2>&1 | tail -3` → tudo limpo/verde, build ok.

- [ ] **Step 4: Commit**
```bash
git add -A frontend/src/components/layout/
git commit -m "chore(ui): aposenta Navigation/Layout antigos (substituídos por AppShell)"
```

---

## Task 19: Gate final + smoke mobile (verification-before-completion)

**Files:** nenhum (verificação)

- [ ] **Step 1: Suíte + tipos + build + lint**
Run: `cd frontend && npx vitest run && npx tsc --noEmit && npm run build 2>&1 | tail -3 && npm run lint 2>&1 | tail -5`
Expected: todos os testes PASS; tsc limpo; build ok; lint sem erros (ou só avisos conhecidos documentados).

- [ ] **Step 2: Smoke ponta a ponta no viewport 375px** — com backend (`uvicorn ... :8000`, banco semeado) e `npm run dev`:
  - deslogado em `/` → redireciona `/login`;
  - cadastra/loga → cai em **Início** com patrimônio + destaques;
  - bottom-nav navega entre Início/Carteira/Análise/IA/Perfil; aba ativa destacada;
  - Análise alterna Ranking/Clusters; toque no "?" de um indicador abre a explicação;
  - Carteira: aporte aparece formatado em R$ pt-BR com ClasseBadge;
  - IA mostra "em breve"; logout volta pra /login.
Expected: tudo ok, sem erro de console/CORS, layout sem estouro horizontal.

- [ ] **Step 3: Commit (se houve ajuste de smoke)**
```bash
git add -A frontend/
git commit -m "chore(ui): ajustes do smoke mobile da Fundação UX (RNF-05)"
```

---

## Self-Review (writing-plans)

- **Cobertura do spec:** §3 nav/IA (T8,T9,T10,T12) ✓ · §4 auth-everywhere (T10) ✓ · §5 design system (T1) + componentes (T4-T7) ✓ · §6 explicabilidade (T3,T6) ✓ · §7 telas re-skin (T13-T17) ✓ · Início (T13) ✓ · IA em breve (T11) ✓ · §9 testes TDD em cada task ✓ · §8 estrutura de arquivos bate ✓.
- **Placeholders:** sem TBD; todo passo de lógica tem código. Tasks de re-skin (14-17) dão classes/tokens concretos a aplicar em vez de re-colar arquivos de 100+ linhas — proposital (DRY do plano), com verificação por teste+tsc+build.
- **Consistência de tipos/nomes:** `formatMoeda` usado em `MoneyValue`/`InicioPage`/`CarteiraPage`; `explicarIndicador`/`GLOSSARIO` entre glossário, `IndicadorExplain`; `AppRoutes`/`AppShell`/`BottomNav`/`ProtectedRoute` coerentes entre App e testes; abas (`/`,`/carteira`,`/analise`,`/ia`,`/perfil`) idênticas em BottomNav e App.
- **Ordem/risco:** executar **11→12→13 antes da 10** (imports do App). `ClassificacaoBadge` e `useDashboard` são pré-existentes — verificar assinatura ao usar (sinalizado na T13). React 19/Vitest: só caminho feliz nos testes.
- **Sem mudança de backend** — auth já existe (S1); este plano é só frontend.
