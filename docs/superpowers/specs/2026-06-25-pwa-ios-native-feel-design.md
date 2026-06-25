# Design — PWA iOS: encaixe nativo + instalação fácil

**Data:** 2026-06-25
**Autor:** Hiago (via brainstorm com Claude)
**Status:** aprovado no brainstorm; aguardando revisão do spec
**Rastreabilidade:** RNF-05 (mobile-first), RNF (PWA/instalação). Abordagem 1 de 3 — o
polish visual completo (abordagem 3) fica como recorte futuro.

## Problema

Instalado na tela inicial do iPhone (standalone), o app não parece um app validado.
Sintomas relatados pelo usuário:

- **Tela de cima quebrada:** header encosta no notch/Dynamic Island; conteúdo sob a status bar.
- **Bottom-nav atrás da barra de gestos** (home indicator); some/pula.
- **Bounce de overscroll** revela o fundo nas bordas.
- **Teclado** empurra/quebra o layout (input some).
- **Elementos sobrepostos/cortados** nas bordas.
- **Instalação difícil:** banner de uma linha é fácil de ignorar; faltam passos claros no iOS.

Fora de escopo (recorte futuro — abordagem 3): repaginação de identidade visual
(tipografia, cores, componentes), splash screens iOS.

## Causa-raiz

1. `<meta viewport>` **sem `viewport-fit=cover`** → `env(safe-area-inset-*)` nunca é aplicado.
2. **Nenhum uso de safe-area insets** no header (topo) nem no bottom-nav (base).
3. `status-bar-style = default` → status bar sobrepõe conteúdo sem padding de compensação.
4. **Sem `overscroll-behavior`** → elástico de scroll do iOS mostra o fundo da raiz.
5. iOS **encolhe a viewport** com o teclado; falta `interactive-widget=resizes-content`.
6. Convite de instalação iOS é **uma linha de texto**, sem guia passo-a-passo.

## Design

### 1. Fundação de safe-area

**`index.html`:**
- `viewport` → `width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content`
- `apple-mobile-web-app-status-bar-style` → `black-translucent` (full-bleed, app-feel; theme-color sob a status bar)
- adicionar `<meta name="mobile-web-app-capable" content="yes">` (forma moderna)

**CSS global (`index.css`):** variáveis lidas uma vez, com fallback 0:
```css
:root {
  --sa-top: env(safe-area-inset-top, 0px);
  --sa-bottom: env(safe-area-inset-bottom, 0px);
}
```
Header/nav consomem `var(--sa-top/bottom)` — sem `env()` repetido espalhado.

### 2. Header e Bottom-nav respeitando as bordas (`AppShell`, `BottomNav`)

- **Header** (sticky): `padding-top: var(--sa-top)` → descola do notch. Conserta a "tela de cima quebrada".
- **Bottom-nav** (fixo): `padding-bottom: var(--sa-bottom)` → sobe acima da barra de gestos.
- **`main`**: folga inferior vira `pb-[calc(5rem+var(--sa-bottom))]` para clarear o nav já elevado.

### 3. Matar o bounce de overscroll (`index.css`)

- `html, body { overscroll-behavior: none; }`
- `html`/`body` com o **mesmo fundo** do app (background/app-gradient) — faixa residual casa com a tela.
- Área de mensagens do chat: `overscroll-behavior: contain` (não vaza scroll pra página).

### 4. Teclado não quebra o layout

- Base já resolvida: shell em `100dvh` + flexbox (fix anterior do chat).
- `interactive-widget=resizes-content` no viewport (seção 1) → iOS redimensiona em vez de sobrepor.
- Chat: ao **focar** o input, `scrollIntoView` no `fimRef` para manter o input visível acima do teclado.
- Formulários (login, posição) herdam o shell `dvh`; ajuste pontual só se algum ficar esquisito.

### 5. Instalação mais fácil — guia ilustrado iOS

- Banner iOS atual ("Toque em Compartilhar…") vira **acionável**: toque abre um
  modal/bottom-sheet com **3 passos numerados + ícones reais**:
  1. Toque em **Compartilhar** (ícone ⎙)
  2. Role e toque em **"Adicionar à Tela de Início"**
  3. Confirme em **"Adicionar"**
- Mantém o backoff de dispensa de `lib/pwa.ts` (lógica intacta).
- Android/desktop: prompt nativo (`beforeinstallprompt`) inalterado.
- Novo componente `GuiaInstalacaoIOS` (bottom-sheet) isolado, testável; `ConviteInstalarPwa`
  só passa a abri-lo na variante iOS.

## Unidades e fronteiras

| Unidade | Faz | Depende de |
|---|---|---|
| `index.html` meta | Ativa safe-areas, status bar, teclado | — |
| `index.css` vars/regras | Expõe `--sa-*`, mata bounce, fundo casado | env() |
| `AppShell`/`BottomNav` | Aplicam padding de safe-area | `--sa-*` |
| `IAPage` (focus scroll) | Mantém input visível com teclado | `fimRef` existente |
| `GuiaInstalacaoIOS` | Passo-a-passo de instalação iOS | — |
| `ConviteInstalarPwa` | Decide variante e abre o guia | `lib/pwa`, `GuiaInstalacaoIOS` |

## Estratégia de verificação (testes)

- **Unit/componente (Vitest):**
  - `GuiaInstalacaoIOS` renderiza os 3 passos e fecha ao confirmar/dispensar.
  - `ConviteInstalarPwa` na variante iOS abre o guia ao tocar; Android mantém prompt nativo.
  - `lib/pwa` (já coberto) permanece verde.
  - Suíte atual (106 testes) continua passando.
- **Layout/CSS (não unit-testável):** verificação manual. Safe-areas só aparecem em
  device/simulador standalone. Checklist:
  - iPhone com notch, modo standalone: header abaixo do Dynamic Island; nav acima da barra de gestos.
  - Scroll até o limite: sem faixa de fundo destoante (bounce).
  - Abrir teclado no chat: input visível; layout não quebra.
  - Aproximação no desktop: DevTools responsivo com inset de safe-area (Chrome) / Safari Responsive Design Mode.
- **Mobile-first primeiro:** validar no viewport mobile antes de declarar pronto (RNF-05).

## Riscos e mitigações

- `black-translucent` exige que a safe-area do topo seja paga **sempre**, senão conteúdo some sob a status bar → garantido pela seção 2.
- `interactive-widget` tem suporte parcial; é progressive enhancement (degrada pro comportamento atual).
- Verificação real depende de iPhone físico; sem device, fica a aproximação por DevTools + nota no TCC.

## Sequência de implementação (para o plano)

1. Meta tags (`index.html`) + variáveis/regras CSS (`index.css`) — fundação.
2. `AppShell` + `BottomNav` — padding de safe-area.
3. Overscroll/fundo casado.
4. `IAPage` — focus scroll do teclado.
5. `GuiaInstalacaoIOS` + ligação no `ConviteInstalarPwa` (TDD).
6. Verificação: suíte verde + checklist mobile.
