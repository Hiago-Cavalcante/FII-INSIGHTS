# FII-Insights

> **TCC do Bacharelado em Gestão da Informação (UFG)** — Sistema full-stack para análise e recomendação de Fundos de Investimento Imobiliário (FIIs) com scoring ponderado multicritério e clustering K-Means.
>
> Autor: Hiago Cavalcante Menezes
> Repositório: github.com/[seu-usuario]/fii-insights

---

## 🎯 Modo de operação com Superpowers ativo

Você é meu parceiro de desenvolvimento neste TCC e tem o plugin **Superpowers** (obra/superpowers) instalado e ativo.

**Confie no fluxo do Superpowers.** Skills se ativam automaticamente baseadas em contexto — não invente processos paralelos. Siga o workflow padrão:

`brainstorming` → `using-git-worktrees` → `writing-plans` → `subagent-driven-development` (ou `executing-plans`) → `test-driven-development` → `requesting-code-review` → `finishing-a-development-branch`

**Princípios não-negociáveis** (vêm do Superpowers, reforço aqui):
- **TDD obrigatório** — RED → GREEN → REFACTOR. Sem teste falhando antes, sem código depois.
- **YAGNI** — não construa o que ainda não precisa
- **DRY** — sem duplicação semântica de lógica
- **Evidência sobre claims** — verifique antes de declarar pronto (`verification-before-completion`)
- **Sistemático sobre ad-hoc** — debugging em 4 fases, não tentativa e erro

---

## ⚡ Comandos do Superpowers que vou usar

| Comando | Quando | O que faço |
|---|---|---|
| `/superpowers:brainstorm` | Antes de qualquer feature significativa | Refinar spec antes de codar |
| `/superpowers:write-plan` | Depois do brainstorm aprovado | Plano de implementação detalhado |
| `/superpowers:execute-plan` | Para executar plano com checkpoints | Implementação em batches |

**Início típico de uma sessão de feature:**
1. Eu peço a feature → você pode propor `/superpowers:brainstorm`
2. Brainstorm aprovado → `/superpowers:write-plan`
3. Plano aprovado → `/superpowers:execute-plan` ou subagent-driven-development

Para tarefas pequenas (uma função, um bug fix óbvio, refactor trivial), pule o brainstorm e vá direto. Use seu julgamento.

---

## 🧠 Skills do Superpowers e quando elas vão ativar neste projeto

O Superpowers carrega skills automaticamente quando o contexto bate. Estas são as ativações esperadas:

**`test-driven-development`** — ativa em **toda** implementação de lógica de negócio:
- Funções de scoring (faixas, fórmula, classificação)
- Algoritmo de clustering (preparar features, métricas)
- Coletor de dados (parsing, retry, fallback)
- Cálculo de recomendações personalizadas
- Endpoints novos

**`systematic-debugging`** — ativa quando algo falha de modo não óbvio:
- Indicadores nulos quebrando o scoring
- K-Means produzindo clusters degenerados
- BRAPI retornando schemas inesperados
- Erros de CORS, hidratação React, etc.

**`verification-before-completion`** — ativa antes de você dizer "está pronto":
- Rode os testes, mostre resultado real
- Suba o servidor, confirme endpoint respondendo
- Abra o frontend, valide fluxo de ponta a ponta

**`brainstorming`** — ativa quando peço feature ambígua ou nova:
- "Como apresentar os clusters visualmente?"
- "Como permitir personalização dos pesos?"
- "Que tipo de back-test fazer?"

**`writing-plans`** — ativa após design aprovado.

**`subagent-driven-development`** — ativa para tarefas grandes/paralelizáveis.

**`requesting-code-review`** — ativa entre tarefas do plano.

**`using-git-worktrees`** — ativa em features grandes (eu prefiro branches simples por enquanto; sinalize se achar que vale worktree).

Quando uma skill ativar, **diga explicitamente** qual está sendo seguida. Ex: *"ativando test-driven-development: vou começar pelo teste de classificar_faixa..."*.

---

## 🤖 Subagents — quando delegar

Considere disparar subagents (`dispatching-parallel-agents`) para:

- **Pesquisa técnica** comparando bibliotecas/abordagens
- **Auditoria final** de uma sessão grande (code review)
- **Geração paralela** de testes para vários módulos
- **Documentação em lote** (docstrings, README, ARCHITECTURE.md)

Quando delegar, anuncie: *"vou disparar um subagent para X enquanto sigo com Y"*. Ao retornar, integre o resultado.

---

## 📋 Visão geral do projeto

Aplicação **full-stack mono-usuário** que:

1. Coleta dados públicos de FIIs via API BRAPI
2. Aplica modelo de scoring ponderado em **10 indicadores financeiros**
3. Segmenta fundos via **clustering K-Means**
4. Gera recomendações personalizadas por perfil do investidor
5. Apresenta tudo em interface web interativa

**Sem autenticação** (decisão consolidada). Perfil do investidor persiste no `localStorage` via Zustand.

---

## 🏛️ Decisões arquiteturais consolidadas

**Não reabra** sem motivo técnico forte:

| Decisão | Justificativa |
|---|---|
| **Monorepo** (backend/ + frontend/) | Contexto único; simplifica desenvolvimento solo |
| **SQLite** (não PostgreSQL) | 50 FIIs, mono-usuário, sem produção. Zero config. |
| **Sem Docker** | Não precisa de orquestração para o escopo |
| **Sem autenticação** | Sistema mono-usuário. Limitação documentada como trabalho futuro. |
| **Zustand + persist** | Perfil no localStorage. Suficiente. |
| **shadcn/ui** (não MUI/AntD) | Componentes copy-paste, customizáveis, modernos |
| **TanStack Query** (não SWR) | Padrão atual; melhor DX para dashboards |
| **scikit-learn** (não TensorFlow) | K-Means clássico basta; deep learning é overkill |
| **FastAPI** (não Django/Flask) | Async nativo, OpenAPI auto, type hints |

---

## 🛠️ Stack técnica

### Backend (Python 3.11+)

```
FastAPI + uvicorn          → API REST async
SQLAlchemy 2.0 + Alembic   → ORM + migrações
SQLite                     → banco em data/fii_insights.db
Pydantic v2                → validação
pydantic-settings + dotenv → configuração via .env
httpx                      → cliente HTTP async (BRAPI)
BeautifulSoup4 + lxml      → scraping de backup
pandas + numpy             → manipulação de dados
scikit-learn               → K-Means, StandardScaler
matplotlib                 → gráficos (cotovelo, silhouette, back-test)
structlog                  → logs estruturados
pytest + pytest-asyncio    → testes (TDD obrigatório)
ruff + black + mypy        → qualidade de código
```

### Frontend (Node 20+)

```
React 18 + TypeScript      → UI tipada estrita
Vite 5                     → bundler e dev server
Tailwind CSS 3             → estilização utility-first
shadcn/ui                  → componentes (Radix + Tailwind)
React Router v6            → roteamento SPA
TanStack Query v5          → server state
Zustand + persist          → client state (perfil no localStorage)
axios                      → cliente HTTP
React Hook Form + Zod      → formulários tipados
TanStack Table v8          → tabela de ranking
Recharts                   → gráficos
lucide-react               → ícones
sonner                     → toasts
date-fns                   → datas em pt-BR
openapi-typescript         → gera tipos da API
ESLint + Prettier          → qualidade
Vitest + Testing Library   → testes
```

---

## 📊 Modelo de dados (SQLite)

### Tabelas

**`fundos`** — Cadastro dos FIIs
- `id` PK
- `ticker` UNIQUE (ex: "XPLG11")
- `nome`, `segmento`, `gestora`, `data_ipo`
- `created_at`, `updated_at`

**`indicadores`** — Snapshot dos indicadores em uma data
- `id` PK
- `fundo_id` FK → fundos
- `data_referencia`
- `dy_atual`, `dy_12m`, `p_vp` — nullable
- `vacancia_fisica`, `vacancia_financeira` — nullable
- `liquidez_diaria`, `volatilidade_12m` — nullable
- `patrimonio_liquido`, `num_cotistas` — nullable

**`scoring_historico`**
- `id` PK
- `fundo_id` FK
- `data_execucao`
- `score` (0-100)
- `classificacao` ("Excelente" | "Bom" | "Regular" | "Evitar")

**`clusters`**
- `id` PK
- `nome_interpretado`
- `perfil_risco` ("conservador" | "moderado" | "arrojado")
- `descricao`
- `dy_medio`, `volatilidade_media`, `p_vp_medio`, `num_fiis`

**`fundo_clusters`**
- `fundo_id` FK, `cluster_id` FK, `data_atribuicao`

**`perfis_investidor`**
- `id` PK (UUID)
- `tipo` ("conservador" | "moderado" | "arrojado")
- `pesos_personalizados` JSON nullable
- `created_at`, `updated_at`

---

## 🎯 Modelo de scoring (CRÍTICO — não alterar sem justificativa)

### Os 10 indicadores e pesos

| # | Indicador | Dimensão | Peso |
|---|---|---|---|
| 1 | DY atual | Rentabilidade | **20%** |
| 2 | DY 12M | Rentabilidade | **10%** |
| 3 | P/VP | Valuation | **15%** |
| 4 | Vacância física | Risco | **10%** |
| 5 | Vacância financeira | Risco | **10%** |
| 6 | Liquidez diária | Risco | **10%** |
| 7 | Volatilidade 12M | Risco | **10%** |
| 8 | Patrimônio Líquido | Estrutura | **5%** |
| 9 | Num cotistas | Estrutura | **5%** |
| 10 | Segmento | Estrutura | **5%** |
| | | **TOTAL** | **100%** |

### Faixas de pontuação (1 a 5)

**DY atual:** ≤6%=1 · 6-8%=3 · 8-10%=5 · 10-12%=4 · >12%=2

**P/VP:** <0,80=5 · 0,80-0,95=4 · 0,95-1,05=3 · 1,05-1,20=2 · >1,20=1

**Vacância (física e financeira):** <5%=5 · 5-10%=4 · 10-15%=3 · 15-25%=2 · >25%=1

**Liquidez diária (R$):** <100k=1 · 100-500k=2 · 500k-1M=3 · 1-5M=4 · >5M=5

**Volatilidade 12M (FIIs de tijolo):** <10%=5 · 10-15%=4 · 15-20%=3 · 20-30%=2 · >30%=1

### Fórmula

```
Score(fundo) = Σ (peso_i × pontuação_i / 5) × 100
```

Resultado: float 0-100.

### Classificação

| Faixa | Classificação |
|---|---|
| ≥ 80 | Excelente |
| 60-79 | Bom |
| 40-59 | Regular |
| < 40 | Evitar |

### Tratamento de nulos

Quando um indicador é nulo, **redistribua o peso proporcionalmente** entre os indicadores presentes na mesma dimensão. Documente o caso de fundos sem dimensão Risco completa.

---

## 🔬 Clustering K-Means

**Features (padronizadas com StandardScaler):**
- DY 12M
- P/VP
- Vacância média (média de física e financeira quando ambas existem)
- log(Liquidez diária)
- Volatilidade 12M

**Procedimento:**
1. Método do cotovelo (k = 2 a 8)
2. Silhouette score para cada k
3. Salvar gráficos em `backend/data/figures/cotovelo.png` e `silhouette.png`
4. Treinar K-Means com **k = 4**
5. Interpretar clusters via heurísticas

**Heurísticas de nomeação:**
- Baixa volatilidade + DY moderado → "Tijolo Conservador"
- Volatilidade média + DY médio → "Tijolo Balanceado"
- Alta volatilidade + alto DY → "Papel Agressivo"
- Características mistas → "Híbrido Diversificado"

(Nomes definitivos refletirão os dados reais.)

---

## 🌐 Coleta de dados

- **Fonte primária:** API BRAPI (https://brapi.dev) — gratuita, requer token
- **Backup:** scraping leve de FundsExplorer / Status Invest
- **Amostra:** **top 50 FIIs** por liquidez diária (volume > R$ 100k/dia nos últimos 30 dias)
- **Frequência:** manual via `python -m scripts.coletar_dados`
- **Rate limiting:** delay de 300ms entre requisições
- **Retry:** exponential backoff, máximo 3 tentativas

---

## 👥 Perfis do investidor

### Pesos default por perfil

**Conservador** — prioriza consistência e baixo risco
- DY atual 10% · DY 12M 15% · P/VP 10%
- Vacâncias 15% cada · Liquidez 10% · Volatilidade 15%
- PL 5% · Cotistas 5% · Segmento 0%

**Moderado** — usa os pesos default do CLAUDE.md (equilíbrio)

**Arrojado** — prioriza retorno e desconto
- DY atual 25% · DY 12M 5% · P/VP 20%
- Vacância física 10% · Financeira 5% · Liquidez 10% · Volatilidade 5%
- PL 5% · Cotistas 5% · Segmento 10%

Soma sempre = 100%. Validar no frontend com Zod.

---

## 📁 Estrutura de pastas

```
fii-insights/
├── README.md
├── CLAUDE.md
├── .gitignore
├── .env.example
│
├── backend/
│   ├── pyproject.toml
│   ├── alembic.ini
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── routers/
│   │   ├── services/
│   │   ├── repositories/
│   │   └── utils/
│   ├── migrations/
│   ├── scripts/
│   │   ├── coletar_dados.py
│   │   ├── rodar_scoring.py
│   │   ├── rodar_clustering.py
│   │   └── back_test.py
│   ├── data/
│   └── tests/
│
└── frontend/
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    ├── tailwind.config.ts
    ├── components.json
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── api/
        ├── components/
        │   ├── ui/
        │   ├── layout/
        │   ├── charts/
        │   └── tables/
        ├── pages/
        ├── hooks/
        ├── stores/
        ├── lib/
        └── types/
```

---

## 🔧 Variáveis de ambiente

`.env.example`:

```env
# Backend
DATABASE_URL=sqlite:///./data/fii_insights.db
BRAPI_TOKEN=seu_token_aqui
CORS_ORIGINS=http://localhost:5173
LOG_LEVEL=INFO

# Frontend (em frontend/.env.local)
VITE_API_BASE_URL=http://localhost:8000
```

Token gratuito BRAPI: https://brapi.dev

---

## 📐 Convenções de código

### Python
- `snake_case` variáveis/funções, `PascalCase` classes
- **Type hints obrigatórias** em funções públicas
- **Docstrings Google-style**
- Imports organizados via `ruff`
- Comentários em **português**

### TypeScript
- `camelCase` variáveis/funções, `PascalCase` componentes/tipos
- **Strict mode** no tsconfig
- **Proibido `any`** — usar `unknown` + narrowing
- `.tsx` para componentes, `.ts` para lógica pura

### Git
- Conventional Commits **em português**
- Branches: `main` + `feature/*`
- Mensagens no imperativo

---

## ⚙️ Comandos úteis

### Backend (de `backend/`)
```bash
source .venv/bin/activate
uvicorn app.main:app --reload
alembic revision --autogenerate -m "mensagem"
alembic upgrade head
pytest -v
ruff check . --fix && black .
mypy app/
python -m scripts.coletar_dados
python -m scripts.rodar_scoring
python -m scripts.rodar_clustering
python -m scripts.back_test
```

### Frontend (de `frontend/`)
```bash
npm install
npm run dev
npm run build
npm run lint
npx openapi-typescript http://localhost:8000/openapi.json -o src/types/api.ts
npx shadcn@latest add button card dialog
```

### Superpowers
```
/superpowers:brainstorm   → refinar design antes de codar
/superpowers:write-plan   → plano de implementação detalhado
/superpowers:execute-plan → executar plano em batches
```

---

## ❌ NÃO fazer

- ❌ Implementar autenticação (decisão consolidada)
- ❌ Pular o ciclo RED-GREEN-REFACTOR do TDD
- ❌ Declarar "está pronto" sem `verification-before-completion`
- ❌ Usar Redux, MobX, Recoil (Zustand é suficiente)
- ❌ Usar styled-components, CSS Modules (somente Tailwind)
- ❌ Usar Material UI, Ant Design, Bootstrap (somente shadcn/ui)
- ❌ Deep learning, LSTM, redes neurais (scikit-learn é o limite)
- ❌ Criar dados sintéticos sem marcar explicitamente
- ❌ Usar PostgreSQL ou Docker (SQLite escolhido)
- ❌ `any` em TypeScript
- ❌ Chamadas HTTP do frontend para APIs externas (sempre via backend)
- ❌ Commitar `.env`, `.db`, `__pycache__`, `.venv`, `node_modules`
- ❌ Silenciar exceções sem log
- ❌ Construir features especulativas (YAGNI)

## ✅ SEMPRE fazer

- ✅ TDD obrigatório em lógica de negócio (test-driven-development)
- ✅ Brainstorm antes de feature significativa
- ✅ Plano escrito antes de implementação grande
- ✅ Verificação real antes de declarar pronto
- ✅ Type hints (Python) e tipagem estrita (TypeScript)
- ✅ Try/except + logging em chamadas externas
- ✅ Docstrings em endpoints FastAPI
- ✅ Variáveis de ambiente para configs sensíveis
- ✅ Validar inputs com Pydantic (back) e Zod (front)
- ✅ Tratar indicadores nulos (FIIs nem sempre têm todos os dados)
- ✅ Commits semânticos em português ao final
- ✅ Code review entre tarefas (`requesting-code-review`)

---

## 🎓 Contexto acadêmico (norte de decisões)

Este é um TCC. Implicações:

- **Banca avalia o documento** (TCC escrito) e o **sistema demonstrado**
- **Sistema mono-usuário** — sem ambições de produção
- **Defesa em julho/2026** — prazo restritivo
- **Foco em:** análise quantitativa, IA aplicada, full-stack
- **NÃO foco em:** escalabilidade, multi-tenancy, observabilidade enterprise
- **Trade-offs documentados** viram "trabalhos futuros" no TCC, não problemas

Pergunta de ouro em qualquer dúvida técnica: *"Isso ajuda o TCC ou é vaidade de engenharia?"*

Como sou eu (Hiago) sozinho desenvolvendo, **complexidade extra é dívida pessoal**, não investimento.

---

## 📚 Referências externas

- API BRAPI: https://brapi.dev/docs
- FastAPI: https://fastapi.tiangolo.com
- SQLAlchemy 2.0: https://docs.sqlalchemy.org/en/20/
- shadcn/ui: https://ui.shadcn.com
- TanStack Query: https://tanstack.com/query/latest
- TanStack Table: https://tanstack.com/table/latest
- Superpowers: https://github.com/obra/superpowers
- Resolução CVM 175/2022 (regulamentação FIIs)

---

## 🔄 Início de cada sessão

Quando eu abrir uma nova sessão Claude Code:

1. **Cumprimente e diga em uma linha o que entende do projeto** (mostra que leu o CLAUDE.md)
2. **Pergunte o que vou fazer hoje** (não assuma)
3. **Para a primeira tarefa significativa, proponha `/superpowers:brainstorm`** se a feature ainda não tem spec definido
4. **Para tarefas com plano já claro**, vá direto via `/superpowers:write-plan` ou implementação direta
5. **Mantenha foco no escopo** — se eu pedir algo fora do CLAUDE.md, questione antes de fazer

---

**Última atualização:** maio de 2026
**Versão do CLAUDE.md:** 3.0 — alinhada ao Superpowers oficial (obra/superpowers)
