# Tour Guiado Contextual (pilar Educação) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar o "Aprenda enquanto investe" num guia de verdade: tours com destaques (coach marks) sob demanda, um por sub-feature, disparados pelo "?" do header (sensível ao contexto) e listados num índice.

**Architecture:** Motor fino sobre `driver.js` (vanilla) alimentado por um registro de conteúdo tipado (`tours.ts`, como o `glossario.ts`). Um store Zustand guarda o tour ativo (efêmero), o pendente (efêmero) e os vistos (persistido). Cada tela/sub-view registra seu tour ao montar via `useRegistrarTour`; o `BotaoAjuda` no header dispara o tour do contexto; o `IndiceTours` (card do Início) lista e dispara qualquer tour (navegando quando necessário).

**Tech Stack:** React 19 + TypeScript, Vite 8, Zustand (+persist), driver.js, Vitest + Testing Library, Tailwind. Spec: `docs/superpowers/specs/2026-06-24-tour-guiado-educacao-design.md`.

## Global Constraints

- TDD obrigatório (RED→GREEN→REFACTOR) na lógica; config/assets e overlay do driver.js → verificação manual no **viewport mobile**.
- TypeScript estrito, **proibido `any`** (usar `unknown` + narrowing). Mobile-first.
- Comentários e conteúdo em **português**; linguagem de iniciante (P1), sem jargão.
- Imports explícitos do Vitest (`describe/it/expect`), testes colocados em `*.test.ts(x)`.
- Rodar tooling via WSL: `wsl.exe bash -lc 'export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:$PATH"; cd /home/hiago/projetos/fii-insights/frontend && <cmd>'`.
- Commits Conventional em português, citando **RF-45** (rastreabilidade RNF-04).
- driver.js é **dependency** (runtime), não devDependency.

---

### Task 1: Registro de conteúdo dos tours (`tours.ts`)

**Files:**
- Create: `frontend/src/lib/tours.ts`
- Test: `frontend/src/lib/tours.test.ts`

**Interfaces:**
- Produces: `PassoTour`, `Tour`, `TOURS: Tour[]`, `listarTours(): Tour[]`, `obterTour(id: string): Tour | null`, `agruparPorAba(): { aba: string; tours: Tour[] }[]`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { TOURS, listarTours, obterTour, agruparPorAba } from "./tours";

describe("tours", () => {
  it("tem os 10 tours esperados", () => {
    expect(listarTours()).toHaveLength(10);
    const ids = TOURS.map((t) => t.id);
    expect(ids).toEqual([
      "inicio", "carteira-posicoes", "carteira-dividendos", "carteira-simulador",
      "carteira-recomendacoes", "analise-ranking", "analise-clusters",
      "analise-comparar", "ia", "perfil",
    ]);
  });
  it("todo tour tem ao menos 2 passos e título/descrição", () => {
    for (const t of TOURS) {
      expect(t.passos.length).toBeGreaterThanOrEqual(2);
      expect(t.titulo.length).toBeGreaterThan(0);
      expect(t.descricao.length).toBeGreaterThan(0);
      expect(t.rota.startsWith("/")).toBe(true);
    }
  });
  it("obterTour devolve null para id desconhecido", () => {
    expect(obterTour("inexistente")).toBeNull();
    expect(obterTour("inicio")?.id).toBe("inicio");
  });
  it("agruparPorAba agrupa preservando a ordem das abas", () => {
    const grupos = agruparPorAba();
    expect(grupos.map((g) => g.aba)).toEqual(["Início", "Carteira", "Análise", "IA", "Perfil"]);
    const carteira = grupos.find((g) => g.aba === "Carteira");
    expect(carteira?.tours).toHaveLength(4);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/tours.test.ts`
Expected: FAIL — `Failed to resolve import "./tours"`.

- [ ] **Step 3: Write minimal implementation**

```ts
export interface PassoTour {
  /** Seletor do elemento a destacar (ex.: '[data-tour="inicio-renda"]'). Ausente = passo centrado. */
  alvo?: string;
  titulo: string;
  conteudo: string;
}

export interface Tour {
  id: string;
  titulo: string;
  descricao: string;
  /** Rótulo da aba para o índice. */
  aba: string;
  /** Rota onde o tour roda. */
  rota: string;
  /** Sub-aba (quando a tela tem abas internas). */
  tab?: string;
  passos: PassoTour[];
}

export const TOURS: Tour[] = [
  {
    id: "inicio", titulo: "Tela inicial", descricao: "Entenda seu resumo e a navegação.",
    aba: "Início", rota: "/",
    passos: [
      { titulo: "Bem-vindo ao FII Insights", conteudo: "Um guia rápido da tela inicial. Em 30 segundos você entende o essencial." },
      { alvo: '[data-tour="inicio-patrimonio"]', titulo: "Seu patrimônio", conteudo: "Quanto você tem investido, somando FIIs e FIAGROs. Toque para ver sua carteira." },
      { alvo: '[data-tour="inicio-renda"]', titulo: "Renda mensal estimada", conteudo: "A média de proventos que sua carteira tende a gerar por mês, pelos últimos 12 meses." },
      { alvo: '[data-tour="inicio-destaques"]', titulo: "Destaques para você", conteudo: "Os fundos mais bem avaliados pelo scoring, já ajustados ao seu perfil." },
      { alvo: '[data-tour="nav-principal"]', titulo: "Navegação", conteudo: "Use estas abas para ir entre as telas. Em qualquer uma, toque no “?” no topo para um guia como este." },
    ],
  },
  {
    id: "carteira-posicoes", titulo: "Posições", descricao: "Cadastre e acompanhe seus fundos.",
    aba: "Carteira", rota: "/carteira", tab: "posicoes",
    passos: [
      { titulo: "Suas posições", conteudo: "Aqui você cadastra e acompanha os fundos que possui." },
      { alvo: '[data-tour="carteira-add"]', titulo: "Adicionar posição", conteudo: "Informe o fundo, a quantidade de cotas e o preço médio pago. Dá para editar depois." },
      { alvo: '[data-tour="carteira-total"]', titulo: "Total investido", conteudo: "A soma do que você aplicou — base do seu patrimônio e das projeções." },
    ],
  },
  {
    id: "carteira-dividendos", titulo: "Dividendos", descricao: "Acompanhe os proventos recebidos.",
    aba: "Carteira", rota: "/carteira", tab: "dividendos",
    passos: [
      { titulo: "Dividendos", conteudo: "Acompanhe os proventos que seus fundos pagaram." },
      { alvo: '[data-tour="dividendos-grafico"]', titulo: "Histórico de proventos", conteudo: "Quanto você recebeu mês a mês. Útil para ver a consistência da renda." },
    ],
  },
  {
    id: "carteira-simulador", titulo: "Simulador", descricao: "Projete sua renda futura.",
    aba: "Carteira", rota: "/carteira", tab: "simulador",
    passos: [
      { titulo: "Simulador de renda", conteudo: "Projete quanto sua carteira pode render no futuro." },
      { alvo: '[data-tour="simulador-controles"]', titulo: "Ajuste os parâmetros", conteudo: "Defina aportes mensais e reinvestimento. O efeito “bola de neve” reinveste os proventos para acelerar a renda." },
    ],
  },
  {
    id: "carteira-recomendacoes", titulo: "Recomendações", descricao: "Sugestões pela sua carteira e perfil.",
    aba: "Carteira", rota: "/carteira", tab: "recomendacoes",
    passos: [
      { titulo: "Recomendações", conteudo: "Sugestões personalizadas pela sua carteira e perfil." },
      { alvo: '[data-tour="recomendacoes-precoteto"]', titulo: "Preço-teto", conteudo: "O preço máximo sugerido para comprar sem pagar caro (método Bazin), dado o rendimento." },
      { alvo: '[data-tour="recomendacoes-rebalance"]', titulo: "Rebalanceamento", conteudo: "Mostra se sua carteira está concentrada demais e como equilibrar FIIs e FIAGROs." },
    ],
  },
  {
    id: "analise-ranking", titulo: "Ranking", descricao: "Fundos ordenados pelo scoring.",
    aba: "Análise", rota: "/analise", tab: "ranking",
    passos: [
      { titulo: "Ranking de fundos", conteudo: "Fundos ordenados por uma nota de 0 a 100 (o scoring)." },
      { alvo: '[data-tour="ranking-score"]', titulo: "Score e classificação", conteudo: "A nota combina rentabilidade, valuation, risco e estrutura: Excelente, Bom, Regular ou Evitar." },
      { alvo: '[data-tour="ranking-perfil"]', titulo: "Ajustado ao seu perfil", conteudo: "Os pesos da nota mudam conforme seu perfil (conservador, moderado, arrojado)." },
      { titulo: "Entenda cada indicador", conteudo: "Em qualquer indicador, toque no “?” ao lado para uma explicação simples, sem jargão." },
    ],
  },
  {
    id: "analise-clusters", titulo: "Clusters", descricao: "Agrupamento automático de fundos.",
    aba: "Análise", rota: "/analise", tab: "clusters",
    passos: [
      { titulo: "Clusters", conteudo: "Agrupamos fundos parecidos automaticamente (K-Means)." },
      { alvo: '[data-tour="clusters-grupos"]', titulo: "Grupos de perfil", conteudo: "Cada grupo reúne fundos com risco e rendimento semelhantes — ajuda a diversificar sem repetir o mesmo tipo." },
    ],
  },
  {
    id: "analise-comparar", titulo: "Comparar", descricao: "Fundos lado a lado.",
    aba: "Análise", rota: "/analise", tab: "comparar",
    passos: [
      { titulo: "Comparar fundos", conteudo: "Coloque fundos lado a lado para decidir." },
      { alvo: '[data-tour="comparar-selecao"]', titulo: "Escolha os fundos", conteudo: "Selecione dois ou mais fundos para ver indicadores e score na mesma tela." },
    ],
  },
  {
    id: "ia", titulo: "Assistente de IA", descricao: "Tire dúvidas em linguagem simples.",
    aba: "IA", rota: "/ia",
    passos: [
      { titulo: "Assistente de IA", conteudo: "Tire dúvidas sobre os fundos em linguagem simples." },
      { alvo: '[data-tour="ia-input"]', titulo: "Pergunte aqui", conteudo: "Pergunte por que um fundo tem certa nota. O assistente explica o score calculado — ele não inventa números." },
    ],
  },
  {
    id: "perfil", titulo: "Perfil", descricao: "Personalize suas recomendações.",
    aba: "Perfil", rota: "/perfil",
    passos: [
      { titulo: "Seu perfil", conteudo: "Personalize as recomendações ao seu jeito de investir." },
      { alvo: '[data-tour="perfil-tipo"]', titulo: "Tipo de investidor", conteudo: "Conservador, moderado ou arrojado — muda o peso de cada indicador na nota." },
      { alvo: '[data-tour="perfil-pesos"]', titulo: "Pesos personalizados", conteudo: "Quer ir além? Ajuste o peso de cada indicador (a soma precisa dar 100%)." },
    ],
  },
];

const ORDEM_ABAS = ["Início", "Carteira", "Análise", "IA", "Perfil"];

export function listarTours(): Tour[] {
  return TOURS;
}

export function obterTour(id: string): Tour | null {
  return TOURS.find((t) => t.id === id) ?? null;
}

export function agruparPorAba(): { aba: string; tours: Tour[] }[] {
  return ORDEM_ABAS.map((aba) => ({ aba, tours: TOURS.filter((t) => t.aba === aba) })).filter(
    (g) => g.tours.length > 0
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/tours.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/tours.ts frontend/src/lib/tours.test.ts
git commit -m "feat(educacao): registro de conteúdo dos tours guiados (RF-45)"
```

---

### Task 2: Store do tour (`tourStore.ts`)

**Files:**
- Create: `frontend/src/stores/tourStore.ts`
- Test: `frontend/src/stores/tourStore.test.ts`

**Interfaces:**
- Produces: `useTourStore` (Zustand) com estado `{ tourAtivoId: string|null, tourPendenteId: string|null, vistos: string[] }` e ações `setTourAtivo(id|null)`, `setTourPendente(id|null)`, `marcarVisto(id)`. Só `vistos` é persistido (chave `fii-tours-vistos`).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { useTourStore } from "./tourStore";

beforeEach(() => {
  useTourStore.setState({ tourAtivoId: null, tourPendenteId: null, vistos: [] });
});

describe("tourStore", () => {
  it("define e limpa o tour ativo", () => {
    useTourStore.getState().setTourAtivo("inicio");
    expect(useTourStore.getState().tourAtivoId).toBe("inicio");
    useTourStore.getState().setTourAtivo(null);
    expect(useTourStore.getState().tourAtivoId).toBeNull();
  });
  it("define o tour pendente", () => {
    useTourStore.getState().setTourPendente("perfil");
    expect(useTourStore.getState().tourPendenteId).toBe("perfil");
  });
  it("marca visto sem duplicar", () => {
    useTourStore.getState().marcarVisto("inicio");
    useTourStore.getState().marcarVisto("inicio");
    useTourStore.getState().marcarVisto("perfil");
    expect(useTourStore.getState().vistos).toEqual(["inicio", "perfil"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/stores/tourStore.test.ts`
Expected: FAIL — `Failed to resolve import "./tourStore"`.

- [ ] **Step 3: Write minimal implementation**

```ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface TourState {
  tourAtivoId: string | null;
  tourPendenteId: string | null;
  vistos: string[];
  setTourAtivo: (id: string | null) => void;
  setTourPendente: (id: string | null) => void;
  marcarVisto: (id: string) => void;
}

export const useTourStore = create<TourState>()(
  persist(
    (set) => ({
      tourAtivoId: null,
      tourPendenteId: null,
      vistos: [],
      setTourAtivo: (tourAtivoId) => set({ tourAtivoId }),
      setTourPendente: (tourPendenteId) => set({ tourPendenteId }),
      marcarVisto: (id) =>
        set((s) => (s.vistos.includes(id) ? s : { vistos: [...s.vistos, id] })),
    }),
    { name: "fii-tours-vistos", partialize: (s) => ({ vistos: s.vistos }) }
  )
);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/stores/tourStore.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/stores/tourStore.ts frontend/src/stores/tourStore.test.ts
git commit -m "feat(educacao): store de estado dos tours (ativo/pendente/vistos) (RF-45)"
```

---

### Task 3: driver.js + `useTour` (`construirPassos` + `iniciarTour`)

**Files:**
- Modify: `frontend/package.json` (add `driver.js` to dependencies)
- Create: `frontend/src/hooks/useTour.ts`
- Test: `frontend/src/hooks/useTour.test.ts`
- Modify: `frontend/src/index.css` (tema `.fii-tour`)

**Interfaces:**
- Consumes: `Tour` de `@/lib/tours`; `useTourStore` (marcarVisto).
- Produces: `construirPassos(tour: Tour): { element?: string; popover: { title: string; description: string } }[]` (PURA) e `useTour(): { iniciarTour(tour: Tour): void }`.

- [ ] **Step 1: Install driver.js**

Run: `npm i driver.js`
Expected: adiciona `driver.js` em `dependencies`.

- [ ] **Step 2: Write the failing test (construirPassos é puro)**

```ts
import { describe, it, expect } from "vitest";
import { construirPassos } from "./useTour";
import type { Tour } from "@/lib/tours";

const tour: Tour = {
  id: "x", titulo: "X", descricao: "d", aba: "Início", rota: "/",
  passos: [
    { titulo: "Intro", conteudo: "sem alvo" },
    { alvo: '[data-tour="y"]', titulo: "Y", conteudo: "com alvo" },
  ],
};

describe("construirPassos", () => {
  it("mapeia passo centrado (sem element) e passo com element", () => {
    const passos = construirPassos(tour);
    expect(passos[0].element).toBeUndefined();
    expect(passos[0].popover).toEqual({ title: "Intro", description: "sem alvo" });
    expect(passos[1].element).toBe('[data-tour="y"]');
    expect(passos[1].popover.title).toBe("Y");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/hooks/useTour.test.ts`
Expected: FAIL — `Failed to resolve import "./useTour"`.

- [ ] **Step 4: Write minimal implementation**

```ts
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import type { Tour } from "@/lib/tours";
import { useTourStore } from "@/stores/tourStore";

export function construirPassos(tour: Tour) {
  return tour.passos.map((p) => ({
    element: p.alvo,
    popover: { title: p.titulo, description: p.conteudo },
  }));
}

export function useTour() {
  const marcarVisto = useTourStore((s) => s.marcarVisto);

  function iniciarTour(tour: Tour) {
    const d = driver({
      showProgress: true,
      nextBtnText: "Próximo",
      prevBtnText: "Voltar",
      doneBtnText: "Concluir",
      progressText: "{{current}} de {{total}}",
      popoverClass: "fii-tour",
      steps: construirPassos(tour),
    });
    marcarVisto(tour.id);
    d.drive();
  }

  return { iniciarTour };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/hooks/useTour.test.ts`
Expected: PASS (1 test).

- [ ] **Step 6: Add the popover theme to `index.css`** (no fim do arquivo)

```css
/* Tema do driver.js (tour guiado) combinando com o app, claro e escuro. */
.driver-popover.fii-tour {
  background: var(--card);
  color: var(--foreground);
  border: 1px solid var(--border);
  border-radius: 1rem;
  box-shadow: 0 12px 40px -12px rgba(0, 0, 0, 0.35);
}
.driver-popover.fii-tour .driver-popover-title {
  color: var(--foreground);
  font-weight: 600;
}
.driver-popover.fii-tour .driver-popover-description {
  color: var(--muted-foreground);
}
.driver-popover.fii-tour .driver-popover-progress-text {
  color: var(--muted-foreground);
}
.driver-popover.fii-tour .driver-popover-navigation-btns button {
  background: var(--primary);
  color: var(--primary-foreground);
  border-radius: 0.625rem;
  text-shadow: none;
  border: none;
  font-weight: 600;
  padding: 0.375rem 0.75rem;
}
.driver-popover.fii-tour .driver-popover-close-btn {
  color: var(--muted-foreground);
}
.driver-popover.fii-tour .driver-popover-arrow {
  border-color: var(--card);
}
```

- [ ] **Step 7: Verify build still passes**

Run: `npm run build`
Expected: build OK (sem erros de tipo; CSS aceito).

- [ ] **Step 8: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/hooks/useTour.ts frontend/src/hooks/useTour.test.ts frontend/src/index.css
git commit -m "feat(educacao): motor de tour com driver.js + tema do popover (RF-45)"
```

---

### Task 4: `useRegistrarTour` (contexto + auto-disparo do pendente)

**Files:**
- Create: `frontend/src/hooks/useRegistrarTour.ts`

**Interfaces:**
- Consumes: `useTourStore` (setTourAtivo, tourPendenteId, setTourPendente), `useTour` (iniciarTour), `obterTour` de `@/lib/tours`.
- Produces: `useRegistrarTour(tourId: string): void` — cada tela/sub-view chama no corpo do componente. Registra o tour ativo no mount, limpa no unmount, e dispara **uma vez** se for o tour pendente (vindo do índice).

> **Nota de teste:** este hook é wiring com efeitos + driver.js (overlay DOM). A lógica testável (store, construirPassos) já foi coberta nas Tasks 1-3. Este hook é verificado na verificação manual (Task 8). Não escrever teste de unidade que apenas exercite mocks do driver.

- [ ] **Step 1: Write the hook**

```ts
import { useEffect } from "react";
import { obterTour } from "@/lib/tours";
import { useTourStore } from "@/stores/tourStore";
import { useTour } from "./useTour";

/**
 * Registra o tour da tela/sub-view atual e, se houver um tour pendente
 * (disparado pelo índice em outra tela), inicia-o uma única vez ao montar.
 */
export function useRegistrarTour(tourId: string): void {
  const setTourAtivo = useTourStore((s) => s.setTourAtivo);
  const tourPendenteId = useTourStore((s) => s.tourPendenteId);
  const setTourPendente = useTourStore((s) => s.setTourPendente);
  const { iniciarTour } = useTour();

  useEffect(() => {
    setTourAtivo(tourId);
    return () => setTourAtivo(null);
  }, [tourId, setTourAtivo]);

  useEffect(() => {
    if (tourPendenteId !== tourId) return;
    const tour = obterTour(tourId);
    setTourPendente(null);
    if (tour) iniciarTour(tour);
    // iniciarTour/obterTour são estáveis o suficiente; dependemos do par (pendente,id).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourPendenteId, tourId]);
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `npx tsc -b`
Expected: `tsc OK` (sem erros).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useRegistrarTour.ts
git commit -m "feat(educacao): hook de registro de contexto e auto-disparo do tour pendente (RF-45)"
```

---

### Task 5: `BotaoAjuda` no header (AppShell)

**Files:**
- Create: `frontend/src/components/ui/BotaoAjuda.tsx`
- Test: `frontend/src/components/ui/BotaoAjuda.test.tsx`
- Modify: `frontend/src/components/layout/AppShell.tsx`

**Interfaces:**
- Consumes: `useTourStore` (tourAtivoId), `useTour` (iniciarTour), `obterTour`.
- Produces: `<BotaoAjuda />` — o "?" do header. Oculto quando não há tour para a tela atual.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BotaoAjuda } from "./BotaoAjuda";
import { useTourStore } from "@/stores/tourStore";

beforeEach(() => useTourStore.setState({ tourAtivoId: null, tourPendenteId: null, vistos: [] }));

describe("BotaoAjuda", () => {
  it("não renderiza nada quando não há tour para a tela", () => {
    render(<BotaoAjuda />);
    expect(screen.queryByRole("button", { name: /ajuda|guia/i })).toBeNull();
  });
  it("renderiza o botão de ajuda quando há tour ativo registrado", () => {
    useTourStore.setState({ tourAtivoId: "inicio" });
    render(<BotaoAjuda />);
    expect(screen.getByRole("button", { name: /ajuda|guia/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ui/BotaoAjuda.test.tsx`
Expected: FAIL — `Failed to resolve import "./BotaoAjuda"`.

- [ ] **Step 3: Write minimal implementation**

```tsx
import { HelpCircle } from "lucide-react";
import { obterTour } from "@/lib/tours";
import { useTourStore } from "@/stores/tourStore";
import { useTour } from "@/hooks/useTour";

export function BotaoAjuda() {
  const tourAtivoId = useTourStore((s) => s.tourAtivoId);
  const { iniciarTour } = useTour();
  if (!tourAtivoId) return null;

  function abrir() {
    const tour = tourAtivoId ? obterTour(tourAtivoId) : null;
    if (tour) iniciarTour(tour);
  }

  return (
    <button
      type="button"
      onClick={abrir}
      aria-label="Abrir guia desta tela"
      className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
    >
      <HelpCircle className="h-5 w-5" />
    </button>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/ui/BotaoAjuda.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Mount `<BotaoAjuda/>` no header**

Em `frontend/src/components/layout/AppShell.tsx`, importar e colocar à esquerda do `<ThemeToggle/>`:

```tsx
import { BotaoAjuda } from "@/components/ui/BotaoAjuda";
// ...
        <div className="flex items-center gap-1">
          <BotaoAjuda />
          <ThemeToggle />
        </div>
```

(Substituir o `<ThemeToggle />` solto pelo `<div>` acima, mantendo o resto do header.)

- [ ] **Step 6: Run tests + build**

Run: `npx vitest run src/components/ui/BotaoAjuda.test.tsx && npm run build`
Expected: PASS + build OK.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/ui/BotaoAjuda.tsx frontend/src/components/ui/BotaoAjuda.test.tsx frontend/src/components/layout/AppShell.tsx
git commit -m "feat(educacao): botão de ajuda (\"?\") no header dispara o tour da tela (RF-45)"
```

---

### Task 6: `IndiceTours` (card do Início) + substituir card estático

**Files:**
- Create: `frontend/src/components/ui/IndiceTours.tsx`
- Test: `frontend/src/components/ui/IndiceTours.test.tsx`
- Modify: `frontend/src/pages/InicioPage.tsx`

**Interfaces:**
- Consumes: `agruparPorAba`, `obterTour` de `@/lib/tours`; `useTourStore` (vistos, setTourPendente); `useTour` (iniciarTour); `useNavigate`, `useLocation` de `react-router-dom`.
- Produces: `<IndiceTours />` — lista todos os tours agrupados por aba; clicar dispara (se já na rota) ou navega + grava pendente. Pontinho "novo" quando não visto.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { IndiceTours } from "./IndiceTours";
import { useTourStore } from "@/stores/tourStore";

beforeEach(() => useTourStore.setState({ tourAtivoId: null, tourPendenteId: null, vistos: [] }));

describe("IndiceTours", () => {
  it("lista todos os 10 tours como itens clicáveis", () => {
    render(
      <MemoryRouter>
        <IndiceTours />
      </MemoryRouter>
    );
    expect(screen.getAllByRole("button")).toHaveLength(10);
    expect(screen.getByText(/tela inicial/i)).toBeInTheDocument();
    expect(screen.getByText(/assistente de ia/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ui/IndiceTours.test.tsx`
Expected: FAIL — `Failed to resolve import "./IndiceTours"`.

- [ ] **Step 3: Write minimal implementation**

```tsx
import { useLocation, useNavigate } from "react-router-dom";
import { agruparPorAba, obterTour, type Tour } from "@/lib/tours";
import { useTourStore } from "@/stores/tourStore";
import { useTour } from "@/hooks/useTour";

export function IndiceTours() {
  const grupos = agruparPorAba();
  const navigate = useNavigate();
  const location = useLocation();
  const vistos = useTourStore((s) => s.vistos);
  const setTourPendente = useTourStore((s) => s.setTourPendente);
  const { iniciarTour } = useTour();

  function abrir(tour: Tour) {
    if (location.pathname === tour.rota) {
      const t = obterTour(tour.id);
      if (t) iniciarTour(t);
      return;
    }
    setTourPendente(tour.id);
    navigate(tour.rota, { state: { tab: tour.tab } });
  }

  return (
    <div className="rounded-2xl border border-border bg-accent/40 p-4">
      <p className="text-sm font-semibold text-foreground">💡 Aprenda enquanto investe</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Guias rápidos de cada tela. Toque para começar.
      </p>
      <div className="mt-3 flex flex-col gap-3">
        {grupos.map((g) => (
          <div key={g.aba}>
            <p className="mb-1 text-xs font-medium text-muted-foreground">{g.aba}</p>
            <ul className="flex flex-col gap-1">
              {g.tours.map((tour) => (
                <li key={tour.id}>
                  <button
                    type="button"
                    onClick={() => abrir(tour)}
                    className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-left text-sm"
                  >
                    <span className="font-medium text-foreground">{tour.titulo}</span>
                    {!vistos.includes(tour.id) && (
                      <span
                        aria-label="novo"
                        className="ml-2 h-2 w-2 shrink-0 rounded-full bg-primary"
                      />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/ui/IndiceTours.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Substituir o card estático em `InicioPage.tsx`**

Trocar o bloco atual:

```tsx
      <div className="rounded-2xl border border-border bg-accent/40 p-4">
        <p className="text-sm font-semibold text-foreground">💡 Aprenda enquanto investe</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Toque no "?" ao lado de qualquer indicador para entender o que ele significa,
          sem jargão.
        </p>
      </div>
```

por `<IndiceTours />` (import no topo: `import { IndiceTours } from "@/components/ui/IndiceTours";`).

- [ ] **Step 6: Run tests + build**

Run: `npx vitest run src/components/ui/IndiceTours.test.tsx && npm run build`
Expected: PASS + build OK.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/ui/IndiceTours.tsx frontend/src/components/ui/IndiceTours.test.tsx frontend/src/pages/InicioPage.tsx
git commit -m "feat(educacao): índice de tours substitui o card estático no Início (RF-45)"
```

---

### Task 7: Registrar tours e marcar alvos `data-tour` nas telas

**Files (modify — o executor lê cada arquivo e adiciona o atributo no elemento indicado + chama `useRegistrarTour`):**
- `frontend/src/pages/InicioPage.tsx` — `useRegistrarTour("inicio")`; `data-tour="inicio-patrimonio"` no Link do patrimônio; `data-tour="inicio-renda"` no Link da renda; `data-tour="inicio-destaques"` no `<section>` dos destaques.
- `frontend/src/components/layout/BottomNav.tsx` — `data-tour="nav-principal"` no `<nav>`.
- `frontend/src/components/carteira/PosicoesView.tsx` — `useRegistrarTour("carteira-posicoes")`; `data-tour="carteira-add"` no botão/form de adicionar posição; `data-tour="carteira-total"` no elemento de total investido.
- `frontend/src/components/carteira/DividendosView.tsx` — `useRegistrarTour("carteira-dividendos")`; `data-tour="dividendos-grafico"` no container do gráfico.
- `frontend/src/components/carteira/SimuladorView.tsx` — `useRegistrarTour("carteira-simulador")`; `data-tour="simulador-controles"` no bloco de inputs/controles.
- `frontend/src/components/carteira/RecomendacoesView.tsx` — `useRegistrarTour("carteira-recomendacoes")`; `data-tour="recomendacoes-precoteto"` e `data-tour="recomendacoes-rebalance"` nos respectivos blocos.
- `frontend/src/pages/RankingPage.tsx` — `useRegistrarTour("analise-ranking")`; `data-tour="ranking-score"` na coluna/célula de score; `data-tour="ranking-perfil"` no seletor de perfil (se existir; senão omitir o atributo — o passo vira centrado automaticamente, pois o seletor não casa).
- `frontend/src/pages/ClustersPage.tsx` — `useRegistrarTour("analise-clusters")`; `data-tour="clusters-grupos"` no container dos grupos.
- `frontend/src/pages/ComparadorPage.tsx` — `useRegistrarTour("analise-comparar")`; `data-tour="comparar-selecao"` no seletor de fundos.
- `frontend/src/pages/IAPage.tsx` — `useRegistrarTour("ia")`; `data-tour="ia-input"` no campo de pergunta.
- `frontend/src/pages/PerfilPage.tsx` — `useRegistrarTour("perfil")`; `data-tour="perfil-tipo"` no seletor de tipo; `data-tour="perfil-pesos"` no bloco de pesos.

> **Regra para alvos ausentes:** se um elemento alvo não existir/for instável numa view, **não invente markup** — apenas omita aquele `data-tour`. O driver.js trata um seletor que não casa como passo centrado (sem destaque), então o tour continua funcionando.

- [ ] **Step 1: InicioPage — registrar + alvos**

Adicionar `import { useRegistrarTour } from "@/hooks/useRegistrarTour";`, chamar `useRegistrarTour("inicio");` no início do componente, e adicionar `data-tour="inicio-patrimonio"`, `data-tour="inicio-renda"`, `data-tour="inicio-destaques"` nos elementos citados.

- [ ] **Step 2: BottomNav — alvo `nav-principal`**

Adicionar `data-tour="nav-principal"` no elemento `<nav>`.

- [ ] **Step 3: Sub-views da Carteira — registrar + alvos**

Em cada uma das 4 views (`PosicoesView`, `DividendosView`, `SimuladorView`, `RecomendacoesView`): `import { useRegistrarTour } from "@/hooks/useRegistrarTour";`, chamar com o id correspondente, e marcar os `data-tour` listados acima.

- [ ] **Step 4: Sub-views da Análise — registrar + alvos**

Em `RankingPage`, `ClustersPage`, `ComparadorPage`: idem, com os ids `analise-ranking`/`analise-clusters`/`analise-comparar` e os `data-tour` listados.

- [ ] **Step 5: IAPage e PerfilPage — registrar + alvos**

`useRegistrarTour("ia")` + `data-tour="ia-input"`; `useRegistrarTour("perfil")` + `data-tour="perfil-tipo"`/`data-tour="perfil-pesos"`.

- [ ] **Step 6: Verify tests + build + lint**

Run: `npx vitest run && npm run build && npx eslint src`
Expected: todos os testes PASS; build OK; ESLint sem novos erros.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages frontend/src/components
git commit -m "feat(educacao): registra tours e marca alvos data-tour nas telas (RF-45)"
```

---

### Task 8: Registrar RF-45 + verificação manual mobile

**Files:**
- Modify: `docs/REQUISITOS.md` (§5.6, nova linha RF-45)

- [ ] **Step 1: Adicionar RF-45 em `docs/REQUISITOS.md` §5.6**

Após a linha do RF-42, adicionar:

```markdown
| RF-45 | Tour guiado contextual de navegação e features (coach marks por tela/sub-feature, sob demanda) | 🎯 | Should | pág. 16 · lacuna 8 · P1 · estende RF-42 |
```

- [ ] **Step 2: Verificação manual no viewport mobile (build + preview)**

Run: `npm run build && npm run preview`
Abrir no navegador em viewport mobile e confirmar, para ao menos 3 telas (Início, Carteira·Posições, Análise·Ranking):
- O "?" no header aparece e inicia o tour da tela atual.
- Os destaques (spotlight) caem sobre os elementos certos; passos sem alvo aparecem centrados.
- O índice no Início lista os 10 tours; clicar num de outra tela navega e o tour dispara após montar.
- O pontinho "novo" some depois de rodar um tour (recarregar mantém — `vistos` persistido).
- Visual do popover combina com tema claro e escuro.

- [ ] **Step 3: Commit**

```bash
git add docs/REQUISITOS.md
git commit -m "docs(requisitos): registra RF-45 (tour guiado contextual) — RNF-04"
```

---

## Self-Review

**1. Spec coverage:**
- Formato coach marks/driver.js → Task 3. ✅
- Sob demanda por página → Tasks 4,7. ✅
- "?" no header sensível ao contexto → Tasks 4,5,7. ✅
- Card vira índice → Task 6. ✅
- Cobertura por sub-feature (10 tours) → Task 1 (conteúdo) + Task 7 (alvos/registro). ✅
- Registro tipado + helpers → Task 1. ✅
- Store ativo/pendente/vistos → Task 2. ✅
- Disparo cross-page (pendente) → Tasks 4,6. ✅
- "novo" dot → Tasks 2,6. ✅
- Tema do popover claro/escuro → Task 3. ✅
- RF-45 → Task 8. ✅
- Ponte com glossário (RF-42) → passos de conteúdo em `analise-ranking` (Task 1). ✅

**2. Placeholder scan:** Conteúdo dos 10 tours está escrito por extenso (Task 1). A Task 7 referencia elementos reais por view com regra explícita para alvos ausentes (omitir, não inventar) — não é placeholder. Sem TBD/TODO.

**3. Type consistency:** `Tour`/`PassoTour` (Task 1) usados por `construirPassos` (Task 3), `useRegistrarTour` (Task 4), `BotaoAjuda` (Task 5), `IndiceTours` (Task 6). `useTourStore` ações (`setTourAtivo`/`setTourPendente`/`marcarVisto`) consistentes nas Tasks 2,4,5,6. `iniciarTour(tour: Tour)` idem. ✅
