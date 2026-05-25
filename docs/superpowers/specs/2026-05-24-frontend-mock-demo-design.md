# Frontend Mock Demo — Design Spec

**Data:** 2026-05-24  
**Objetivo:** Deixar o frontend funcional para demonstração amanhã, usando dados mockados no cliente (sem backend rodando).

---

## Escopo

Duas páginas funcionais com dados simulados de 20 FIIs reais:

| Página | Rota | Prioridade |
|---|---|---|
| Dashboard | `/` | Alta (foco principal) |
| Ranking | `/ranking` | Secundária |

Sem backend, sem chamadas HTTP reais. Toda a lógica de scoring roda no cliente usando os dados do mock.

---

## Arquitetura

### Estratégia de mock

Arquivos TypeScript em `src/mocks/` com dados estáticos. Os hooks de dados lêem diretamente do mock em vez de chamar a API. Quando o backend estiver pronto, troca-se apenas a fonte de dados dentro do hook — sem alterar componentes.

```
src/
├── mocks/
│   ├── fundos.ts          # 20 FIIs com indicadores financeiros plausíveis
│   └── index.ts           # re-exporta tudo
├── lib/
│   └── scoring.ts         # lógica de scoring (pesos × pontuação → score 0-100)
├── hooks/
│   ├── useDashboard.ts    # agrega dados para o Dashboard
│   └── useRanking.ts      # filtra/ordena dados para o Ranking
```

### Fluxo de dados

```
fundos.ts (mock estático)
    ↓
scoring.ts (calcula score por perfil)
    ↓
useDashboard / useRanking
    ↓
Componentes React (lêem perfil do usePerfilStore)
```

Troca de perfil via `usePerfilStore` (Zustand) → hooks recalculam → tela atualiza instantaneamente.

---

## Layout global

Toda página tem:

1. **`<Header>`** — logo "FII Insights" à esquerda, links `Dashboard` / `Ranking` à direita com underline no ativo
2. **`<PerfilBanner>`** — faixa colorida abaixo do header com "Perfil ativo:" e três pills clicáveis: `Conservador` · `Moderado` · `Arrojado`

Troca de perfil no banner atualiza o store e rerenderiza a página atual instantaneamente.

---

## Dashboard (`/`)

### Seção 1 — Score Hero

Bloco centralizado com gradiente:
- Label: "SCORE MÉDIO DO PORTFÓLIO · PERFIL [NOME]"
- Número grande: score médio dos 20 FIIs, colorido por faixa (≥80 verde, 60-79 azul, 40-59 amarelo, <40 vermelho)
- Subtexto: "20 FIIs analisados"

### Seção 2 — Melhores para você

Label "MELHORES PARA VOCÊ" + grid de 3 colunas com os 6 FIIs de maior score para o perfil ativo.

Cada card contém:
- Ticker (destaque)
- Segmento (subtexto)
- Score (número colorido por classificação)
- Badge de classificação (Excelente / Bom / Regular / Evitar)

### Seção 3 — Distribuição por classificação

Barra horizontal proporcional com 4 segmentos coloridos:
- Verde: Excelente | Azul: Bom | Amarelo: Regular | Vermelho: Evitar
- Legenda com contagem: "6 Excelente · 8 Bom · 3 Regular · 3 Evitar"

---

## Ranking (`/ranking`)

Tabela com todos os 20 FIIs, ordenada por score descendente.

**Colunas:** Ticker · Segmento · Score · Classificação (badge colorido) · DY Atual · P/VP

**Filtro:** Select de classificação (Todas / Excelente / Bom / Regular / Evitar) acima da tabela.

**Ordenação padrão:** Score descendente. Colunas Score, DY Atual e P/VP clicáveis para reordenar.

---

## Mock data (`src/mocks/fundos.ts`)

20 FIIs reais com dados plausíveis cobrindo todos os segmentos:

| Segmento | Tickers |
|---|---|
| Logística | XPLG11, HGLG11, BTLG11, LVBI11 |
| Escritórios | KNRI11, BRCR11, RBRP11, JSRE11 |
| Shoppings | XPML11, VISC11, HSML11, MALL11 |
| Recebíveis (Papel) | KNCR11, MXRF11, IRDM11, BCFF11 |
| Híbrido | HFOF11, RBRF11, CPTS11, RZTR11 |

Cada registro inclui todos os 10 indicadores do modelo de scoring (alguns com null intencional para testar tratamento de nulos).

---

## Lógica de scoring (`src/lib/scoring.ts`)

Implementação client-side da fórmula do CLAUDE.md:

```
Score(fundo) = Σ (peso_i × pontuação_i / 5) × 100
```

Funções:
- `calcularPontuacao(indicador, valor)` → 1-5 conforme faixas do CLAUDE.md
- `calcularScore(fundo, perfil)` → float 0-100
- `classificar(score)` → "Excelente" | "Bom" | "Regular" | "Evitar"

Tratamento de nulos: redistribui peso proporcionalmente dentro da mesma dimensão.

---

## Componentes novos

| Componente | Localização | Descrição |
|---|---|---|
| `Header` | `components/layout/Header.tsx` | Logo + nav links |
| `PerfilBanner` | `components/layout/PerfilBanner.tsx` | Faixa com pills de perfil |
| `Layout` | `components/layout/Layout.tsx` | Wrapper com Header + PerfilBanner + main |
| `FiiCard` | `components/FiiCard.tsx` | Card de FII (score, badge, ticker) |
| `DistribuicaoBarra` | `components/DistribuicaoBarra.tsx` | Barra proporcional colorida |
| `ClassificacaoBadge` | `components/ClassificacaoBadge.tsx` | Badge colorido por classificação |
| `DashboardPage` | `pages/DashboardPage.tsx` | Página Dashboard |
| `RankingPage` | `pages/RankingPage.tsx` | Página Ranking |

Componentes shadcn/ui já instalados que serão usados: `Card`, `Badge`, `Table`, `Select`, `Button`.

---

## Decisões técnicas

- **Sem Recharts nesta sprint** — visualização via CSS (barra de distribuição) é suficiente para o demo e elimina risco de tempo
- **Scoring no cliente** — correto para mock; quando o backend existir, o score virá da API e os hooks descartarão o cálculo local
- **Sem TanStack Table** — tabela simples com `<Table>` do shadcn/ui basta para 20 registros; TanStack Table entra quando for produção
- **Sem TanStack Query** — sem chamadas HTTP reais, não faz sentido; hooks simples com `useMemo` são suficientes

---

## O que NÃO está no escopo

- Página de detalhe do FII
- Página de perfil/configurações
- Integração real com backend
- Autenticação (decisão consolidada)
- Gráficos de clustering K-Means

---

## Critério de conclusão

O sistema está pronto para demo quando:

1. `npm run dev` sobe sem erros
2. Dashboard carrega com score médio visível para o perfil Moderado
3. Troca de perfil no banner atualiza o score médio e os cards instantaneamente
4. Ranking mostra todos os 20 FIIs com filtro por classificação funcionando
5. Navegação Dashboard ↔ Ranking funciona sem reload
