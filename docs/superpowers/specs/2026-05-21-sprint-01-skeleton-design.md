# Sprint 01 — Skeleton & Configuração Técnica

> **Projeto:** FII-Insights (TCC — Gestão da Informação / UFG)
> **Autor:** Hiago Cavalcante Menezes
> **Data:** 2026-05-21
> **Status:** Aprovado para implementação

---

## Objetivo da Sprint

Configurar o repositório monorepo completo com toda a estrutura de pastas, arquivos de configuração e dependências — backend e frontend — prontos para que as sprints seguintes comecem sem decisões de infraestrutura pendentes.

**Critério de conclusão (DoD):**
- `uvicorn app.main:app --reload` executa sem erro (from `backend/`)
- `npm run dev` executa sem erro (from `frontend/`)
- `pytest` roda com 0 testes (sem falhas)
- `ruff check .` passa limpo
- `mypy app/` passa sem erros de tipo
- Commit semântico inicial no repositório

---

## Stack Técnica Consolidada

### Por que essa stack para um sistema de insights com IA?

O FII-Insights combina dois tipos de "inteligência":

1. **Scoring determinístico** — fórmula de pesos definida pelo analista. Não aprende, não treina. Implementado em Python puro com pandas para manipulação dos dados tabulares.
2. **Clustering K-Means** — segmentação não-supervisionada dos FIIs em perfis de risco. Algoritmo clássico de ML que não exige deep learning; scikit-learn é a biblioteca padrão da indústria para isso.

A stack foi escolhida para ser **suficiente e não mais** — filtro: *"isso ajuda o TCC ou é vaidade de engenharia?"*

---

## Dependências Backend

**Runtime:** Python 3.11+
**Gerenciador:** `uv` (via `pyproject.toml` — sem `requirements.txt`)

### Produção

| Pacote | Versão | Papel |
|---|---|---|
| `fastapi` | `^0.115` | Framework web async — autodoc OpenAPI incluído |
| `uvicorn[standard]` | `^0.32` | ASGI server de desenvolvimento e produção leve |
| `sqlalchemy` | `^2.0` | ORM — suporte nativo a async e SQLite |
| `alembic` | `^1.14` | Migrações de banco versionadas |
| `pydantic` | `^2.10` | Validação de dados e schemas da API |
| `pydantic-settings` | `^2.7` | Configuração da app via variáveis de ambiente |
| `python-dotenv` | `^1.0` | Carregamento do arquivo `.env` |
| `httpx` | `^0.28` | Cliente HTTP async — chamadas à API BRAPI |
| `beautifulsoup4` | `^4.13` | Scraping de backup (FundsExplorer / Status Invest) |
| `lxml` | `^5.3` | Parser HTML rápido para BeautifulSoup |
| `pandas` | `^2.2` | Manipulação de dados tabulares financeiros |
| `numpy` | `^2.2` | Computação numérica (base para pandas e scikit-learn) |
| `scikit-learn` | `^1.6` | K-Means, StandardScaler, silhouette_score |
| `matplotlib` | `^3.10` | Gráficos base (cotovelo, silhouette) salvos como PNG |
| `seaborn` | `^0.13` | Estética superior para gráficos de análise de clusters |

> **Por que seaborn?** Os gráficos de cotovelo e silhouette serão incluídos no TCC impresso. Seaborn produz visualizações estatísticas esteticamente superiores ao matplotlib puro, com zero curva de aprendizado adicional (é uma camada sobre matplotlib).

> **Por que remover structlog?** Sistema mono-usuário de TCC. O módulo `logging` padrão do Python cobre todas as necessidades de observabilidade. Structlog adicionaria complexidade de configuração sem benefício mensurável para a banca.

### Desenvolvimento

| Pacote | Versão | Papel |
|---|---|---|
| `pytest` | `^8.3` | Framework de testes (TDD obrigatório) |
| `pytest-asyncio` | `^0.25` | Suporte a testes de corrotinas FastAPI |
| `ruff` | `^0.9` | Linter e formatter (substitui flake8 + isort + black) |
| `mypy` | `^1.14` | Verificação estática de tipos |

---

## Dependências Frontend

**Runtime:** Node 20+
**Gerenciador:** `npm`

| Pacote | Versão | Papel |
|---|---|---|
| `react` | `^18.3` | UI declarativa |
| `react-dom` | `^18.3` | Renderização DOM |
| `typescript` | `^5.7` | Tipagem estrita (strict mode) |
| `vite` | `^5.4` | Bundler e dev server |
| `@vitejs/plugin-react` | `^4.3` | Plugin React para Vite |
| `tailwindcss` | `^3.4` | Estilização utility-first |
| `autoprefixer` | `^10.4` | Prefixos CSS automáticos (peer de Tailwind) |
| `postcss` | `^8.4` | Pipeline de CSS (peer de Tailwind) |
| `@tanstack/react-query` | `^5.62` | Server state — fetch, cache, invalidação |
| `@tanstack/react-table` | `^8.20` | Tabela de ranking com ordenação e filtros |
| `zustand` | `^5.0` | Client state — perfil do investidor no localStorage |
| `react-router-dom` | `^6.28` | Roteamento SPA |
| `axios` | `^1.7` | Cliente HTTP para chamar o backend |
| `react-hook-form` | `^7.54` | Formulários performáticos |
| `zod` | `^3.24` | Validação de schemas (formulários + tipos da API) |
| `recharts` | `^2.14` | Gráficos interativos no dashboard |
| `lucide-react` | `^0.468` | Ícones SVG |
| `sonner` | `^1.7` | Notificações toast |
| `date-fns` | `^4.1` | Formatação de datas em pt-BR |

**shadcn/ui** — instalado via CLI (`npx shadcn@latest init`), não como dependência direta. Componentes adicionados conforme necessário: `button`, `card`, `dialog`, `badge`, `skeleton`, `table`, `tooltip`, `select`, `slider`.

### Dev dependencies

| Pacote | Versão | Papel |
|---|---|---|
| `vitest` | `^2.1` | Test runner (compatível com Vite) |
| `@testing-library/react` | `^16.1` | Testes de componentes React |
| `@testing-library/jest-dom` | `^6.6` | Matchers DOM para testes |
| `eslint` | `^9.17` | Linter TypeScript/React |
| `prettier` | `^3.4` | Formatter |
| `openapi-typescript` | `^7.4` | Gera tipos TypeScript do OpenAPI do backend |

---

## Estrutura de Pastas

```
fii-insights/
├── CLAUDE.md                        # Guia de desenvolvimento (não editar sem motivo)
├── README.md                        # Visão geral do projeto
├── .gitignore
├── .env.example                     # Template de variáveis de ambiente
│
├── docs/
│   └── superpowers/
│       └── specs/                   # Design docs de cada sprint
│
├── backend/
│   ├── pyproject.toml               # Dependências e config do projeto Python
│   ├── alembic.ini                  # Config do Alembic
│   ├── .env                         # Variáveis locais (não commitado)
│   │
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                  # Entrypoint FastAPI (app instance, routers, CORS)
│   │   ├── config.py                # Settings via pydantic-settings
│   │   ├── database.py              # Engine SQLAlchemy, SessionLocal, Base
│   │   │
│   │   ├── models/                  # SQLAlchemy ORM models
│   │   │   ├── __init__.py
│   │   │   ├── fundo.py
│   │   │   ├── indicador.py
│   │   │   ├── scoring.py
│   │   │   ├── cluster.py
│   │   │   └── perfil.py
│   │   │
│   │   ├── schemas/                 # Pydantic schemas (request/response)
│   │   │   ├── __init__.py
│   │   │   ├── fundo.py
│   │   │   ├── indicador.py
│   │   │   ├── scoring.py
│   │   │   ├── cluster.py
│   │   │   └── perfil.py
│   │   │
│   │   ├── routers/                 # FastAPI routers (um por domínio)
│   │   │   ├── __init__.py
│   │   │   ├── fundos.py
│   │   │   ├── scoring.py
│   │   │   ├── clusters.py
│   │   │   └── perfil.py
│   │   │
│   │   ├── services/                # Lógica de negócio (scoring, clustering)
│   │   │   ├── __init__.py
│   │   │   ├── scoring_service.py
│   │   │   └── clustering_service.py
│   │   │
│   │   ├── repositories/            # Acesso ao banco (queries SQLAlchemy)
│   │   │   ├── __init__.py
│   │   │   ├── fundo_repository.py
│   │   │   └── indicador_repository.py
│   │   │
│   │   └── utils/                   # Helpers genéricos
│   │       ├── __init__.py
│   │       └── http_client.py       # httpx async client configurado
│   │
│   ├── migrations/                  # Gerado pelo Alembic
│   │   ├── env.py
│   │   ├── script.py.mako
│   │   └── versions/
│   │
│   ├── scripts/                     # Scripts de linha de comando
│   │   ├── __init__.py
│   │   ├── coletar_dados.py
│   │   ├── rodar_scoring.py
│   │   ├── rodar_clustering.py
│   │   └── back_test.py
│   │
│   ├── data/
│   │   ├── .gitkeep
│   │   └── figures/                 # Gráficos gerados (cotovelo.png, silhouette.png)
│   │       └── .gitkeep
│   │
│   └── tests/
│       ├── __init__.py
│       ├── conftest.py              # Fixtures compartilhadas (DB em memória, client)
│       ├── test_scoring.py          # (vazio — preenchido na Sprint 3)
│       └── test_clustering.py       # (vazio — preenchido na Sprint 4)
│
└── frontend/
    ├── package.json
    ├── package-lock.json
    ├── vite.config.ts
    ├── tsconfig.json
    ├── tsconfig.app.json
    ├── tsconfig.node.json
    ├── tailwind.config.ts
    ├── postcss.config.js
    ├── components.json              # Config do shadcn/ui
    ├── .env.local                   # VITE_API_BASE_URL (não commitado)
    ├── index.html
    │
    └── src/
        ├── main.tsx                 # ReactDOM.createRoot, QueryClientProvider, RouterProvider
        ├── App.tsx                  # BrowserRouter + rotas principais
        ├── vite-env.d.ts
        │
        ├── api/
        │   ├── client.ts            # Instância axios configurada
        │   └── endpoints/           # Funções de fetch por domínio
        │       ├── fundos.ts
        │       ├── scoring.ts
        │       ├── clusters.ts
        │       └── perfil.ts
        │
        ├── components/
        │   ├── ui/                  # Componentes shadcn/ui (gerados pelo CLI)
        │   ├── layout/
        │   │   ├── Header.tsx
        │   │   ├── Sidebar.tsx
        │   │   └── Layout.tsx
        │   ├── charts/
        │   │   ├── ScoreChart.tsx
        │   │   └── ClusterChart.tsx
        │   └── tables/
        │       └── RankingTable.tsx
        │
        ├── pages/
        │   ├── Dashboard.tsx
        │   ├── Ranking.tsx
        │   ├── FundoDetalhe.tsx
        │   ├── Clusters.tsx
        │   └── Perfil.tsx
        │
        ├── hooks/
        │   ├── useFundos.ts
        │   ├── useScoring.ts
        │   └── useClusters.ts
        │
        ├── stores/
        │   └── perfilStore.ts       # Zustand + persist (localStorage)
        │
        ├── lib/
        │   └── utils.ts             # cn() helper (shadcn/ui), formatadores
        │
        └── types/
            ├── api.ts               # Gerado por openapi-typescript
            └── domain.ts            # Tipos de domínio locais
```

---

## Variáveis de Ambiente

**`.env.example`** (raiz do repositório):

```env
# ─── Backend ───────────────────────────────────────────
DATABASE_URL=sqlite:///./data/fii_insights.db
BRAPI_TOKEN=seu_token_aqui
CORS_ORIGINS=http://localhost:5173
LOG_LEVEL=INFO

# ─── Frontend (copiar para frontend/.env.local) ────────
VITE_API_BASE_URL=http://localhost:8000
```

Token BRAPI gratuito: https://brapi.dev

---

## Decisões Técnicas desta Sprint

| Decisão | Alternativa descartada | Motivo |
|---|---|---|
| `uv` como gerenciador Python | `pip` + `requirements.txt` | uv é 10-100x mais rápido, lockfile nativo, suporte a pyproject.toml |
| `ruff` como linter único | `flake8` + `isort` + `black` separados | ruff substitui os três com configuração unificada |
| `seaborn` para visualizações | `matplotlib` puro | Gráficos de análise de clusters ficam no TCC — estética importa |
| `structlog` removido | mantido | Logging padrão Python suficiente para mono-usuário de TCC |
| shadcn/ui via CLI | como dependência npm | É a forma oficial — componentes ficam no código-fonte do projeto |

---

## Roadmap de Sprints (visão geral)

| Sprint | Foco | Duração estimada |
|---|---|---|
| **01** ← você está aqui | Skeleton & configuração técnica | 1–2 dias |
| **02** | Banco de dados: models SQLAlchemy + migrações Alembic + seed dos 50 FIIs | 3–4 dias |
| **03** | Coleta de dados: integração BRAPI + retry + scraping backup | 3–4 dias |
| **04** | Motor de scoring: faixas, fórmula, redistribuição de nulos | 3–4 dias |
| **05** | Clustering K-Means: pipeline, cotovelo, silhouette, interpretação | 3–4 dias |
| **06** | API REST: todos os endpoints FastAPI + testes de integração | 3–4 dias |
| **07** | Frontend: páginas, componentes, tabela de ranking, gráficos | 5–7 dias |
| **08** | Integração E2E, ajustes visuais, documentação TCC | 3–5 dias |

---

## Definição de Pronto — Sprint 01

- [ ] Repositório git com `.gitignore` correto
- [ ] `backend/pyproject.toml` com todas as deps declaradas
- [ ] `.venv` criado e funcional (não commitado)
- [ ] `alembic init` executado, `alembic.ini` configurado
- [ ] `app/main.py` sobe com `uvicorn app.main:app --reload` sem erros
- [ ] `pytest` executa (0 testes, 0 falhas)
- [ ] `ruff check .` sem erros
- [ ] `mypy app/` sem erros de tipo
- [ ] `frontend/` com todas as deps instaladas (`npm install`)
- [ ] `npm run dev` sobe o Vite sem erros
- [ ] `shadcn/ui` inicializado (`components.json` presente)
- [ ] `.env.example` na raiz com todas as variáveis documentadas
- [ ] Commit inicial: `feat: inicializa esqueleto monorepo fii-insights`
