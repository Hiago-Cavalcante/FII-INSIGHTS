# PWA iOS — Encaixe Nativo + Instalação Fácil — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer o PWA parecer um app nativo quando instalado no iPhone (safe-areas, sem bounce, teclado ok) e tornar a instalação iOS fácil com um guia passo-a-passo.

**Architecture:** Correção estrutural cirúrgica (abordagem 1 do spec). Meta tags ativam safe-areas; CSS expõe os insets como variáveis; `AppShell`/`BottomNav` pagam os insets; regras globais matam o bounce; o chat mantém o input visível com teclado; um novo bottom-sheet guia a instalação no iOS. Nenhuma repaginação visual (recorte futuro).

**Tech Stack:** React 18 + TypeScript, Tailwind CSS 3, Vite 5, Vitest + Testing Library. CSS `env(safe-area-inset-*)`, `dvh`, `overscroll-behavior`.

## Global Constraints

- **Mobile-first (RNF-05):** estilizar do menor breakpoint pra cima; validar no viewport mobile antes de "pronto".
- **Proibido `any`** em TypeScript — usar `unknown` + narrowing.
- **Só Tailwind** para estilo (sem styled-components/CSS Modules); CSS global só em `src/index.css`.
- **Commits em lote no fim da sessão** (preferência do usuário nesta sessão): os "Step: Commit" abaixo marcam pontos lógicos de commit, mas a execução acumula tudo e faz um lote organizado ao final, com autorização explícita. Nunca rodar git sem OK do usuário.
- **Status bar:** `black-translucent` (full-bleed) — decidido no brainstorm.
- **Suíte atual:** 106 testes verdes; nenhuma task pode regredir isso.

---

### Task 1: Fundação — meta tags + variáveis CSS de safe-area

**Files:**
- Modify: `frontend/index.html` (tags `<meta>` do `<head>`)
- Modify: `frontend/src/index.css` (`:root` e `body`/`html`)

**Interfaces:**
- Consumes: nada.
- Produces: variáveis CSS globais `--sa-top` e `--sa-bottom` (com fallback `0px`), consumidas pelas Tasks 2 e 4. Viewport com `viewport-fit=cover` e `interactive-widget=resizes-content`.

- [ ] **Step 1: Atualizar o viewport e as metatags iOS em `index.html`**

Substituir a linha do viewport e a status bar:
```html
<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0, viewport-fit=cover, interactive-widget=resizes-content"
/>
```
Trocar o valor da status bar (full-bleed):
```html
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
```
Adicionar, logo após `apple-mobile-web-app-capable`, a forma moderna:
```html
<meta name="mobile-web-app-capable" content="yes" />
```

- [ ] **Step 2: Expor as variáveis de safe-area no `:root` de `index.css`**

No bloco `:root` (após `--radius`), adicionar:
```css
  /* Insets do dispositivo (notch/Dynamic Island, barra de gestos). Fallback 0
     em telas sem safe-area. Consumidos por header e bottom-nav. */
  --sa-top: env(safe-area-inset-top, 0px);
  --sa-bottom: env(safe-area-inset-bottom, 0px);
```

- [ ] **Step 3: Rodar a suíte e confirmar que nada quebrou**

Run (de `frontend/`): `npx vitest run`
Expected: PASS — 106 testes (mudança é só HTML/CSS, sem efeito nos testes).

- [ ] **Step 4: Verificação manual (mobile)**

Run: `npm run dev` e abrir no DevTools responsivo. Confirmar que o app ainda carrega normal (as safe-areas só aparecem em device/simulador standalone; aqui só garantimos que nada regrediu). Ponto de commit lógico: `fix(pwa): ativa safe-areas e status bar full-bleed no iOS (RNF-05)`.

---

### Task 2: Header e Bottom-nav respeitando as bordas

**Files:**
- Modify: `frontend/src/components/layout/AppShell.tsx`
- Modify: `frontend/src/components/layout/BottomNav.tsx`

**Interfaces:**
- Consumes: `--sa-top`, `--sa-bottom` (Task 1).
- Produces: header com folga do topo, nav com folga da base, `main` com clearance correto. Nenhuma API nova.

- [ ] **Step 1: Pagar a safe-area do topo no header (`AppShell.tsx`)**

Na tag `<header>`, acrescentar padding-top da safe-area via classe arbitrária Tailwind. Alterar a className do header de:
```tsx
className="sticky top-0 z-30 mx-auto flex w-full max-w-md items-center justify-between px-4 py-2"
```
para:
```tsx
className="sticky top-0 z-30 mx-auto flex w-full max-w-md items-center justify-between px-4 py-2 pt-[calc(0.5rem+var(--sa-top))]"
```

- [ ] **Step 2: Ajustar o clearance inferior do `main` (`AppShell.tsx`)**

Alterar a className do `<main>` de:
```tsx
className="mx-auto flex w-full min-h-0 max-w-md flex-1 flex-col px-4 pb-20 pt-1"
```
para:
```tsx
className="mx-auto flex w-full min-h-0 max-w-md flex-1 flex-col px-4 pt-1 pb-[calc(5rem+var(--sa-bottom))]"
```

- [ ] **Step 3: Pagar a safe-area da base no bottom-nav (`BottomNav.tsx`)**

Na `<nav>`, acrescentar padding-bottom da safe-area. Alterar de:
```tsx
className="glass-panel fixed inset-x-0 bottom-0 z-30 border-t border-border shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.18)]"
```
para:
```tsx
className="glass-panel fixed inset-x-0 bottom-0 z-30 border-t border-border pb-[var(--sa-bottom)] shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.18)]"
```

- [ ] **Step 4: Rodar a suíte**

Run: `npx vitest run`
Expected: PASS — 106 testes (BottomNav.test e demais inalterados).

- [ ] **Step 5: Verificação manual**

`npm run dev`: header e nav continuam renderizando; layout intacto no viewport mobile. Ponto de commit lógico: `fix(pwa): header e bottom-nav respeitam safe-areas do iPhone (RNF-05)`.

---

### Task 3: Matar o bounce de overscroll

**Files:**
- Modify: `frontend/src/index.css` (regras `html`/`body`)
- Modify: `frontend/src/pages/IAPage.tsx` (área de mensagens)

**Interfaces:**
- Consumes: var `--background` (já existe).
- Produces: scroll da raiz sem elástico; fundo casado; chat sem vazar scroll.

- [ ] **Step 1: Desligar o elástico e casar o fundo da raiz (`index.css`)**

Adicionar, logo após o seletor `body { ... }` existente:
```css
html {
  background-color: var(--background);
  /* Sem elástico de overscroll revelando o fundo nas bordas (iOS). */
  overscroll-behavior: none;
}
body {
  overscroll-behavior: none;
}
```

- [ ] **Step 2: Conter o scroll dentro do chat (`IAPage.tsx`)**

Na div da área de mensagens, acrescentar `overscroll-contain`. Alterar de:
```tsx
<div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto py-2">
```
para:
```tsx
<div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain py-2">
```

- [ ] **Step 3: Rodar a suíte**

Run: `npx vitest run`
Expected: PASS — 106 testes.

- [ ] **Step 4: Verificação manual**

`npm run dev`: rolar além do limite no mobile não deve mostrar faixa de fundo destoante. Ponto de commit lógico: `fix(pwa): elimina bounce de overscroll mostrando o fundo (RNF-05)`.

---

### Task 4: Teclado mantém o input do chat visível

**Files:**
- Modify: `frontend/src/pages/IAPage.tsx`

**Interfaces:**
- Consumes: `fimRef` (já existe na IAPage).
- Produces: ao focar o input, o rodapé rola pra dentro da viewport reduzida pelo teclado.

- [ ] **Step 1: Escrever o teste de que o input chama scroll ao focar**

Em `frontend/src/pages/IAPage.test.tsx`, adicionar (o jsdom não implementa `scrollIntoView`; o teste injeta um mock no protótipo):
```tsx
it("rola para o input ao focar (teclado nao cobre)", () => {
  const scrollSpy = vi.fn();
  // jsdom nao implementa scrollIntoView; instala um mock no protótipo.
  Element.prototype.scrollIntoView = scrollSpy;
  render(<IAPage />);
  fireEvent.focus(screen.getByPlaceholderText(/pergunte sobre fiis/i));
  expect(scrollSpy).toHaveBeenCalled();
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/pages/IAPage.test.tsx`
Expected: FAIL — `scrollSpy` não é chamado (ainda não há handler de focus).

- [ ] **Step 3: Implementar o `onFocus` no input (`IAPage.tsx`)**

No `<input>` do chat, adicionar o handler que reusa `fimRef`:
```tsx
onFocus={() => {
  // Mantém o input acima do teclado quando o iOS encolhe a viewport.
  fimRef.current?.scrollIntoView?.({ behavior: "smooth", block: "end" });
}}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/pages/IAPage.test.tsx`
Expected: PASS — 3 testes da IAPage.

- [ ] **Step 5: Suíte completa**

Run: `npx vitest run`
Expected: PASS — 107 testes (um a mais).

- [ ] **Step 6: Verificação manual**

`npm run dev`: focar o input no chat mantém o campo visível. Ponto de commit lógico: `fix(pwa): input do chat fica visível ao abrir o teclado no iOS (RF-38/RNF-05)`.

---

### Task 5: Guia de instalação iOS (bottom-sheet ilustrado)

**Files:**
- Create: `frontend/src/components/GuiaInstalacaoIOS.tsx`
- Create: `frontend/src/components/GuiaInstalacaoIOS.test.tsx`
- Modify: `frontend/src/components/ConviteInstalarPwa.tsx`
- Modify: `frontend/src/components/ConviteInstalarPwa.test.tsx`

**Interfaces:**
- Consumes: nada externo novo.
- Produces: `GuiaInstalacaoIOS` — componente com props `{ aberto: boolean; onFechar: () => void }`; renderiza 3 passos numerados e um botão "Entendi" que chama `onFechar`. `ConviteInstalarPwa` (variante iOS) ganha um botão que abre o guia.

- [ ] **Step 1: Escrever o teste do `GuiaInstalacaoIOS`**

Criar `frontend/src/components/GuiaInstalacaoIOS.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GuiaInstalacaoIOS } from "./GuiaInstalacaoIOS";

describe("GuiaInstalacaoIOS", () => {
  it("nao renderiza quando fechado", () => {
    render(<GuiaInstalacaoIOS aberto={false} onFechar={() => {}} />);
    expect(screen.queryByText(/adicionar à tela de início/i)).not.toBeInTheDocument();
  });

  it("mostra os 3 passos quando aberto", () => {
    render(<GuiaInstalacaoIOS aberto onFechar={() => {}} />);
    expect(screen.getByText(/compartilhar/i)).toBeInTheDocument();
    expect(screen.getByText(/adicionar à tela de início/i)).toBeInTheDocument();
    expect(screen.getByText(/adicionar/i)).toBeInTheDocument();
  });

  it("chama onFechar ao tocar em Entendi", () => {
    const onFechar = vi.fn();
    render(<GuiaInstalacaoIOS aberto onFechar={onFechar} />);
    fireEvent.click(screen.getByRole("button", { name: /entendi/i }));
    expect(onFechar).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/components/GuiaInstalacaoIOS.test.tsx`
Expected: FAIL — módulo `./GuiaInstalacaoIOS` não existe.

- [ ] **Step 3: Implementar o `GuiaInstalacaoIOS`**

Criar `frontend/src/components/GuiaInstalacaoIOS.tsx`:
```tsx
import { Share, Plus, Check, X } from "lucide-react";

interface Props {
  aberto: boolean;
  onFechar: () => void;
}

const PASSOS = [
  { Icon: Share, titulo: "Toque em Compartilhar", desc: "Na barra do Safari, toque no ícone de compartilhar." },
  { Icon: Plus, titulo: "Adicionar à Tela de Início", desc: "Role a lista e escolha esta opção." },
  { Icon: Check, titulo: "Confirme em Adicionar", desc: "O FII Insights aparece como um app na sua tela." },
] as const;

/**
 * Bottom-sheet com o passo-a-passo de instalação do PWA no iOS, onde não há
 * prompt nativo. Renderizado sobre um backdrop; fecha no backdrop ou em "Entendi".
 */
export function GuiaInstalacaoIOS({ aberto, onFechar }: Props) {
  if (!aberto) return null;
  return (
    <div
      role="dialog"
      aria-label="Como instalar no iPhone"
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-3"
      onClick={onFechar}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card p-4 pb-[calc(1rem+var(--sa-bottom))] shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Instalar no iPhone</p>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="p-1 text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <ol className="flex flex-col gap-3">
          {PASSOS.map(({ Icon, titulo, desc }, i) => (
            <li key={titulo} className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {i + 1}
              </span>
              <div className="flex-1">
                <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <Icon className="h-4 w-4 text-primary" aria-hidden /> {titulo}
                </p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={onFechar}
          className="mt-4 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Entendi
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/components/GuiaInstalacaoIOS.test.tsx`
Expected: PASS — 3 testes.

- [ ] **Step 5: Escrever o teste de que o convite iOS abre o guia**

Em `frontend/src/components/ConviteInstalarPwa.test.tsx`, adicionar um caso que força a variante iOS e verifica que tocar no botão abre o guia. Conferir os mocks já existentes no arquivo e seguir o mesmo padrão; o novo caso:
```tsx
it("abre o guia de instalação no iOS ao tocar em Como instalar", () => {
  // (garantir, com os helpers/mocks do arquivo, que a variante resolvida é "ios")
  render(<ConviteInstalarPwa />);
  fireEvent.click(screen.getByRole("button", { name: /como instalar/i }));
  expect(screen.getByText(/adicionar à tela de início/i)).toBeInTheDocument();
});
```

- [ ] **Step 6: Rodar e ver falhar**

Run: `npx vitest run src/components/ConviteInstalarPwa.test.tsx`
Expected: FAIL — não há botão "Como instalar" nem o guia.

- [ ] **Step 7: Ligar o guia no `ConviteInstalarPwa.tsx`**

Importar e usar estado de abertura. No topo:
```tsx
import { GuiaInstalacaoIOS } from "./GuiaInstalacaoIOS";
```
Adicionar estado dentro do componente (junto aos outros `useState`):
```tsx
const [guiaAberto, setGuiaAberto] = useState(false);
```
Na variante iOS, trocar o texto fixo por um botão que abre o guia: substituir o parágrafo de instrução iOS e o botão "Entendi" da variante iOS por um botão "Como instalar". Ajustar o bloco iOS para:
```tsx
<p className="text-xs text-muted-foreground">Adicione à tela inicial para abrir como um app.</p>
```
e, no lugar do botão "Entendi" da variante iOS:
```tsx
<button
  type="button"
  onClick={() => setGuiaAberto(true)}
  className="shrink-0 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
>
  Como instalar
</button>
```
Antes do fechamento do componente (após a `</div>` raiz do banner, dentro de um fragment se necessário), renderizar o guia:
```tsx
<GuiaInstalacaoIOS aberto={guiaAberto} onFechar={() => setGuiaAberto(false)} />
```
> Nota de implementação: envolver o retorno num fragment `<>...</>` para conter o banner + o guia.

- [ ] **Step 8: Rodar e ver passar**

Run: `npx vitest run src/components/ConviteInstalarPwa.test.tsx`
Expected: PASS.

- [ ] **Step 9: Suíte completa + lint + types**

Run: `npx vitest run && npx tsc --noEmit && npx eslint src/components/GuiaInstalacaoIOS.tsx src/components/ConviteInstalarPwa.tsx`
Expected: PASS — ~111 testes; tsc e eslint sem erros.

- [ ] **Step 10: Verificação manual**

`npm run dev`: na variante iOS, tocar "Como instalar" abre o bottom-sheet com os 3 passos; fecha no backdrop e em "Entendi". Ponto de commit lógico: `feat(pwa): guia ilustrado de instalação no iOS (instalação mais fácil)`.

---

## Verificação final (antes de declarar pronto)

- `npx vitest run` — toda a suíte verde.
- `npx tsc --noEmit` e `npx eslint .` — sem erros.
- Checklist mobile (DevTools responsivo + iPhone/simulador se disponível):
  - Header abaixo do Dynamic Island; bottom-nav acima da barra de gestos.
  - Sem faixa de fundo no overscroll.
  - Teclado no chat não cobre o input.
  - Guia de instalação iOS claro e funcional.
- Lote de commits organizados (com autorização do usuário): fix do chat anterior + `.gitattributes` + spec + as 5 tasks acima.

## Self-review (cobertura do spec)

- Spec §1 (fundação) → Task 1. ✅
- Spec §2 (header/nav) → Task 2. ✅
- Spec §3 (bounce) → Task 3. ✅
- Spec §4 (teclado) → Task 4. ✅
- Spec §5 (instalação) → Task 5. ✅
- Spec "estratégia de verificação" → seções de verificação manual + testes por task. ✅
- Sem placeholders de implementação; tipos (`Props {aberto, onFechar}`) consistentes entre Task 5 steps. ✅
