# Tour guiado contextual (pilar Educação) — Design

> **Status:** aprovado (Parte 1) e **PARADO/guardado** a pedido do autor em 2026-06-24.
> Retomar a partir de `writing-plans` quando priorizado. Não implementar antes disso.
> Rastreabilidade: estende **RF-42** (educação contextual) e ataca a **lacuna 8** (baixa adaptação à linguagem do iniciante) / persona **P1 Iniciante**. Sugerido registrar **RF-45** em `docs/REQUISITOS.md` ("Tour guiado contextual de navegação e features").

## Problema

Hoje o "Aprenda enquanto investe" é só um card estático no Início apontando para os botões "?" de indicadores (microconteúdo RF-42 via `lib/glossario.ts`). Não existe nenhum guia que ensine a **navegar e usar cada feature**. O objetivo é virar um guia de verdade, disponível e fácil de achar para qualquer pessoa (foco em P1).

## Decisões (brainstorm 2026-06-24)

1. **Formato:** tour guiado com destaques (coach marks / spotlight sobre elementos reais).
2. **Estrutura/disparo:** sob demanda, por página (sem disparo automático).
3. **Gatilho:** botão "?" no header (AppShell) inicia o tour da tela atual + o card "Aprenda enquanto investe" vira o **índice** de todos os tours.
4. **Cobertura:** tours por sub-feature também — o "?" é sensível ao contexto (sub-aba ativa).
5. **Implementação:** `driver.js` (vanilla, ~5KB, zero deps, MIT) + hook fino. React 19.2/Vite 8 OK por ser vanilla.

## Arquitetura

Motor fino sobre driver.js alimentado por um **registro de conteúdo tipado** (como `glossario.ts` é para indicadores). Passos apontam para elementos reais via atributos `data-tour="..."` (estáveis, desacoplados das classes de estilo).

### Arquivos

```
frontend/src/
  lib/tours.ts            NOVO  registro tipado + helpers (listar/obter/agrupar por aba)
  lib/tours.test.ts       NOVO  (TDD)
  stores/tourStore.ts     NOVO  Zustand: tourAtivoId + tourPendenteId (efêmeros) · vistos[] (persistido)
  stores/tourStore.test.ts NOVO (TDD)
  hooks/useTour.ts        NOVO  wrapper driver.js: construirPassos(tour) [PURA, testável] + iniciarTour()
  hooks/useTour.test.ts   NOVO  (TDD de construirPassos)
  hooks/useRegistrarTour.ts NOVO  cada tela registra seu tour e auto-dispara o pendente
  components/ui/BotaoAjuda.tsx   NOVO  o "?" do header
  components/ui/IndiceTours.tsx  NOVO  card "Aprenda enquanto investe" reescrito como índice
  components/layout/AppShell.tsx ALT  injeta <BotaoAjuda/> no header
  index.css                      ALT  tema .fii-tour (popover combinando com shadcn/Tailwind, claro+escuro)
  + data-tour="..." nos elementos reais das telas/sub-abas
```

### Tipos / modelo de conteúdo

```ts
interface PassoTour { alvo?: string; titulo: string; conteudo: string } // alvo = seletor data-tour; ausente = passo centrado (intro/outro)
interface Tour { id: string; titulo: string; descricao: string; rota: string; tab?: string; passos: PassoTour[] }
```

Tours podem deep-linkar para o `glossario.ts` (reutilizar conteúdo RF-42, sem duplicar).

### Fluxo de dados (3 mecanismos)

1. **Registrar contexto:** cada tela/sub-aba ativa chama `useRegistrarTour("carteira-posicoes")` no mount → grava `tourAtivoId`; limpa no unmount. Trocar sub-aba → a sub-view ativa registra seu id.
2. **Disparar no contexto:** `BotaoAjuda` lê `tourAtivoId`, busca no registro, chama `iniciarTour()`. Sem tour para a tela → "?" oculto.
3. **Disparar do índice (cross-page):** item do `IndiceTours` → se tela atual, dispara direto; senão `navigate(rota, {state:{tab}})` + grava `tourPendenteId`. Quando a tela-alvo monta e chama `useRegistrarTour`, vê que seu id bate com o pendente, dispara **uma vez** e limpa. (Ancora no mount real do elemento; sem `setTimeout` frágil.)

`useRegistrarTour` marca o tour como **visto** (`vistos[]`) → alimenta um pontinho "novo" discreto no índice.

## Conteúdo / cobertura (Parte 2 — proposta, não revisada com o autor)

Um tour por sub-feature: Início, Carteira(Posições/Dividendos/Simulador), Análise(Ranking/Clusters), IA, Perfil. Texto sem jargão para P1; cada passo curto. Onde fizer sentido, passo aponta para o "?" do indicador (ponte com glossário).

## Testes (TDD)

- `tours.ts` — dados + helpers (`listarTours`, `obterTour`, agrupar por aba): unit.
- `tourStore.ts` — transições (setTourAtivo, marcarVisto, tourPendente): unit.
- `construirPassos(tour)` — função pura que mapeia Tour→steps driver.js: unit.
- `IndiceTours` — Testing Library: renderiza todos os tours; clique navega/dispara.
- Integração driver.js (overlay real): verificação manual no **viewport mobile** (verification-before-completion).

## Escopo / faseamento

Infra (hook, store, registro, índice, botão) é modesta; o grosso é o **conteúdo**. Possível faseamento: infra + tours de Início/Carteira primeiro, depois Análise/IA/Perfil. Cabe em julho/2026.

## Pendências ao retomar

- Apresentar Parte 2 (conteúdo/testes/RF) e obter aval.
- Registrar RF-45 em `docs/REQUISITOS.md` (rastreabilidade RNF-04).
- Confirmar o padrão real de sub-abas em `CarteiraPage`/`AnalisePage` (render condicional vs. sempre montado) p/ o registro de contexto.
