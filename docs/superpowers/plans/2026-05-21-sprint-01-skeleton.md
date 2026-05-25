# Sprint 01 — Skeleton & Configuração Técnica — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar o esqueleto completo do monorepo fii-insights com backend FastAPI e frontend React/Vite prontos para iniciar a Sprint 02 sem decisões de infraestrutura pendentes.

**Architecture:** Monorepo com `backend/` (FastAPI + SQLite + scikit-learn) e `frontend/` (React 18 + TypeScript + Vite + shadcn/ui). Backend expõe API REST; frontend consome via axios/TanStack Query. Sem Docker, sem autenticação — decisões consolidadas.

**Tech Stack:** Python 3.11+, FastAPI 0.115, SQLAlchemy 2.0, Alembic, pytest, ruff, mypy / React 18, TypeScript 5.7, Vite 5, Tailwind CSS 3, shadcn/ui, TanStack Query 5, Zustand 5, Vitest

---

## Mapa de Arquivos

### Criados nesta sprint

```
fii-insights/
├── .gitignore
├── .env.example
├── README.md
│
├── backend/
│   ├── pyproject.toml
│   ├── alembic.ini
│   ├── .env                          # (local, não commitado)
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                   # FastAPI app + CORS + rota /health
│   │   ├── config.py                 # Settings via pydantic-settings
│   │   ├── database.py               # Engine, SessionLocal, Base, get_db
│   │   ├── models/__init__.py
│   │   ├── schemas/__init__.py
│   │   ├── routers/__init__.py
│   │   ├── services/__init__.py
│   │   ├── repositories/__init__.py
│   │   └── utils/__init__.py
│   ├── migrations/
│   │   ├── env.py                    # Configurado para importar Base do app
│   │   ├── script.py.mako
│   │   └── versions/                 # (vazio)
│   ├── scripts/__init__.py
│   ├── data/.gitkeep
│   ├── data/figures/.gitkeep
│   └── tests/
│       ├── __init__.py
│       ├── conftest.py               # TestClient fixture
│       ├── test_config.py            # Testa carregamento de settings
│       └── test_main.py              # Testa endpoint /health
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
    ├── components.json               # shadcn/ui config
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── vite-env.d.ts
        ├── api/client.ts
        ├── components/ui/            # (vazio, preenchido pelo CLI shadcn)
        ├── components/layout/        # (vazio)
        ├── components/charts/        # (vazio)
        ├── components/tables/        # (vazio)
        ├── pages/                    # (vazio)
        ├── hooks/                    # (vazio)
        ├── stores/perfilStore.ts
        ├── lib/utils.ts
        └── types/domain.ts
```

---

## Task 1: Arquivos raiz do repositório

**Files:**
- Create: `.gitignore`
- Create: `.env.example`
- Create: `README.md`

- [ ] **Passo 1: Criar `.gitignore`**

```
# Python
__pycache__/
*.py[cod]
*.pyo
.venv/
.env
*.db
*.sqlite3
.mypy_cache/
.ruff_cache/
dist/
build/
*.egg-info/

# Node
node_modules/
dist/
.env.local
.env.*.local

# Dados e figuras gerados
backend/data/fii_insights.db
backend/data/figures/*.png

# IDEs
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
```

- [ ] **Passo 2: Criar `.env.example` na raiz**

```env
# ─── Backend ───────────────────────────────────────────────────────────────
DATABASE_URL=sqlite:///./data/fii_insights.db
BRAPI_TOKEN=seu_token_aqui
CORS_ORIGINS=http://localhost:5173
LOG_LEVEL=INFO

# ─── Frontend (copiar para frontend/.env.local) ─────────────────────────────
VITE_API_BASE_URL=http://localhost:8000
```

- [ ] **Passo 3: Criar `README.md` mínimo**

```markdown
# FII-Insights

Sistema de análise e recomendação de Fundos de Investimento Imobiliário (FIIs)
com scoring multicritério e clustering K-Means.

> TCC — Bacharelado em Gestão da Informação (UFG)
> Autor: Hiago Cavalcante Menezes

## Pré-requisitos

- Python 3.11+
- Node 20+

## Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
cp ../.env.example .env          # edite BRAPI_TOKEN
alembic upgrade head
uvicorn app.main:app --reload
```

## Frontend

```bash
cd frontend
npm install
cp ../.env.example .env.local    # ajuste VITE_API_BASE_URL se necessário
npm run dev
```

## Testes

```bash
cd backend && pytest -v
cd frontend && npm run test
```
```

---

## Task 2: Backend — pyproject.toml e ambiente virtual

**Files:**
- Create: `backend/pyproject.toml`

- [ ] **Passo 1: Criar `backend/pyproject.toml`**

```toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "fii-insights"
version = "0.1.0"
description = "Análise e recomendação de FIIs com scoring e K-Means"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.115,<0.116",
    "uvicorn[standard]>=0.32,<0.33",
    "sqlalchemy>=2.0,<3.0",
    "alembic>=1.14,<2.0",
    "pydantic>=2.10,<3.0",
    "pydantic-settings>=2.7,<3.0",
    "python-dotenv>=1.0,<2.0",
    "httpx>=0.28,<0.29",
    "beautifulsoup4>=4.13,<5.0",
    "lxml>=5.3,<6.0",
    "pandas>=2.2,<3.0",
    "numpy>=2.2,<3.0",
    "scikit-learn>=1.6,<2.0",
    "matplotlib>=3.10,<4.0",
    "seaborn>=0.13,<1.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.3,<9.0",
    "pytest-asyncio>=0.25,<1.0",
    "ruff>=0.9,<1.0",
    "mypy>=1.14,<2.0",
]

[tool.hatch.build.targets.wheel]
packages = ["app"]

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]

[tool.ruff]
line-length = 88
target-version = "py311"

[tool.ruff.lint]
select = ["E", "F", "I", "UP"]

[tool.mypy]
python_version = "3.11"
strict = true
ignore_missing_imports = true
```

- [ ] **Passo 2: Criar virtualenv e instalar dependências**

Execute **dentro de `backend/`**:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

Verificar que não há erros. A saída final deve conter `Successfully installed`.

---

## Task 3: Backend — app/ skeleton

**Files:**
- Create: `backend/app/__init__.py`
- Create: `backend/app/config.py`
- Create: `backend/app/database.py`
- Create: `backend/app/main.py`
- Create: `backend/app/models/__init__.py`
- Create: `backend/app/schemas/__init__.py`
- Create: `backend/app/routers/__init__.py`
- Create: `backend/app/services/__init__.py`
- Create: `backend/app/repositories/__init__.py`
- Create: `backend/app/utils/__init__.py`
- Create: `backend/scripts/__init__.py`

- [ ] **Passo 1: Criar `backend/app/__init__.py`** (vazio)

```python
```

- [ ] **Passo 2: Criar `backend/app/config.py`**

```python
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./data/fii_insights.db"
    brapi_token: str = ""
    cors_origins: str = "http://localhost:5173"
    log_level: str = "INFO"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )


settings = Settings()
```

- [ ] **Passo 3: Criar `backend/app/database.py`**

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db() -> Session:
    """Dependency para injetar sessão de banco nos endpoints."""
    db = SessionLocal()
    try:
        yield db  # type: ignore[misc]
    finally:
        db.close()
```

- [ ] **Passo 4: Criar `backend/app/main.py`**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings

app = FastAPI(
    title="FII-Insights API",
    description="API para análise e recomendação de Fundos de Investimento Imobiliário.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["infra"])
async def health_check() -> dict[str, str]:
    """Verifica se a API está operacional."""
    return {"status": "ok"}
```

- [ ] **Passo 5: Criar `__init__.py` em todos os subpacotes**

Criar os arquivos abaixo **todos vazios**:

```
backend/app/models/__init__.py
backend/app/schemas/__init__.py
backend/app/routers/__init__.py
backend/app/services/__init__.py
backend/app/repositories/__init__.py
backend/app/utils/__init__.py
backend/scripts/__init__.py
```

- [ ] **Passo 6: Criar diretórios de dados com `.gitkeep`**

```bash
mkdir -p backend/data/figures
touch backend/data/.gitkeep
touch backend/data/figures/.gitkeep
```

---

## Task 4: Backend — testes (TDD do health check e config)

**Files:**
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/conftest.py`
- Create: `backend/tests/test_config.py`
- Create: `backend/tests/test_main.py`

- [ ] **Passo 1: Criar `backend/tests/__init__.py`** (vazio)

```python
```

- [ ] **Passo 2: Criar `backend/tests/conftest.py`**

```python
import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client() -> TestClient:
    """Retorna TestClient do FastAPI para testes de integração."""
    return TestClient(app)
```

- [ ] **Passo 3: Escrever testes que vão FALHAR primeiro**

Criar `backend/tests/test_config.py`:

```python
from app.config import Settings


def test_settings_defaults() -> None:
    s = Settings()
    assert "sqlite" in s.database_url
    assert s.log_level == "INFO"
    assert s.cors_origins == "http://localhost:5173"


def test_settings_brapi_token_default_vazio() -> None:
    s = Settings()
    assert s.brapi_token == ""
```

Criar `backend/tests/test_main.py`:

```python
from fastapi.testclient import TestClient


def test_health_retorna_ok(client: TestClient) -> None:
    resposta = client.get("/health")
    assert resposta.status_code == 200
    assert resposta.json() == {"status": "ok"}


def test_health_content_type_json(client: TestClient) -> None:
    resposta = client.get("/health")
    assert "application/json" in resposta.headers["content-type"]
```

- [ ] **Passo 4: Rodar testes e confirmar que FALHAM (pré-implementação)**

```bash
cd backend
source .venv/bin/activate
pytest tests/ -v
```

Esperado: `ModuleNotFoundError` ou `ImportError` — confirma que os módulos ainda não existem. Isso é o RED do TDD.

- [ ] **Passo 5: Confirmar testes PASSAM após Task 3**

(Assumindo que Task 3 foi executada antes desta etapa.)

```bash
pytest tests/ -v
```

Esperado:
```
tests/test_config.py::test_settings_defaults PASSED
tests/test_config.py::test_settings_brapi_token_default_vazio PASSED
tests/test_main.py::test_health_retorna_ok PASSED
tests/test_main.py::test_health_content_type_json PASSED

4 passed in X.XXs
```

---

## Task 5: Backend — Alembic

**Files:**
- Create: `backend/alembic.ini` (gerado pelo CLI)
- Modify: `backend/migrations/env.py`

- [ ] **Passo 1: Inicializar Alembic**

Execute **dentro de `backend/`** com o `.venv` ativado:

```bash
alembic init migrations
```

Saída esperada: `Creating directory .../migrations ... done`

- [ ] **Passo 2: Configurar `backend/alembic.ini`**

Encontrar a linha `sqlalchemy.url` e substituir:

```ini
# linha original:
sqlalchemy.url = driver://user:pass@localhost/dbname

# substituir por:
sqlalchemy.url = sqlite:///./data/fii_insights.db
```

- [ ] **Passo 3: Configurar `backend/migrations/env.py`**

Substituir o bloco de imports e target_metadata no arquivo gerado. Encontrar:

```python
# add your model's MetaData object here
# for 'autogenerate' support
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata
target_metadata = None
```

Substituir por:

```python
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.database import Base  # noqa: E402
from app import models  # noqa: E402, F401 — importa models para o Base registrá-los

target_metadata = Base.metadata
```

- [ ] **Passo 4: Verificar que alembic conecta**

```bash
cd backend
source .venv/bin/activate
alembic current
```

Esperado: `INFO  [alembic.runtime.migration] Context impl SQLiteImpl.` sem erros.

---

## Task 6: Backend — qualidade de código

**Files:** nenhum arquivo novo

- [ ] **Passo 1: Rodar ruff**

```bash
cd backend
source .venv/bin/activate
ruff check . --fix
```

Esperado: sem erros ou apenas avisos sobre imports não utilizados nos `__init__.py` (aceitável).

- [ ] **Passo 2: Rodar mypy**

```bash
mypy app/
```

Esperado:
```
Success: no issues found in N source files
```

Se houver erro de `missing stub` para alguma lib (ex: pandas), adicionar ao `pyproject.toml`:

```toml
[tool.mypy]
# adicionar:
[[tool.mypy.overrides]]
module = ["pandas.*", "sklearn.*", "seaborn.*", "matplotlib.*"]
ignore_missing_imports = true
```

---

## Task 7: Frontend — scaffold Vite + React + TypeScript

**Files:** todos gerados pelo CLI do Vite

- [ ] **Passo 1: Criar projeto Vite na raiz do monorepo**

Execute **na raiz do monorepo** (`fii-insights/`):

```bash
npm create vite@latest frontend -- --template react-ts
```

Quando perguntar, confirmar o nome `frontend`.

- [ ] **Passo 2: Instalar dependências base**

```bash
cd frontend
npm install
npm install @tanstack/react-query@^5.62 @tanstack/react-table@^8.20
npm install zustand@^5.0 react-router-dom@^6.28
npm install axios@^1.7
npm install react-hook-form@^7.54 zod@^3.24
npm install recharts@^2.14
npm install lucide-react@^0.468
npm install sonner@^1.7
npm install date-fns@^4.1
```

- [ ] **Passo 3: Instalar dependências de desenvolvimento**

```bash
npm install -D vitest@^2.1 @testing-library/react@^16.1 @testing-library/jest-dom@^6.6
npm install -D eslint@^9.17 prettier@^3.4
npm install -D openapi-typescript@^7.4
```

- [ ] **Passo 4: Verificar que o projeto sobe**

```bash
npm run dev
```

Esperado: `VITE v5.x.x  ready in XXXms` e a página padrão do Vite abre em `http://localhost:5173`.

---

## Task 8: Frontend — Tailwind CSS

**Files:**
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/postcss.config.js`
- Modify: `frontend/src/index.css` (ou criar se não existir)

- [ ] **Passo 1: Instalar Tailwind e dependências**

```bash
cd frontend
npm install -D tailwindcss@^3.4 autoprefixer@^10.4 postcss@^8.4
npx tailwindcss init -p --ts
```

O comando `init -p --ts` gera `tailwind.config.ts` e `postcss.config.js` automaticamente.

- [ ] **Passo 2: Configurar `frontend/tailwind.config.ts`**

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {},
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Passo 3: Adicionar diretivas Tailwind ao CSS global**

Substituir o conteúdo de `frontend/src/index.css` por:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

## Task 9: Frontend — shadcn/ui

**Files:**
- Create: `frontend/components.json` (gerado pelo CLI)
- Create: `frontend/src/lib/utils.ts`

- [ ] **Passo 1: Inicializar shadcn/ui**

```bash
cd frontend
npx shadcn@latest init
```

Responder às perguntas do CLI:
- Style: **Default**
- Base color: **Slate**
- CSS variables: **Yes**

O CLI vai criar `components.json` e modificar `tailwind.config.ts` e `index.css`.

- [ ] **Passo 2: Verificar `frontend/src/lib/utils.ts` foi criado**

O shadcn cria esse arquivo automaticamente com o helper `cn()`. Confirmar que existe:

```typescript
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

Se não foi criado, crie manualmente e instale as dependências:

```bash
npm install clsx tailwind-merge
```

- [ ] **Passo 3: Instalar componentes shadcn iniciais**

```bash
npx shadcn@latest add button card badge skeleton table tooltip select
```

---

## Task 10: Frontend — estrutura src/

**Files:**
- Modify: `frontend/src/main.tsx`
- Modify: `frontend/src/App.tsx`
- Create: `frontend/src/api/client.ts`
- Create: `frontend/src/stores/perfilStore.ts`
- Create: `frontend/src/types/domain.ts`
- Create: diretórios vazios com `.gitkeep`

- [ ] **Passo 1: Criar estrutura de diretórios**

```bash
cd frontend/src
mkdir -p api/endpoints components/layout components/charts components/tables pages hooks
touch api/endpoints/.gitkeep components/layout/.gitkeep components/charts/.gitkeep
touch components/tables/.gitkeep pages/.gitkeep hooks/.gitkeep
```

- [ ] **Passo 2: Atualizar `frontend/src/main.tsx`**

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster richColors position="top-right" />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
```

- [ ] **Passo 3: Atualizar `frontend/src/App.tsx`**

```tsx
import { Routes, Route } from "react-router-dom";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<div className="p-8 text-2xl font-bold">FII-Insights — em construção</div>} />
    </Routes>
  );
}
```

- [ ] **Passo 4: Criar `frontend/src/api/client.ts`**

```typescript
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});
```

- [ ] **Passo 5: Criar `frontend/src/stores/perfilStore.ts`**

```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";

type TipoPerfil = "conservador" | "moderado" | "arrojado";

interface PerfilState {
  tipo: TipoPerfil;
  setTipo: (tipo: TipoPerfil) => void;
}

export const usePerfilStore = create<PerfilState>()(
  persist(
    (set) => ({
      tipo: "moderado",
      setTipo: (tipo) => set({ tipo }),
    }),
    { name: "fii-perfil-investidor" }
  )
);
```

- [ ] **Passo 6: Criar `frontend/src/types/domain.ts`**

```typescript
export type TipoPerfil = "conservador" | "moderado" | "arrojado";

export type Classificacao = "Excelente" | "Bom" | "Regular" | "Evitar";

export interface Fundo {
  id: number;
  ticker: string;
  nome: string;
  segmento: string | null;
  gestora: string | null;
}

export interface Indicador {
  id: number;
  fundo_id: number;
  data_referencia: string;
  dy_atual: number | null;
  dy_12m: number | null;
  p_vp: number | null;
  vacancia_fisica: number | null;
  vacancia_financeira: number | null;
  liquidez_diaria: number | null;
  volatilidade_12m: number | null;
  patrimonio_liquido: number | null;
  num_cotistas: number | null;
}

export interface ScoringHistorico {
  id: number;
  fundo_id: number;
  data_execucao: string;
  score: number;
  classificacao: Classificacao;
}

export interface Cluster {
  id: number;
  nome_interpretado: string;
  perfil_risco: TipoPerfil;
  descricao: string;
  dy_medio: number | null;
  volatilidade_media: number | null;
  p_vp_medio: number | null;
  num_fiis: number;
}
```

- [ ] **Passo 7: Criar `frontend/.env.local`**

```env
VITE_API_BASE_URL=http://localhost:8000
```

- [ ] **Passo 8: Verificar que frontend sobe sem erros de TypeScript**

```bash
cd frontend
npm run dev
```

Esperado: servidor Vite rodando sem erros de compilação TypeScript.

---

## Task 11: Verificação final (DoD)

- [ ] **Passo 1: Backend — testes completos**

```bash
cd backend
source .venv/bin/activate
pytest -v
```

Esperado:
```
tests/test_config.py::test_settings_defaults PASSED
tests/test_config.py::test_settings_brapi_token_default_vazio PASSED
tests/test_main.py::test_health_retorna_ok PASSED
tests/test_main.py::test_health_content_type_json PASSED

4 passed
```

- [ ] **Passo 2: Backend — ruff**

```bash
ruff check .
```

Esperado: `All checks passed!`

- [ ] **Passo 3: Backend — mypy**

```bash
mypy app/
```

Esperado: `Success: no issues found in N source files`

- [ ] **Passo 4: Backend — uvicorn sobe**

```bash
uvicorn app.main:app --reload
```

Esperado:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

Acessar `http://127.0.0.1:8000/docs` e confirmar Swagger UI disponível.

- [ ] **Passo 5: Frontend — npm run dev**

```bash
cd frontend
npm run dev
```

Esperado: `VITE v5.x  ready` e página em `http://localhost:5173` com texto "FII-Insights — em construção".

- [ ] **Passo 6: Alembic**

```bash
cd backend
source .venv/bin/activate
alembic current
```

Esperado: sem erros de conexão.

---

## Definição de Pronto — Sprint 01

| Critério | Verificado |
|---|---|
| `pytest -v` → 4 passed, 0 failed | [ ] |
| `ruff check .` → All checks passed | [ ] |
| `mypy app/` → Success | [ ] |
| `uvicorn app.main:app --reload` → sem erros | [ ] |
| `/health` retorna `{"status": "ok"}` | [ ] |
| `alembic current` → sem erros | [ ] |
| `npm run dev` → sem erros | [ ] |
| `localhost:5173` carrega página | [ ] |
| `localhost:8000/docs` carrega Swagger UI | [ ] |
