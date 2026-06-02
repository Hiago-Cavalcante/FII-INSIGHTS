# Sprint 0 — Fundação fina + Deploy público — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> ⚠️ **Git:** o usuário (Hiago) exige autorização explícita antes de QUALQUER comando git. Os passos de `git commit` abaixo só são executados após o "pode commitar" dele.

**Goal:** Deixar o app atual rodando sobre PostgreSQL (Neon) e publicado em URL pública (backend Render + frontend Vercel), e adicionar o campo `classe` (FII/FIAGRO) ao modelo `fundos` — sem regressão no núcleo existente.

**Architecture:** O código fica agnóstico de banco: helpers normalizam a URL (injeta driver `psycopg` para Postgres) e escolhem `connect_args` por dialeto, então o mesmo código roda em SQLite (dev/testes) e Postgres (prod). Alembic passa a ler `DATABASE_URL` do ambiente em vez do valor fixo no `alembic.ini`. Deploy via blueprint `render.yaml` (backend) e `vercel.json` (frontend SPA). Testes continuam em SQLite in-memory (rápidos).

**Tech Stack:** Python 3.12 · FastAPI · SQLAlchemy 2.0 · Alembic · psycopg 3 · PostgreSQL (Neon) · Render · Vite/React (Vercel).

---

## File Structure

**Backend — modificados:**
- `backend/pyproject.toml` — adiciona dependência `psycopg[binary]`.
- `backend/app/database.py` — helpers `normalize_database_url` e `connect_args_for`; engine usa ambos.
- `backend/migrations/env.py` — injeta `DATABASE_URL` (normalizada) em `sqlalchemy.url`.
- `backend/app/models/fundo.py` — novo campo `classe`.
- `backend/app/repositories/fundo_repository.py` — `criar()` aceita `classe`.
- `backend/scripts/seed_fundos.py` — marca SPAF11 como FIAGRO.
- `.env.example` — linha de exemplo Postgres/Neon.

**Backend — criados:**
- `backend/tests/test_database_url.py` — testes dos helpers de URL.
- `backend/migrations/versions/<rev>_adiciona_classe_em_fundos.py` — migração (autogerada).

**Deploy — criados:**
- `render.yaml` (raiz do repo) — blueprint do backend.
- `frontend/vercel.json` — rewrite SPA.

**Não-código (trilhas paralelas da S0, fora deste plano de TDD):** spike de cobertura FIAGRO na BRAPI (RF-12) e brainstorm de provedor/custo de LLM (RF-38). Ver seção final.

---

## Task 1: Dependência do driver PostgreSQL

**Files:**
- Modify: `backend/pyproject.toml:10-26`

- [ ] **Step 1: Adicionar psycopg às dependências**

Em `backend/pyproject.toml`, dentro de `dependencies`, após a linha do `alembic`:

```toml
    "alembic>=1.14,<2.0",
    "psycopg[binary]>=3.2,<4.0",
```

- [ ] **Step 2: Instalar no venv**

Run: `cd backend && pip install -e ".[dev]"`
Expected: instala `psycopg` sem erro (`Successfully installed psycopg-3.x`).

- [ ] **Step 3: Verificar import**

Run: `cd backend && python -c "import psycopg; print(psycopg.__version__)"`
Expected: imprime a versão (ex.: `3.2.x`).

- [ ] **Step 4: Commit**

```bash
git add backend/pyproject.toml
git commit -m "chore(backend): adiciona driver psycopg para PostgreSQL (A1)"
```

---

## Task 2: Helpers de URL de banco (TDD)

**Files:**
- Test: `backend/tests/test_database_url.py`
- Modify: `backend/app/database.py`

- [ ] **Step 1: Escrever os testes que falham**

Criar `backend/tests/test_database_url.py`:

```python
from app.database import connect_args_for, normalize_database_url


def test_normalize_injeta_psycopg_em_postgres_puro():
    url = "postgresql://user:senha@host.neon.tech/db?sslmode=require"
    assert normalize_database_url(url) == (
        "postgresql+psycopg://user:senha@host.neon.tech/db?sslmode=require"
    )


def test_normalize_preserva_url_que_ja_tem_driver():
    url = "postgresql+psycopg://user:senha@host/db"
    assert normalize_database_url(url) == url


def test_normalize_nao_altera_sqlite():
    url = "sqlite:///./data/fii_insights.db"
    assert normalize_database_url(url) == url


def test_connect_args_sqlite_tem_check_same_thread():
    assert connect_args_for("sqlite:///x.db") == {"check_same_thread": False}


def test_connect_args_postgres_e_vazio():
    assert connect_args_for("postgresql+psycopg://u:p@h/d") == {}
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd backend && pytest tests/test_database_url.py -v`
Expected: FAIL com `ImportError: cannot import name 'connect_args_for'`.

- [ ] **Step 3: Implementar os helpers**

Em `backend/app/database.py`, adicionar ANTES da criação do `engine` (após os imports):

```python
def normalize_database_url(url: str) -> str:
    """Garante o driver psycopg em URLs Postgres (Neon entrega 'postgresql://')."""
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


def connect_args_for(url: str) -> dict[str, object]:
    """check_same_thread é exclusivo do SQLite; Postgres não aceita esse arg."""
    if url.startswith("sqlite"):
        return {"check_same_thread": False}
    return {}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd backend && pytest tests/test_database_url.py -v`
Expected: PASS (5 passed).

- [ ] **Step 5: Commit**

```bash
git add backend/app/database.py backend/tests/test_database_url.py
git commit -m "feat(backend): helpers de URL agnósticos de banco (SQLite/Postgres) (A1)"
```

---

## Task 3: Engine e Alembic usando os helpers

**Files:**
- Modify: `backend/app/database.py:8-11`
- Modify: `backend/migrations/env.py:22-25`

- [ ] **Step 1: Reescrever a criação do engine**

Em `backend/app/database.py`, substituir o bloco atual:

```python
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},
)
```

por:

```python
_db_url = normalize_database_url(settings.database_url)
engine = create_engine(_db_url, connect_args=connect_args_for(_db_url))
```

- [ ] **Step 2: Alembic lê DATABASE_URL do ambiente**

Em `backend/migrations/env.py`, logo após `from app.database import Base` (linha ~23), adicionar:

```python
from app.config import settings  # noqa: E402
from app.database import normalize_database_url  # noqa: E402

config.set_main_option("sqlalchemy.url", normalize_database_url(settings.database_url))
```

- [ ] **Step 3: Verificar que a suíte inteira continua verde (sem regressão)**

Run: `cd backend && pytest -v`
Expected: PASS (todos os testes existentes + os 5 novos).

- [ ] **Step 4: Verificar Alembic local (ainda SQLite)**

Run: `cd backend && alembic upgrade head && alembic current`
Expected: aplica até a revisão `77ab8151e029` (ou já está em dia) sem erro; `alembic current` imprime a revisão atual.

- [ ] **Step 5: Commit**

```bash
git add backend/app/database.py backend/migrations/env.py
git commit -m "refactor(backend): engine e Alembic agnósticos de banco via DATABASE_URL (A1)"
```

---

## Task 4: Campo `classe` no modelo Fundo (TDD)

**Files:**
- Test: `backend/tests/test_models.py` (append)
- Modify: `backend/app/models/fundo.py:21-23`

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar ao fim de `backend/tests/test_models.py`:

```python
def test_fundo_classe_default_fii(db_session):
    fundo = Fundo(ticker="HGLG11")
    db_session.add(fundo)
    db_session.commit()
    db_session.refresh(fundo)
    assert fundo.classe == "FII"


def test_fundo_classe_fiagro(db_session):
    fundo = Fundo(ticker="SPAF11", classe="FIAGRO")
    db_session.add(fundo)
    db_session.commit()
    db_session.refresh(fundo)
    assert fundo.classe == "FIAGRO"
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd backend && pytest tests/test_models.py -k classe -v`
Expected: FAIL com `AttributeError`/`TypeError` (atributo `classe` inexistente).

- [ ] **Step 3: Adicionar o campo ao model**

Em `backend/app/models/fundo.py`, logo após o bloco do `ticker` (linha ~23), adicionar:

```python
    classe: Mapped[str] = mapped_column(
        String(6), nullable=False, server_default="FII", default="FII"
    )
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd backend && pytest tests/test_models.py -k classe -v`
Expected: PASS (2 passed).

- [ ] **Step 5: Commit**

```bash
git add backend/app/models/fundo.py backend/tests/test_models.py
git commit -m "feat(scoring): adiciona classe (FII/FIAGRO) ao modelo de fundos (RF-14)"
```

---

## Task 5: Migração Alembic para `classe`

**Files:**
- Create: `backend/migrations/versions/<rev>_adiciona_classe_em_fundos.py` (autogerado)

- [ ] **Step 1: Autogerar a migração (contra o SQLite local)**

Run: `cd backend && alembic revision --autogenerate -m "adiciona classe em fundos"`
Expected: cria um arquivo em `migrations/versions/` com `down_revision = '77ab8151e029'`.

- [ ] **Step 2: Revisar e enxugar o arquivo gerado**

Abrir o arquivo gerado. O `upgrade()` deve conter **apenas**:

```python
def upgrade() -> None:
    op.add_column(
        "fundos",
        sa.Column("classe", sa.String(length=6), server_default="FII", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("fundos", "classe")
```

Se o autogenerate inserir operações espúrias (ex.: alterações de `server_default` de `created_at`/`updated_at` por ruído de dialeto), **remover** essas linhas — mantenha só o `add_column`/`drop_column` de `classe`.

- [ ] **Step 3: Aplicar e testar reversibilidade no SQLite local**

Run:
```bash
cd backend && alembic upgrade head && alembic downgrade -1 && alembic upgrade head
```
Expected: upgrade adiciona a coluna; downgrade remove; segundo upgrade readiciona — tudo sem erro.

- [ ] **Step 4: Confirmar suíte verde**

Run: `cd backend && pytest -v`
Expected: PASS (toda a suíte).

- [ ] **Step 5: Commit**

```bash
git add backend/migrations/versions/
git commit -m "feat(scoring): migração da coluna classe em fundos (RF-14)"
```

---

## Task 6: `criar()` aceita `classe` + seed marca FIAGRO (TDD)

**Files:**
- Test: `backend/tests/test_fundo_repository.py` (append)
- Modify: `backend/app/repositories/fundo_repository.py:11-29`
- Modify: `backend/scripts/seed_fundos.py:303-307`

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar ao fim de `backend/tests/test_fundo_repository.py`:

```python
def test_criar_fundo_com_classe_fiagro(db_session):
    repo = FundoRepository(db_session)
    fundo = repo.criar(ticker="SPAF11", nome="Sparta Cred Fiagro", classe="FIAGRO")
    assert fundo.classe == "FIAGRO"


def test_criar_fundo_classe_default_fii(db_session):
    repo = FundoRepository(db_session)
    fundo = repo.criar(ticker="XPLG11")
    assert fundo.classe == "FII"
```

> Se `FundoRepository` ainda não estiver importado no arquivo de teste, adicionar no topo: `from app.repositories.fundo_repository import FundoRepository`.

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd backend && pytest tests/test_fundo_repository.py -k classe -v`
Expected: FAIL com `TypeError: criar() got an unexpected keyword argument 'classe'`.

- [ ] **Step 3: Adicionar o parâmetro `classe` ao `criar()`**

Em `backend/app/repositories/fundo_repository.py`, substituir o método `criar` por:

```python
    def criar(
        self,
        ticker: str,
        nome: str | None = None,
        segmento: str | None = None,
        gestora: str | None = None,
        data_ipo: object = None,
        classe: str = "FII",
    ) -> Fundo:
        fundo = Fundo(
            ticker=ticker,
            nome=nome,
            segmento=segmento,
            gestora=gestora,
            data_ipo=data_ipo,
            classe=classe,
        )
        self.db.add(fundo)
        self.db.commit()
        self.db.refresh(fundo)
        return fundo
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd backend && pytest tests/test_fundo_repository.py -k classe -v`
Expected: PASS (2 passed).

- [ ] **Step 5: Marcar SPAF11 como FIAGRO no seed**

Em `backend/scripts/seed_fundos.py`, o dict do `SPAF11` (linhas ~302-307) passa a:

```python
    {
        "ticker": "SPAF11",
        "nome": "Sparta Cred Fiagro",
        "segmento": "Recebíveis",
        "gestora": "Sparta Investimentos",
        "classe": "FIAGRO",
    },
```

- [ ] **Step 6: Verificar suíte + seed idempotente local**

Run: `cd backend && pytest -v && python -m scripts.seed_fundos`
Expected: testes PASS; o seed imprime contagem (`X criados, Y já existiam`) sem erro.

- [ ] **Step 7: Commit**

```bash
git add backend/app/repositories/fundo_repository.py backend/tests/test_fundo_repository.py backend/scripts/seed_fundos.py
git commit -m "feat(scoring): seed marca SPAF11 como FIAGRO; criar() aceita classe (RF-14)"
```

---

## Task 7: Gate de qualidade do backend

**Files:** nenhum (verificação)

- [ ] **Step 1: Suíte completa**

Run: `cd backend && pytest -v`
Expected: PASS — todos (núcleo + novos testes de URL, classe e repo).

- [ ] **Step 2: Lint + tipos**

Run: `cd backend && ruff check . && mypy app/`
Expected: `All checks passed!` no ruff; mypy sem erros novos em `app/`.

- [ ] **Step 3: Smoke local do servidor**

Run (em um terminal): `cd backend && uvicorn app.main:app --port 8000`
Depois: `curl -s localhost:8000/health` e `curl -s localhost:8000/api/v1/ranking | head -c 300`
Expected: `/health` → `{"status":"ok"}`; ranking retorna JSON com fundos.

---

## Task 8: Arquivos de configuração de deploy

**Files:**
- Create: `render.yaml` (raiz do repo)
- Create: `frontend/vercel.json`
- Modify: `.env.example`

- [ ] **Step 1: Blueprint do Render**

Criar `render.yaml` na raiz do repositório:

```yaml
services:
  - type: web
    name: fii-insights-api
    runtime: python
    rootDir: backend
    plan: free
    region: oregon
    branch: main
    buildCommand: pip install .
    startCommand: alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT
    healthCheckPath: /health
    envVars:
      - key: PYTHON_VERSION
        value: "3.12.3"
      - key: DATABASE_URL
        sync: false
      - key: BRAPI_TOKEN
        sync: false
      - key: CORS_ORIGINS
        sync: false
      - key: LOG_LEVEL
        value: INFO
```

> `sync: false` = segredo definido no painel do Render, **não** versionado. `startCommand` roda a migração antes de subir (idempotente).

- [ ] **Step 2: Rewrite SPA do Vercel**

Criar `frontend/vercel.json`:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

> Assets reais (`/assets/*`) são servidos primeiro pelo filesystem do Vercel; só rotas do React Router caem no rewrite.

- [ ] **Step 3: Documentar Postgres no `.env.example`**

Em `.env.example`, logo após a linha `DATABASE_URL=sqlite:///...`, adicionar:

```env
# Produção (Neon) — o driver +psycopg é injetado automaticamente se você usar postgresql://
# DATABASE_URL=postgresql+psycopg://usuario:senha@host.neon.tech/dbname?sslmode=require
```

- [ ] **Step 4: Commit**

```bash
git add render.yaml frontend/vercel.json .env.example
git commit -m "chore(deploy): blueprint Render + rewrite SPA Vercel + exemplo Neon (A1)"
```

---

## Task 9: Provisionar Neon e validar o schema em Postgres (runbook)

> **Ops — assistível por MCP** (Neon DB MCP disponível: `list_projects`, `get_connection_string`, `run_sql`). Requer a conta Neon do Hiago.

- [ ] **Step 1: Criar/obter o projeto Neon e a connection string**

Via painel Neon (ou MCP Neon) criar projeto `fii-insights` e copiar a connection string (formato `postgresql://user:senha@host.neon.tech/dbname?sslmode=require`).

- [ ] **Step 2: Aplicar migrações no Neon a partir da máquina local**

Run:
```bash
cd backend && DATABASE_URL='postgresql://user:senha@host.neon.tech/dbname?sslmode=require' alembic upgrade head
```
Expected: cria todas as tabelas no Neon **incluindo** a coluna `classe`. (Valida o risco do `server_default=(CURRENT_TIMESTAMP)` em Postgres — se quebrar, acionar `systematic-debugging`.)

- [ ] **Step 3: Confirmar o schema no Neon**

Via MCP Neon `run_sql` (ou `psql`):
```sql
SELECT table_name FROM information_schema.tables WHERE table_schema='public';
SELECT column_name FROM information_schema.columns WHERE table_name='fundos';
```
Expected: lista contém `fundos`, `indicadores`, `scoring_historico`, `clusters`, `fundo_clusters`, `perfis_investidor`; colunas de `fundos` incluem `classe`.

- [ ] **Step 4: Semear dados no Neon (para a demo pública ter conteúdo)**

Run:
```bash
cd backend && DATABASE_URL='postgresql://user:senha@host.neon.tech/dbname?sslmode=require' python -m scripts.seed_fundos
```
Expected: `50 criados, 0 já existiam` (ou contagem equivalente). Opcional: rodar `coletar_dados`/`rodar_scoring` se houver `BRAPI_TOKEN`, para popular indicadores/score.

---

## Task 10: Deploy do backend no Render (runbook)

> **Ops — manual** (sem MCP de Render). Requer a conta Render do Hiago conectada ao GitHub.

- [ ] **Step 1: Criar o serviço a partir do blueprint**

No painel Render → New → Blueprint → selecionar o repositório. O Render lê o `render.yaml`.

- [ ] **Step 2: Definir os segredos (envVars `sync: false`)**

No serviço, configurar:
- `DATABASE_URL` = a connection string do Neon (Task 9.1)
- `BRAPI_TOKEN` = token do Hiago (https://brapi.dev)
- `CORS_ORIGINS` = `http://localhost:5173` (provisório; atualizado na Task 11 com a URL do Vercel)

- [ ] **Step 3: Deploy e verificar health**

Após o build/deploy, anotar a URL (ex.: `https://fii-insights-api.onrender.com`).
Run: `curl -s https://fii-insights-api.onrender.com/health`
Expected: `{"status":"ok"}`.

- [ ] **Step 4: Verificar dados via API pública**

Run: `curl -s https://fii-insights-api.onrender.com/api/v1/ranking | head -c 300`
Expected: JSON com fundos vindos do Neon.

> ⚠️ **Risco de RAM (free 512MB):** se o boot falhar por memória (scikit-learn/pandas/matplotlib), tornar os imports de `matplotlib`/`seaborn` **lazy** (dentro das funções que geram figuras, não no topo do módulo) e redeployar. Acionar `systematic-debugging` se persistir.
> ⚠️ Free tier hiberna após inatividade (cold start ~50s) — aceitável; "aquecer" a URL antes da defesa.

---

## Task 11: Deploy do frontend no Vercel + CORS (runbook)

> **Ops — assistível por MCP** (Vercel MCP: `deploy_to_vercel`, `get_project`). Requer a conta Vercel do Hiago.

- [ ] **Step 1: Criar projeto Vercel apontando para `frontend/`**

Importar o repo no Vercel; **Root Directory** = `frontend`. Framework preset: Vite (build `npm run build`, output `dist`).

- [ ] **Step 2: Variável de ambiente de build**

No projeto Vercel, definir `VITE_API_BASE_URL` = a URL do Render (Task 10.3, ex.: `https://fii-insights-api.onrender.com`). Redeployar para o valor entrar no bundle.

- [ ] **Step 3: Fechar o CORS**

Anotar a URL pública do Vercel (ex.: `https://fii-insights.vercel.app`). No Render, atualizar `CORS_ORIGINS` para incluí-la:
`CORS_ORIGINS=https://fii-insights.vercel.app` (separar por vírgula se mantiver localhost). Salvar → Render reinicia.

- [ ] **Step 4: Verificar a chamada cross-origin**

Abrir a URL do Vercel no navegador, aba Network: a página de Ranking deve carregar dados de `…onrender.com/api/v1/ranking` sem erro de CORS.

---

## Task 12: Smoke test ponta a ponta (gate de "pronto" da S0)

**Files:** nenhum (verificação — `verification-before-completion`)

- [ ] **Step 1: Validar no viewport mobile primeiro (RNF-05)**

Abrir a URL pública do Vercel em viewport mobile (DevTools ~375px). Conferir: Ranking, Clusters e Perfil renderizam e consomem a API pública (Render+Neon).

- [ ] **Step 2: Conferir o campo classe persistido**

Via MCP Neon `run_sql`: `SELECT ticker, classe FROM fundos WHERE ticker IN ('SPAF11','XPLG11');`
Expected: `SPAF11 → FIAGRO`, `XPLG11 → FII`.

- [ ] **Step 3: Registrar as URLs**

Anotar URL do frontend (Vercel) e do backend (Render) — entram no doc do TCC e na memória do projeto. A S0 está "pronta" quando a URL pública do Vercel serve o núcleo sobre Postgres.

---

## Trilhas paralelas da S0 (não-código — fora deste plano de TDD)

Rodam em paralelo às tasks acima; **não** são tarefas RED→GREEN:

1. **🔬 Spike de cobertura FIAGRO na BRAPI (RF-12).** Investigar quais campos de FIAGRO (crédito, duration, indexador, inadimplência) a BRAPI expõe e para quais tickers. Entregável: um relatório curto em `docs/superpowers/specs/` que alimenta o brainstorm do scoring FIAGRO (S3). Pode ser executado via chamadas à API (requer `BRAPI_TOKEN`).
2. **🤖 Decisão de provedor/custo de LLM (RF-38).** Brainstorm dedicado (free tier vs. chave própria vs. local) + estimativa de custo. Entregável: decisão registrada que destrava o cliente do assistente (S5).

---

## Self-Review (writing-plans)

- **Cobertura do spec (S0):** Postgres/Neon (Tasks 1-3, 9) ✓ · deploy público Render+Vercel (Tasks 8, 10-12) ✓ · campo `classe` (Tasks 4-6) ✓ · spikes FIAGRO/LLM registrados como trilhas paralelas ✓.
- **Placeholders:** nenhum passo de código sem código; comandos com saída esperada. Os valores de connection string/URLs são segredos do usuário (preenchidos no runbook), não placeholders de lógica.
- **Consistência de tipos/nomes:** `normalize_database_url`/`connect_args_for` usados igual em database.py e env.py; `classe: str` coerente entre model, `criar()` e seed; revisão `down_revision='77ab8151e029'`.
- **Fora de escopo (proposital, YAGNI):** expor `classe` no contrato OpenAPI/ranking fica para a S3 (onde é consumido pelo scoring por classe); auth fica para a S1.
