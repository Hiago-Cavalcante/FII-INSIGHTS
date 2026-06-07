# Fundação UX — Redesign + Auth-everywhere — Design

> **Spec de feature.** Primeiro subprojeto do programa "finalizar MVP antes do deploy":
> estabelece a casca mobile, o design system e o redesign das telas atuais + autenticação
> em todas as rotas. As features S2–S6 serão construídas DEPOIS, já dentro deste sistema.
>
> Autor: Hiago Cavalcante Menezes — TCC GI/UFG · Data: 2026-06-07
> Fontes: PDF *Benchmark e Levantamento de Requisitos* + [`docs/REQUISITOS.md`](../../REQUISITOS.md) · Contrato: [`CLAUDE.md`](../../../CLAUDE.md)
> Sucede: [`2026-06-04-sprint-1-auth-carteira-design.md`](2026-06-04-sprint-1-auth-carteira-design.md)

---

## 1. Objetivo

Transformar o app numa experiência **100% mobile-first, iniciante-first e explicável**, alinhada
ao PDF (5 pilares: Dados · Carteira · Perfil · IA · Educação; persona P1 como norte), e colocar
**todas as rotas atrás de login**. É a fundação visual/estrutural onde as features S2–S6 vão encaixar.

## 2. Decisões do brainstorm (fechadas)

1. **Navegação:** **bottom tab bar** mobile-nativa, 5 abas: **Início · Carteira · Análise · IA · Perfil**.
2. **Estética:** "acolhedor" — primária **teal `#0f766e`**, fundo neutro quente, cards arredondados, tom didático; **modo claro padrão + toggle escuro**.
3. **Auth:** **todas as rotas exigem login** (reverte a decisão da S1 de só `/carteira` protegida). Sem landing pública; deslogado → `/login`; pós-login → **Início**.
4. **Profundidade:** **re-skin + nova IA** (reorganiza a navegação nos 5 pilares; reaproveita telas atuais como sub-seções).

## 3. Arquitetura de informação & navegação

`AppShell` (autenticado) = conteúdo + **`BottomNav`** fixa. `/login` e `/registro` ficam FORA do shell (tela cheia).

| Aba | Rota | Conteúdo |
|---|---|---|
| **Início** | `/` | Home nova/agregadora: saudação, **patrimônio investido** (de `useCarteira`), **destaques do Ranking** (top fundos por score), atalho de dividendos (placeholder S2), card educativo (RF-42). Absorve o overview que o `DashboardPage` atual deriva do ranking. |
| **Carteira** | `/carteira` | `CarteiraPage` atual reestilizada. Cresce com dividendos (S2) e simulador (S4). |
| **Análise** | `/analise` | Junta **Ranking + Clusters** com sub-abas internas; reserva espaço p/ comparador (S3). |
| **IA** | `/ia` | **Empty-state "em breve"** explicando o que o assistente fará (até a S5), em tom educativo. |
| **Perfil** | `/perfil` | `PerfilPage` atual reestilizada. Cresce com objetivos/horizonte (S4). |

## 4. Auth-everywhere

- `ProtectedRoute` embrulha o `AppShell` e todas as abas; `/login` e `/registro` públicas (tela cheia, sem nav).
- Deslogado em qualquer rota → `Navigate('/login')`. Pós-login → `/` (Início).
- O interceptor do axios já faz `logout()` + redirect em `401` (S1). A `BottomNav` só renderiza autenticado.
- **Sem mudança de backend** — a auth (JWT) já existe (S1). É só roteamento/guarda no frontend.

## 5. Design system

- **Tokens (variáveis CSS, padrão shadcn) em `index.css` + `tailwind.config`:** `--primary` (teal `#0f766e`), `--background` (neutro quente claro / slate escuro), `--card`, `--muted`, texto slate; semânticas para classificação (Excelente/Bom/Regular/Evitar) e classe (FII/FIAGRO). Mantém **shadcn/ui** — só re-tematiza (não troca de lib; respeita o CLAUDE.md).
- **Tipografia:** `system-ui`, base maior para legibilidade; hierarquia clara. Cards `rounded-2xl`, badges pill.
- **Modo claro/escuro:** claro como padrão; reaproveita `useDarkMode`.
- **Componentes reutilizáveis:**
  - Layout: `AppShell`, `BottomNav`, `ScreenHeader`.
  - UI: re-tema de `Card`/`ClassificacaoBadge`/`ProgressCircle` (existentes); novos `ClasseBadge` (FII/FIAGRO), `IndicadorExplain` (padrão "💡 O que é…"), `EmptyState`, `MoneyValue` (formata R$ pt-BR via `Intl.NumberFormat`).
- **Formatação pt-BR:** util `lib/formato.ts` (moeda, percentual, número) — centraliza para consistência.

## 6. Padrão de explicabilidade (diferencial — RF-39/40/42)

`IndicadorExplain`: renderiza valor do indicador + affordance "?" que abre explicação em **linguagem de iniciante** (pt-BR). Alimentado por um **glossário inicial** em `lib/glossario.ts` (DY, DY 12M, P/VP, vacância física/financeira, liquidez, volatilidade, PL, nº cotistas, duration). É a semente do microconteúdo educativo; expande nas próximas sprints. **Não** chama LLM (isso é S5) — é conteúdo estático curado.

## 7. Telas (re-skin)

`Login`/`Registro` (tela cheia acolhedora, RHF/Zod já existentes) · `Início` (nova) · `Carteira` · `Análise` (Ranking+Clusters) · `Perfil` · `IA` (em breve). Lógica e dados atuais preservados; muda visual + casca. O fluxo de erro do login segue coberto pelo caminho feliz no unit + e2e (limitação React 19/Vitest documentada).

## 8. Estrutura de arquivos

**Criados:** `components/layout/AppShell.tsx`, `components/layout/BottomNav.tsx`, `components/ui/ClasseBadge.tsx`, `components/ui/IndicadorExplain.tsx`, `components/ui/EmptyState.tsx`, `components/ui/MoneyValue.tsx`, `pages/InicioPage.tsx`, `pages/AnalisePage.tsx`, `pages/IAPage.tsx`, `lib/glossario.ts`, `lib/formato.ts` (+ testes).

**Modificados:** `App.tsx` (rotas + ProtectedRoute em tudo + `/analise` `/ia`), `index.css` + `tailwind.config.ts` (tokens), `components/layout/Layout.tsx` → usa `AppShell`, reestiliza `RankingPage`/`ClustersPage`/`PerfilPage`/`DashboardPage`(→ vira fonte do Início)/`CarteiraPage`/`LoginPage`/`RegisterPage`.

**Aposentado:** `components/layout/Navigation.tsx` (substituído por `AppShell`+`BottomNav`); `Header.tsx` legado segue sem uso.

## 9. Testes (TDD)

- **Lógica nova:** `lib/formato.ts` (moeda/percentual pt-BR), glossário (lookup), hook agregador do Início (deriva patrimônio + destaques). RED→GREEN.
- **Componentes:** smoke de render (Vitest/RTL) de `BottomNav` (abas + estado ativo), `ProtectedRoute`-everywhere (redireciona deslogado), `IndicadorExplain` (abre/fecha explicação), `InicioPage`/`AnalisePage` (caminho feliz com hooks mockados).
- **Armadilha conhecida:** não testar caminho de erro via Promise rejeitada em event handler (React 19 + Vitest 4) — caminho feliz no unit, erro no e2e.
- **Verificação:** `tsc` limpo, `vitest` verde, `npm run build` ok, e validação no **viewport 375px** antes de "pronto". Lint pré-existente (RankingPage/Perfil/badge/button) será limpo de passagem onde tocarmos esses arquivos.

## 10. Fora de escopo (YAGNI — fica para S2–S6)

Dividendos reais (S2) · indicadores/scoring FIAGRO (S3) · comparador (S3) · simulador de renda (S4) · objetivos/horizonte do perfil (S4) · **assistente IA real (S5 — a aba IA é só "em breve")**. Aqui: **casca + design system + telas atuais reestilizadas + Início + auth-everywhere + explicabilidade com glossário inicial**.

## 11. Rastreabilidade

RNF-05 (mobile-first) · RNF-02′ (auth em todas as rotas) · RNF-01 (usabilidade/acessibilidade, iniciante-first) · RF-40/42 (linguagem por perfil + microconteúdo educativo, semente) · pilares do PDF (pág. 16).
