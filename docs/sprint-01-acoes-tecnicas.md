# Sprint 01 — Ações Técnicas Realizadas

> **Data:** 2026-05-22
> **Status:** Concluída ✅
> **Duração:** 1 sessão

---

## Resumo executivo

Esqueleto completo do monorepo fii-insights criado do zero. Backend FastAPI funcional com 4 testes passando e qualidade de código verificada (ruff + mypy). Frontend React/Vite com TypeScript limpo, Tailwind CSS, shadcn/ui e estrutura de pastas completa.

---

## O que foi criado

### Raiz do monorepo

| Arquivo | Conteúdo |
|---|---|
| `.gitignore` | Ignora Python, Node, SQLite, figuras geradas, IDEs, OS, pytest cache |
| `.env.example` | Template com DATABASE_URL, BRAPI_TOKEN (link brapi.dev), CORS_ORIGINS, LOG_LEVEL, VITE_API_BASE_URL |
| `README.md` | Setup completo: clone, backend, frontend, testes, scripts de dados, links Swagger |

---

### Backend (`backend/`)

#### `pyproject.toml`
- Build system: hatchling
- Python: `>=3.11` (instalado com 3.12.3)
- **15 dependências de produção** com versões fixadas:

| Pacote instalado | Versão |
|---|---|
| fastapi | 0.115.x |
| uvicorn[standard] | 0.32.x |
| sqlalchemy | 2.0.x |
| alembic | 1.14.x |
| pydantic | 2.10.x |
| pydantic-settings | 2.7.x |
| python-dotenv | 1.0.x |
| httpx | 0.28.x |
| beautifulsoup4 | 4.13.x |
| lxml | 5.3.x |
| pandas | 2.2.x |
| numpy | 2.2.x |
| scikit-learn | 1.6.x |
| matplotlib | 3.10.x |
| seaborn | 0.13.x |

- **4 dependências de dev:** pytest 8.3, pytest-asyncio 0.25, ruff 0.9, mypy 1.14
- Configuração de ferramentas: `[tool.pytest]`, `[tool.ruff]`, `[tool.mypy]` no mesmo arquivo

#### Estrutura `app/`

```
app/
├── __init__.py
├── config.py       → Settings via pydantic-settings (.env)
├── database.py     → SQLAlchemy engine + SessionLocal + Base + get_db()
├── main.py         → FastAPI app + CORSMiddleware + GET /health
├── models/         → (vazio — preenchido Sprint 02)
├── schemas/        → (vazio — preenchido Sprint 02)
├── routers/        → (vazio — preenchido Sprint 06)
├── services/       → (vazio — preenchido Sprint 04-05)
├── repositories/   → (vazio — preenchido Sprint 02)
└── utils/          → (vazio)
```

#### Decisões técnicas do backend

| Decisão | Detalhe |
|---|---|
| `structlog` removido | Logging padrão Python suficiente para TCC mono-usuário |
| `seaborn` adicionado | Gráficos de análise de clusters ficam no TCC impresso — estética importa |
| `ruff` unificado | Substitui flake8 + isort + black em uma ferramenta só |
| `hatchling` como build backend | Leve, sem configuração extra para projeto não publicável |
| mypy `strict = true` | Type hints obrigatórias em todo o código de negócio |

#### Alembic

- `alembic init migrations` executado
- `alembic.ini` configurado: `sqlite:///./data/fii_insights.db`
- `migrations/env.py` configurado para importar `Base` de `app.database`
- Pronto para `alembic revision --autogenerate` na Sprint 02

#### Testes (TDD)

Arquivo | Testes | Resultado
---|---|---
`tests/test_config.py` | `test_settings_defaults`, `test_settings_brapi_token_default_vazio` | ✅ PASS
`tests/test_main.py` | `test_health_retorna_ok`, `test_health_content_type_json` | ✅ PASS

**Total: 4 passed, 0 failed**

---

### Frontend (`frontend/`)

#### Dependências instaladas

**Produção:**

| Pacote | Versão instalada | Papel |
|---|---|---|
| react + react-dom | 19.2.6 | UI |
| typescript | 5.9.3 | Tipagem estrita |
| vite | 5.x | Bundler / dev server |
| @tanstack/react-query | 5.100.13 | Server state |
| @tanstack/react-table | 8.21.3 | Tabela de ranking |
| zustand | 5.0.13 | Client state (perfil no localStorage) |
| react-router-dom | 6.30.3 | Roteamento SPA |
| axios | 1.16.1 | Cliente HTTP → backend |
| react-hook-form | 7.76.0 | Formulários |
| zod | 3.25.76 | Validação de schemas |
| recharts | 2.15.4 | Gráficos interativos |
| lucide-react | 0.468.0 | Ícones |
| sonner | 1.7.4 | Toasts |
| date-fns | 4.2.1 | Datas em pt-BR |
| tailwindcss | 3.4.x | Estilização |
| shadcn/ui | via CLI | Componentes: button, card, badge, skeleton, table, tooltip, select |

**Dev:**

| Pacote | Versão |
|---|---|
| vitest | 2.1.9 |
| @testing-library/react | 16.3.2 |
| @testing-library/jest-dom | 6.9.1 |
| eslint | 9.39.4 |
| prettier | 3.8.3 |
| openapi-typescript | 7.13.0 |

#### Estrutura `src/`

```
src/
├── main.tsx          → QueryClientProvider + BrowserRouter + Toaster
├── App.tsx           → Routes scaffold (placeholder)
├── index.css         → @tailwind base/components/utilities + shadcn CSS vars
├── vite-env.d.ts
├── api/
│   ├── client.ts     → axios instance (VITE_API_BASE_URL)
│   └── endpoints/    → (vazio — preenchido Sprint 06)
├── components/
│   ├── ui/           → 7 componentes shadcn/ui gerados
│   ├── layout/       → (vazio — preenchido Sprint 07)
│   ├── charts/       → (vazio — preenchido Sprint 07)
│   └── tables/       → (vazio — preenchido Sprint 07)
├── pages/            → (vazio — preenchido Sprint 07)
├── hooks/            → (vazio — preenchido Sprint 07)
├── stores/
│   └── perfilStore.ts → Zustand + persist (conservador/moderado/arrojado)
├── lib/
│   └── utils.ts      → cn() helper (clsx + tailwind-merge)
└── types/
    ├── domain.ts     → Fundo, Indicador, ScoringHistorico, Cluster, TipoPerfil, Classificacao
    └── api.ts        → (gerado por openapi-typescript na Sprint 06)
```

#### Configurações criadas

| Arquivo | Conteúdo |
|---|---|
| `tailwind.config.ts` | darkMode class, content globs, borderRadius com CSS vars |
| `components.json` | shadcn/ui config (style: base-nova, baseColor: neutral) |
| `tsconfig.app.json` | Alias `@/*` → `./src/*` (necessário para shadcn/ui) |
| `vite.config.ts` | Alias `@` configurado via `@rollup/plugin-alias` |
| `.env.local` | `VITE_API_BASE_URL=http://localhost:8000` |

---

## Verificação final (DoD)

| Critério | Status |
|---|---|
| `pytest -v` → 4 passed, 0 failed | ✅ |
| `ruff check .` → All checks passed | ✅ |
| `mypy app/` → Success: 10 source files | ✅ |
| `uvicorn app.main:app` → startup complete | ✅ |
| `alembic current` → SQLiteImpl sem erros | ✅ |
| `npx tsc --noEmit` → sem erros | ✅ |
| Todos os 14+ arquivos essenciais existem | ✅ |

---

## Próxima sprint

**Sprint 02 — Banco de dados**
- Models SQLAlchemy: `Fundo`, `Indicador`, `ScoringHistorico`, `Cluster`, `FundoCluster`, `PerfilInvestidor`
- Migrações Alembic (`alembic revision --autogenerate`)
- Seed dos 50 FIIs por liquidez diária
- Repositories básicos com queries SQLAlchemy

---

## Comandos para iniciar desenvolvimento

```bash
# Backend
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload
# → http://localhost:8000/docs

# Frontend
cd frontend
npm run dev
# → http://localhost:5173

# Testes backend
cd backend && source .venv/bin/activate && pytest -v

# Qualidade
ruff check . && mypy app/
```
