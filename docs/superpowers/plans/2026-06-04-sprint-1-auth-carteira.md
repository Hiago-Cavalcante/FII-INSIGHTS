# Sprint 1 — Autenticação + M1 (Carteira manual) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> ⚠️ **Git:** o usuário (Hiago) exige autorização explícita antes de QUALQUER comando git. Os passos de `git commit` abaixo só rodam após o "pode commitar" dele.

**Goal:** Autenticação multiusuário de papel único (JWT no header) + cadastro manual de carteira (`posicoes`) com isolamento por dono, sem regressão no núcleo público.

**Architecture:** Auth hand-rolled (`bcrypt` + `PyJWT`) encaixada na sessão SQLAlchemy **síncrona** existente. Endpoints de auth em `/api/v1/auth`; carteira em `/api/v1/carteira`, todos protegidos por uma dependency `get_current_user` e escopados ao usuário (recurso de outro dono → 404). Preço médio ponderado calculado com `Decimal`. Frontend guarda o token no Zustand+persist e o injeta via interceptor axios; só `/carteira` é rota protegida.

**Tech Stack:** Python 3.11 · FastAPI · SQLAlchemy 2.0 (sync) · Alembic · PyJWT · bcrypt · pydantic[email] · React 18 · TanStack Query · Zustand · Vitest.

Referência de spec: [`docs/superpowers/specs/2026-06-04-sprint-1-auth-carteira-design.md`](../specs/2026-06-04-sprint-1-auth-carteira-design.md).

---

## File Structure

**Backend — criados:**
- `app/utils/security.py` — hash/verify de senha, criar/decodificar JWT, dependency `get_current_user`.
- `app/models/usuario.py` — model `Usuario`.
- `app/models/posicao.py` — model `Posicao`.
- `app/repositories/usuario_repository.py` — CRUD de usuário.
- `app/repositories/posicao_repository.py` — CRUD de posição escopado por usuário.
- `app/services/carteira_service.py` — aporte (média ponderada) + resumo.
- `app/routers/auth.py` — register/login/me (schemas inline).
- `app/routers/carteira.py` — CRUD de posições (schemas inline).
- `migrations/versions/<rev>_auth_e_posicoes.py` — migração (autogerada + revisada).
- Testes: `tests/test_security.py`, `tests/test_usuario_repository.py`, `tests/test_auth_router.py`, `tests/test_posicao_repository.py`, `tests/test_carteira_service.py`, `tests/test_carteira_router.py`.

**Backend — modificados:**
- `pyproject.toml` — deps `bcrypt`, `pyjwt`, `email-validator`.
- `app/config.py` — `auth_secret`, `algorithm`, `access_token_expire_minutes`.
- `app/models/__init__.py` — importar `Usuario`, `Posicao`.
- `app/main.py` — incluir routers `auth`, `carteira`.
- `tests/conftest.py` — fixture `client_carteira` (DB in-memory semeado + usuário + headers).
- `.env.example` — `AUTH_SECRET`.

**Frontend — criados:**
- `src/stores/authStore.ts`, `src/api/endpoints/auth.ts`, `src/api/endpoints/carteira.ts`, `src/hooks/useAuth.ts`, `src/hooks/useCarteira.ts`, `src/pages/LoginPage.tsx`, `src/pages/RegisterPage.tsx`, `src/pages/CarteiraPage.tsx`, `src/components/ProtectedRoute.tsx`, + testes `*.test.tsx`.

**Frontend — modificados:**
- `src/api/client.ts` — interceptors de request/response.
- `src/App.tsx` — rotas de login/registro/carteira.
- `src/components/layout/Header.tsx`, `src/components/layout/Navigation.tsx` — estado de auth.
- `src/types/api.ts` — regerar do OpenAPI.

---

# PARTE A — BACKEND

## Task 1: Dependências + config de auth

**Files:**
- Modify: `backend/pyproject.toml`
- Modify: `backend/app/config.py`
- Modify: `backend/.env.example` (na raiz é `.env.example`)

- [ ] **Step 1: Adicionar dependências**

Em `backend/pyproject.toml`, dentro de `dependencies`, após a linha do `psycopg`:

```toml
    "psycopg[binary]>=3.2,<4.0",
    "pyjwt>=2.10,<3.0",
    "bcrypt>=4.2,<5.0",
    "email-validator>=2.2,<3.0",
```

- [ ] **Step 2: Instalar**

Run: `cd backend && pip install -e ".[dev]"`
Expected: instala `pyjwt`, `bcrypt`, `email-validator` sem erro.

- [ ] **Step 3: Verificar imports**

Run: `cd backend && python -c "import jwt, bcrypt, email_validator; print('ok')"`
Expected: imprime `ok`.

- [ ] **Step 4: Adicionar settings de auth**

Em `backend/app/config.py`, dentro de `Settings`, após `log_level`:

```python
    log_level: str = "INFO"
    auth_secret: str = "dev-insecure-change-me"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 10080  # 7 dias
```

- [ ] **Step 5: Documentar no `.env.example`**

Em `.env.example`, na seção Backend (após `LOG_LEVEL=INFO`), substituir o placeholder comentado de auth por:

```env
# Segredo de assinatura do JWT — em produção (Render) defina um valor forte (sync:false).
AUTH_SECRET=dev-insecure-change-me
```

- [ ] **Step 6: Confirmar suíte verde (sem regressão)**

Run: `cd backend && pytest -q`
Expected: PASS (103 testes).

- [ ] **Step 7: Commit**

```bash
git add backend/pyproject.toml backend/app/config.py .env.example
git commit -m "chore(auth): deps pyjwt/bcrypt/email-validator + settings de JWT (RNF-02')"
```

---

## Task 2: Hash e verificação de senha (TDD)

**Files:**
- Test: `backend/tests/test_security.py`
- Create: `backend/app/utils/security.py`

- [ ] **Step 1: Escrever os testes que falham**

Criar `backend/tests/test_security.py`:

```python
from app.utils.security import hash_senha, verificar_senha


def test_hash_senha_nao_retorna_a_senha_em_claro():
    h = hash_senha("segredo123")
    assert h != "segredo123"
    assert isinstance(h, str)


def test_verificar_senha_correta():
    h = hash_senha("segredo123")
    assert verificar_senha("segredo123", h) is True


def test_verificar_senha_incorreta():
    h = hash_senha("segredo123")
    assert verificar_senha("outra-senha", h) is False
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd backend && pytest tests/test_security.py -v`
Expected: FAIL com `ModuleNotFoundError`/`ImportError`.

- [ ] **Step 3: Implementar hash/verify**

Criar `backend/app/utils/security.py`:

```python
from __future__ import annotations

import bcrypt


def hash_senha(senha: str) -> str:
    """Gera o hash bcrypt de uma senha em claro."""
    hashed = bcrypt.hashpw(senha.encode("utf-8"), bcrypt.gensalt())
    return hashed.decode("utf-8")


def verificar_senha(senha: str, senha_hash: str) -> bool:
    """Confere uma senha em claro contra o hash armazenado."""
    return bcrypt.checkpw(senha.encode("utf-8"), senha_hash.encode("utf-8"))
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd backend && pytest tests/test_security.py -v`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
git add backend/app/utils/security.py backend/tests/test_security.py
git commit -m "feat(auth): hash e verificação de senha com bcrypt (RNF-02')"
```

---

## Task 3: Emissão e decodificação de JWT (TDD)

**Files:**
- Test: `backend/tests/test_security.py` (append)
- Modify: `backend/app/utils/security.py`

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar ao fim de `backend/tests/test_security.py`:

```python
from datetime import timedelta

from app.utils.security import criar_access_token, decodificar_token


def test_token_round_trip_retorna_o_subject():
    token = criar_access_token("42")
    assert decodificar_token(token) == "42"


def test_token_expirado_retorna_none():
    token = criar_access_token("42", expires_delta=timedelta(seconds=-1))
    assert decodificar_token(token) is None


def test_token_adulterado_retorna_none():
    token = criar_access_token("42")
    assert decodificar_token(token + "x") is None
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd backend && pytest tests/test_security.py -k token -v`
Expected: FAIL com `ImportError`.

- [ ] **Step 3: Implementar criar/decodificar**

Em `backend/app/utils/security.py`, adicionar no topo (imports) e funções:

```python
from datetime import datetime, timedelta, timezone

import jwt

from app.config import settings
```

```python
def criar_access_token(subject: str, expires_delta: timedelta | None = None) -> str:
    """Emite um JWT assinado com o subject (id do usuário) e expiração."""
    if expires_delta is None:
        expires_delta = timedelta(minutes=settings.access_token_expire_minutes)
    expire = datetime.now(timezone.utc) + expires_delta
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, settings.auth_secret, algorithm=settings.algorithm)


def decodificar_token(token: str) -> str | None:
    """Retorna o subject do token, ou None se inválido/expirado."""
    try:
        payload = jwt.decode(
            token, settings.auth_secret, algorithms=[settings.algorithm]
        )
    except jwt.InvalidTokenError:
        return None
    sub = payload.get("sub")
    return sub if isinstance(sub, str) else None
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd backend && pytest tests/test_security.py -v`
Expected: PASS (6 passed).

- [ ] **Step 5: Commit**

```bash
git add backend/app/utils/security.py backend/tests/test_security.py
git commit -m "feat(auth): emissão e decodificação de JWT com PyJWT (RNF-02')"
```

---

## Task 4: Model `Usuario` (TDD)

**Files:**
- Test: `backend/tests/test_models.py` (append)
- Create: `backend/app/models/usuario.py`
- Modify: `backend/app/models/__init__.py`

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar ao fim de `backend/tests/test_models.py`:

```python
def test_usuario_persistido(db_session):
    from app.models.usuario import Usuario

    u = Usuario(email="a@b.com", senha_hash="hash")
    db_session.add(u)
    db_session.commit()
    db_session.refresh(u)
    assert u.id is not None
    assert u.email == "a@b.com"
    assert u.posicoes == []
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd backend && pytest tests/test_models.py -k usuario -v`
Expected: FAIL com `ModuleNotFoundError` (e/ou `posicoes` inexistente).

- [ ] **Step 3: Criar o model**

Criar `backend/app/models/usuario.py`:

```python
from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.posicao import Posicao


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    senha_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    posicoes: Mapped[list[Posicao]] = relationship(
        back_populates="usuario", cascade="all, delete-orphan"
    )
```

- [ ] **Step 4: Registrar no `__init__.py`**

Em `backend/app/models/__init__.py`, adicionar os imports de `Usuario` e `Posicao` (esta criada na Task 5) ao bloco de imports e ao `__all__`. Por ora adicionar só `Usuario`:

```python
from app.models.usuario import Usuario
```
(e incluir `"Usuario"` no `__all__` se existir).

> ⚠️ O model `Usuario` referencia `Posicao` em `relationship`. O teste desta task **só passa após a Task 5** existir (o mapper resolve `Posicao` no `configure_mappers`). Para manter RED→GREEN limpo nesta task, comente temporariamente o `relationship posicoes` e o import TYPE_CHECKING, rode o teste sem `assert u.posicoes == []`, e reative na Task 5. **Alternativa recomendada:** executar Task 4 e Task 5 juntas (criar os dois models antes de rodar os testes de ambos).

- [ ] **Step 5: Rodar e confirmar que passa** (após Task 5, ou na versão sem relationship)

Run: `cd backend && pytest tests/test_models.py -k usuario -v`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/app/models/usuario.py backend/app/models/__init__.py backend/tests/test_models.py
git commit -m "feat(auth): model Usuario com ownership de posições (RNF-02')"
```

---

## Task 5: Model `Posicao` (TDD)

**Files:**
- Test: `backend/tests/test_models.py` (append)
- Create: `backend/app/models/posicao.py`
- Modify: `backend/app/models/__init__.py`

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar ao fim de `backend/tests/test_models.py`:

```python
def test_posicao_persistida(db_session):
    from decimal import Decimal

    from app.models.fundo import Fundo
    from app.models.posicao import Posicao
    from app.models.usuario import Usuario

    u = Usuario(email="dono@b.com", senha_hash="h")
    f = Fundo(ticker="HGLG11")
    db_session.add_all([u, f])
    db_session.commit()

    p = Posicao(
        usuario_id=u.id, fundo_id=f.id,
        quantidade=10, preco_medio=Decimal("100.00"),
        valor_investido=Decimal("1000.00"),
    )
    db_session.add(p)
    db_session.commit()
    db_session.refresh(p)

    assert p.id is not None
    assert p.usuario.email == "dono@b.com"
    assert p.fundo.ticker == "HGLG11"
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd backend && pytest tests/test_models.py -k posicao -v`
Expected: FAIL com `ModuleNotFoundError`.

- [ ] **Step 3: Criar o model**

Criar `backend/app/models/posicao.py`:

```python
from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.fundo import Fundo
    from app.models.usuario import Usuario


class Posicao(Base):
    __tablename__ = "posicoes"
    __table_args__ = (UniqueConstraint("usuario_id", "fundo_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    usuario_id: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id"), nullable=False, index=True
    )
    fundo_id: Mapped[int] = mapped_column(ForeignKey("fundos.id"), nullable=False)
    quantidade: Mapped[int] = mapped_column(Integer, nullable=False)
    preco_medio: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    valor_investido: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    usuario: Mapped[Usuario] = relationship(back_populates="posicoes")
    fundo: Mapped[Fundo] = relationship()
```

- [ ] **Step 4: Registrar no `__init__.py`**

Em `backend/app/models/__init__.py`, adicionar:

```python
from app.models.posicao import Posicao
```
(e `"Posicao"` no `__all__` se existir). Reativar o `relationship posicoes` em `usuario.py` se foi comentado na Task 4.

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `cd backend && pytest tests/test_models.py -k "posicao or usuario" -v`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/app/models/posicao.py backend/app/models/__init__.py backend/app/models/usuario.py backend/tests/test_models.py
git commit -m "feat(carteira): model Posicao com ownership e unique (usuario, fundo) (RF-01)"
```

---

## Task 6: Migração Alembic (`usuarios` + `posicoes`)

**Files:**
- Create: `backend/migrations/versions/<rev>_auth_e_posicoes.py` (autogerado)

- [ ] **Step 1: Autogerar a migração**

Run: `cd backend && alembic revision --autogenerate -m "auth e posicoes"`
Expected: cria arquivo em `migrations/versions/` com `down_revision = 'b3a3c4fa69ba'`.

- [ ] **Step 2: Revisar o arquivo gerado**

O `upgrade()` deve conter **apenas** a criação das duas tabelas (remover ruído de dialeto):

```python
def upgrade() -> None:
    op.create_table(
        "usuarios",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("senha_hash", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_usuarios_email"), "usuarios", ["email"], unique=True)
    op.create_table(
        "posicoes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("usuario_id", sa.Integer(), nullable=False),
        sa.Column("fundo_id", sa.Integer(), nullable=False),
        sa.Column("quantidade", sa.Integer(), nullable=False),
        sa.Column("preco_medio", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("valor_investido", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["fundo_id"], ["fundos.id"]),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("usuario_id", "fundo_id"),
    )
    op.create_index(op.f("ix_posicoes_usuario_id"), "posicoes", ["usuario_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_posicoes_usuario_id"), table_name="posicoes")
    op.drop_table("posicoes")
    op.drop_index(op.f("ix_usuarios_email"), table_name="usuarios")
    op.drop_table("usuarios")
```

- [ ] **Step 3: Aplicar e testar reversibilidade (SQLite local)**

Run: `cd backend && alembic upgrade head && alembic downgrade -1 && alembic upgrade head`
Expected: cria, remove e recria as tabelas sem erro.

- [ ] **Step 4: Suíte verde**

Run: `cd backend && pytest -q`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/migrations/versions/
git commit -m "feat(auth): migração de usuarios e posicoes (RNF-02', RF-01)"
```

---

## Task 7: `UsuarioRepository` (TDD)

**Files:**
- Test: `backend/tests/test_usuario_repository.py`
- Create: `backend/app/repositories/usuario_repository.py`

- [ ] **Step 1: Escrever os testes que falham**

Criar `backend/tests/test_usuario_repository.py`:

```python
from app.repositories.usuario_repository import UsuarioRepository


def test_criar_e_buscar_por_email(db_session):
    repo = UsuarioRepository(db_session)
    repo.criar(email="a@b.com", senha_hash="h")

    u = repo.buscar_por_email("a@b.com")
    assert u is not None
    assert u.email == "a@b.com"


def test_buscar_por_email_inexistente(db_session):
    repo = UsuarioRepository(db_session)
    assert repo.buscar_por_email("nao@existe.com") is None


def test_buscar_por_id(db_session):
    repo = UsuarioRepository(db_session)
    criado = repo.criar(email="c@d.com", senha_hash="h")

    u = repo.buscar_por_id(criado.id)
    assert u is not None
    assert u.email == "c@d.com"
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd backend && pytest tests/test_usuario_repository.py -v`
Expected: FAIL com `ImportError`.

- [ ] **Step 3: Implementar o repositório**

Criar `backend/app/repositories/usuario_repository.py`:

```python
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.usuario import Usuario


class UsuarioRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def criar(self, email: str, senha_hash: str) -> Usuario:
        usuario = Usuario(email=email, senha_hash=senha_hash)
        self.db.add(usuario)
        self.db.commit()
        self.db.refresh(usuario)
        return usuario

    def buscar_por_email(self, email: str) -> Usuario | None:
        return self.db.scalar(select(Usuario).where(Usuario.email == email))

    def buscar_por_id(self, id: int) -> Usuario | None:
        return self.db.get(Usuario, id)
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd backend && pytest tests/test_usuario_repository.py -v`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
git add backend/app/repositories/usuario_repository.py backend/tests/test_usuario_repository.py
git commit -m "feat(auth): UsuarioRepository (criar/buscar) (RNF-02')"
```

---

## Task 8: Dependency `get_current_user` (TDD)

**Files:**
- Test: `backend/tests/test_security.py` (append)
- Modify: `backend/app/utils/security.py`

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar ao fim de `backend/tests/test_security.py`:

```python
import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app.repositories.usuario_repository import UsuarioRepository
from app.utils.security import get_current_user


def test_get_current_user_com_token_valido(db_session):
    repo = UsuarioRepository(db_session)
    u = repo.criar(email="x@y.com", senha_hash="h")
    token = criar_access_token(str(u.id))
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

    atual = get_current_user(creds=creds, db=db_session)
    assert atual.id == u.id


def test_get_current_user_sem_credenciais_401(db_session):
    with pytest.raises(HTTPException) as exc:
        get_current_user(creds=None, db=db_session)
    assert exc.value.status_code == 401


def test_get_current_user_token_invalido_401(db_session):
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials="lixo")
    with pytest.raises(HTTPException) as exc:
        get_current_user(creds=creds, db=db_session)
    assert exc.value.status_code == 401
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd backend && pytest tests/test_security.py -k current_user -v`
Expected: FAIL com `ImportError`.

- [ ] **Step 3: Implementar a dependency**

Em `backend/app/utils/security.py`, adicionar imports e a dependency:

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.usuario import Usuario
from app.repositories.usuario_repository import UsuarioRepository

_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> Usuario:
    """Valida o Bearer token e retorna o usuário autenticado (401 caso contrário)."""
    nao_autorizado = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não autenticado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if creds is None:
        raise nao_autorizado
    sub = decodificar_token(creds.credentials)
    if sub is None:
        raise nao_autorizado
    usuario = UsuarioRepository(db).buscar_por_id(int(sub))
    if usuario is None:
        raise nao_autorizado
    return usuario
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd backend && pytest tests/test_security.py -v`
Expected: PASS (9 passed).

- [ ] **Step 5: Commit**

```bash
git add backend/app/utils/security.py backend/tests/test_security.py
git commit -m "feat(auth): dependency get_current_user via Bearer JWT (RNF-02')"
```

---

## Task 9: Router de auth — register/login/me (TDD)

**Files:**
- Test: `backend/tests/test_auth_router.py`
- Create: `backend/app/routers/auth.py`
- Modify: `backend/app/main.py`
- Modify: `backend/tests/conftest.py`

- [ ] **Step 1: Adicionar fixture de cliente com DB in-memory à `conftest.py`**

Em `backend/tests/conftest.py`, acrescentar (usa `StaticPool` para compartilhar o banco entre conexões):

```python
@pytest.fixture
def client_db() -> Generator[TestClient, None, None]:
    """TestClient com DB in-memory vazio e get_db sobrescrito (sem seed)."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    SessionTest = sessionmaker(bind=engine)

    def _override() -> Generator[Session, None, None]:
        db = SessionTest()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = _override
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()
        Base.metadata.drop_all(engine)
```

- [ ] **Step 2: Escrever os testes que falham**

Criar `backend/tests/test_auth_router.py`:

```python
def test_register_retorna_token(client_db):
    r = client_db.post("/api/v1/auth/register", json={"email": "a@b.com", "senha": "segredo123"})
    assert r.status_code == 201
    assert "access_token" in r.json()


def test_register_email_duplicado_409(client_db):
    client_db.post("/api/v1/auth/register", json={"email": "a@b.com", "senha": "segredo123"})
    r = client_db.post("/api/v1/auth/register", json={"email": "a@b.com", "senha": "outra123"})
    assert r.status_code == 409


def test_login_ok_retorna_token(client_db):
    client_db.post("/api/v1/auth/register", json={"email": "a@b.com", "senha": "segredo123"})
    r = client_db.post("/api/v1/auth/login", json={"email": "a@b.com", "senha": "segredo123"})
    assert r.status_code == 200
    assert r.json()["token_type"] == "bearer"


def test_login_senha_errada_401(client_db):
    client_db.post("/api/v1/auth/register", json={"email": "a@b.com", "senha": "segredo123"})
    r = client_db.post("/api/v1/auth/login", json={"email": "a@b.com", "senha": "errada"})
    assert r.status_code == 401


def test_login_email_desconhecido_401(client_db):
    r = client_db.post("/api/v1/auth/login", json={"email": "x@y.com", "senha": "segredo123"})
    assert r.status_code == 401


def test_me_com_token(client_db):
    reg = client_db.post("/api/v1/auth/register", json={"email": "a@b.com", "senha": "segredo123"})
    token = reg.json()["access_token"]
    r = client_db.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["email"] == "a@b.com"


def test_me_sem_token_401(client_db):
    r = client_db.get("/api/v1/auth/me")
    assert r.status_code == 401
```

- [ ] **Step 3: Rodar e confirmar que falha**

Run: `cd backend && pytest tests/test_auth_router.py -v`
Expected: FAIL (404 nas rotas — router ainda não existe).

- [ ] **Step 4: Implementar o router**

Criar `backend/app/routers/auth.py`:

```python
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.usuario import Usuario
from app.repositories.usuario_repository import UsuarioRepository
from app.utils.security import (
    criar_access_token,
    get_current_user,
    hash_senha,
    verificar_senha,
)

router = APIRouter(prefix="/auth", tags=["auth"])


class RegistroIn(BaseModel):
    email: EmailStr
    senha: str = Field(min_length=8, max_length=72)


class LoginIn(BaseModel):
    email: EmailStr
    senha: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UsuarioOut(BaseModel):
    id: int
    email: str

    model_config = {"from_attributes": True}


@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def register(body: RegistroIn, db: Session = Depends(get_db)) -> TokenOut:
    """Cria um usuário e já retorna o token (auto-login)."""
    repo = UsuarioRepository(db)
    if repo.buscar_por_email(body.email) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="E-mail já cadastrado")
    usuario = repo.criar(email=body.email, senha_hash=hash_senha(body.senha))
    return TokenOut(access_token=criar_access_token(str(usuario.id)))


@router.post("/login", response_model=TokenOut)
def login(body: LoginIn, db: Session = Depends(get_db)) -> TokenOut:
    """Autentica por e-mail e senha; mensagem genérica em falha."""
    usuario = UsuarioRepository(db).buscar_por_email(body.email)
    if usuario is None or not verificar_senha(body.senha, usuario.senha_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais inválidas")
    return TokenOut(access_token=criar_access_token(str(usuario.id)))


@router.get("/me", response_model=UsuarioOut)
def me(usuario: Usuario = Depends(get_current_user)) -> UsuarioOut:
    """Retorna o usuário autenticado."""
    return UsuarioOut.model_validate(usuario)
```

- [ ] **Step 5: Registrar o router no `main.py`**

Em `backend/app/main.py`, importar e incluir:

```python
from app.routers import auth, clustering, dashboard, fundos, perfil, ranking, scoring
```
```python
app.include_router(auth.router, prefix="/api/v1")
```

- [ ] **Step 6: Rodar e confirmar que passa**

Run: `cd backend && pytest tests/test_auth_router.py -v`
Expected: PASS (7 passed).

- [ ] **Step 7: Commit**

```bash
git add backend/app/routers/auth.py backend/app/main.py backend/tests/test_auth_router.py backend/tests/conftest.py
git commit -m "feat(auth): endpoints register/login/me com JWT (RNF-02')"
```

---

## Task 10: `PosicaoRepository` (TDD)

**Files:**
- Test: `backend/tests/test_posicao_repository.py`
- Create: `backend/app/repositories/posicao_repository.py`

- [ ] **Step 1: Escrever os testes que falham**

Criar `backend/tests/test_posicao_repository.py`:

```python
from decimal import Decimal

from app.models.fundo import Fundo
from app.models.usuario import Usuario
from app.repositories.posicao_repository import PosicaoRepository


def _usuario_e_fundo(db, email="a@b.com", ticker="HGLG11"):
    u = Usuario(email=email, senha_hash="h")
    f = Fundo(ticker=ticker)
    db.add_all([u, f])
    db.commit()
    return u, f


def test_criar_e_listar_por_usuario(db_session):
    u, f = _usuario_e_fundo(db_session)
    repo = PosicaoRepository(db_session)
    repo.criar(usuario_id=u.id, fundo_id=f.id, quantidade=10,
               preco_medio=Decimal("100.00"), valor_investido=Decimal("1000.00"))

    lista = repo.listar_por_usuario(u.id)
    assert len(lista) == 1
    assert lista[0].quantidade == 10


def test_buscar_filtra_por_usuario(db_session):
    u, f = _usuario_e_fundo(db_session)
    outro = Usuario(email="outro@b.com", senha_hash="h")
    db_session.add(outro)
    db_session.commit()
    repo = PosicaoRepository(db_session)
    p = repo.criar(usuario_id=u.id, fundo_id=f.id, quantidade=1,
                   preco_medio=Decimal("10.00"), valor_investido=Decimal("10.00"))

    assert repo.buscar(p.id, u.id) is not None
    assert repo.buscar(p.id, outro.id) is None


def test_buscar_por_usuario_e_fundo(db_session):
    u, f = _usuario_e_fundo(db_session)
    repo = PosicaoRepository(db_session)
    repo.criar(usuario_id=u.id, fundo_id=f.id, quantidade=1,
               preco_medio=Decimal("10.00"), valor_investido=Decimal("10.00"))

    assert repo.buscar_por_usuario_e_fundo(u.id, f.id) is not None
    assert repo.buscar_por_usuario_e_fundo(u.id, 9999) is None
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd backend && pytest tests/test_posicao_repository.py -v`
Expected: FAIL com `ImportError`.

- [ ] **Step 3: Implementar o repositório**

Criar `backend/app/repositories/posicao_repository.py`:

```python
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.posicao import Posicao


class PosicaoRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def criar(
        self,
        usuario_id: int,
        fundo_id: int,
        quantidade: int,
        preco_medio: Decimal,
        valor_investido: Decimal,
    ) -> Posicao:
        posicao = Posicao(
            usuario_id=usuario_id,
            fundo_id=fundo_id,
            quantidade=quantidade,
            preco_medio=preco_medio,
            valor_investido=valor_investido,
        )
        self.db.add(posicao)
        self.db.commit()
        self.db.refresh(posicao)
        return posicao

    def listar_por_usuario(self, usuario_id: int) -> list[Posicao]:
        stmt = (
            select(Posicao)
            .where(Posicao.usuario_id == usuario_id)
            .order_by(Posicao.id)
        )
        return list(self.db.scalars(stmt))

    def buscar(self, id: int, usuario_id: int) -> Posicao | None:
        stmt = select(Posicao).where(
            Posicao.id == id, Posicao.usuario_id == usuario_id
        )
        return self.db.scalar(stmt)

    def buscar_por_usuario_e_fundo(
        self, usuario_id: int, fundo_id: int
    ) -> Posicao | None:
        stmt = select(Posicao).where(
            Posicao.usuario_id == usuario_id, Posicao.fundo_id == fundo_id
        )
        return self.db.scalar(stmt)

    def salvar(self, posicao: Posicao) -> Posicao:
        self.db.commit()
        self.db.refresh(posicao)
        return posicao

    def remover(self, posicao: Posicao) -> None:
        self.db.delete(posicao)
        self.db.commit()
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd backend && pytest tests/test_posicao_repository.py -v`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
git add backend/app/repositories/posicao_repository.py backend/tests/test_posicao_repository.py
git commit -m "feat(carteira): PosicaoRepository escopado por usuário (RF-01, RNF-02')"
```

---

## Task 11: `carteira_service` — aporte com média ponderada (TDD)

**Files:**
- Test: `backend/tests/test_carteira_service.py`
- Create: `backend/app/services/carteira_service.py`

- [ ] **Step 1: Escrever os testes que falham**

Criar `backend/tests/test_carteira_service.py`:

```python
from decimal import Decimal

import pytest

from app.models.fundo import Fundo
from app.models.usuario import Usuario
from app.services.carteira_service import TickerNaoEncontrado, registrar_aporte


def _usuario_e_fundos(db):
    u = Usuario(email="a@b.com", senha_hash="h")
    fii = Fundo(ticker="HGLG11", classe="FII")
    fiagro = Fundo(ticker="SPAF11", classe="FIAGRO")
    db.add_all([u, fii, fiagro])
    db.commit()
    return u


def test_primeiro_aporte_cria_posicao(db_session):
    u = _usuario_e_fundos(db_session)
    p = registrar_aporte(db_session, u.id, "HGLG11", 10, Decimal("100.00"))
    assert p.quantidade == 10
    assert p.preco_medio == Decimal("100.00")
    assert p.valor_investido == Decimal("1000.00")


def test_segundo_aporte_recalcula_media_ponderada(db_session):
    u = _usuario_e_fundos(db_session)
    registrar_aporte(db_session, u.id, "HGLG11", 10, Decimal("100.00"))
    p = registrar_aporte(db_session, u.id, "HGLG11", 10, Decimal("120.00"))
    assert p.quantidade == 20
    assert p.preco_medio == Decimal("110.00")
    assert p.valor_investido == Decimal("2200.00")


def test_media_ponderada_quantidades_diferentes(db_session):
    u = _usuario_e_fundos(db_session)
    registrar_aporte(db_session, u.id, "HGLG11", 10, Decimal("100.00"))
    p = registrar_aporte(db_session, u.id, "HGLG11", 5, Decimal("130.00"))
    assert p.quantidade == 15
    assert p.preco_medio == Decimal("110.00")


def test_ticker_fora_do_catalogo(db_session):
    u = _usuario_e_fundos(db_session)
    with pytest.raises(TickerNaoEncontrado):
        registrar_aporte(db_session, u.id, "ZZZZ99", 1, Decimal("1.00"))
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd backend && pytest tests/test_carteira_service.py -v`
Expected: FAIL com `ImportError`.

- [ ] **Step 3: Implementar o serviço**

Criar `backend/app/services/carteira_service.py`:

```python
from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy.orm import Session

from app.models.posicao import Posicao
from app.repositories.fundo_repository import FundoRepository
from app.repositories.posicao_repository import PosicaoRepository

_CENTAVO = Decimal("0.01")


class TickerNaoEncontrado(Exception):
    """Ticker informado não existe no catálogo de fundos."""


def _arredondar(valor: Decimal) -> Decimal:
    return valor.quantize(_CENTAVO, rounding=ROUND_HALF_UP)


def registrar_aporte(
    db: Session, usuario_id: int, ticker: str, quantidade: int, preco: Decimal
) -> Posicao:
    """Registra um aporte: cria a posição ou recalcula o preço médio ponderado."""
    fundo = FundoRepository(db).buscar_por_ticker(ticker)
    if fundo is None:
        raise TickerNaoEncontrado(ticker)

    repo = PosicaoRepository(db)
    posicao = repo.buscar_por_usuario_e_fundo(usuario_id, fundo.id)
    aporte_valor = _arredondar(Decimal(quantidade) * preco)

    if posicao is None:
        return repo.criar(
            usuario_id=usuario_id,
            fundo_id=fundo.id,
            quantidade=quantidade,
            preco_medio=_arredondar(preco),
            valor_investido=aporte_valor,
        )

    nova_qtd = posicao.quantidade + quantidade
    novo_valor = _arredondar(posicao.valor_investido + aporte_valor)
    posicao.quantidade = nova_qtd
    posicao.valor_investido = novo_valor
    posicao.preco_medio = _arredondar(novo_valor / Decimal(nova_qtd))
    return repo.salvar(posicao)
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd backend && pytest tests/test_carteira_service.py -v`
Expected: PASS (4 passed).

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/carteira_service.py backend/tests/test_carteira_service.py
git commit -m "feat(carteira): aporte com preço médio ponderado (RF-05)"
```

---

## Task 12: `carteira_service` — resumo consolidado (TDD)

**Files:**
- Test: `backend/tests/test_carteira_service.py` (append)
- Modify: `backend/app/services/carteira_service.py`

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar ao fim de `backend/tests/test_carteira_service.py`:

```python
from app.services.carteira_service import resumo_carteira


def test_resumo_total_e_por_classe(db_session):
    u = _usuario_e_fundos(db_session)
    registrar_aporte(db_session, u.id, "HGLG11", 10, Decimal("100.00"))   # FII 1000
    registrar_aporte(db_session, u.id, "SPAF11", 5, Decimal("200.00"))    # FIAGRO 1000
    r = resumo_carteira(db_session, u.id)
    assert r["total_investido"] == Decimal("2000.00")
    assert r["por_classe"]["FII"] == Decimal("1000.00")
    assert r["por_classe"]["FIAGRO"] == Decimal("1000.00")
    assert r["num_posicoes"] == 2


def test_resumo_carteira_vazia(db_session):
    u = _usuario_e_fundos(db_session)
    r = resumo_carteira(db_session, u.id)
    assert r["total_investido"] == Decimal("0.00")
    assert r["num_posicoes"] == 0
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd backend && pytest tests/test_carteira_service.py -k resumo -v`
Expected: FAIL com `ImportError`.

- [ ] **Step 3: Implementar `resumo_carteira`**

Em `backend/app/services/carteira_service.py`, adicionar ao fim:

```python
def resumo_carteira(db: Session, usuario_id: int) -> dict:
    """Posição consolidada: total investido + quebra por classe (RF-04/08)."""
    posicoes = PosicaoRepository(db).listar_por_usuario(usuario_id)
    por_classe: dict[str, Decimal] = {"FII": Decimal("0.00"), "FIAGRO": Decimal("0.00")}
    total = Decimal("0.00")
    for p in posicoes:
        total += p.valor_investido
        classe = p.fundo.classe if p.fundo.classe in por_classe else "FII"
        por_classe[classe] += p.valor_investido
    return {
        "total_investido": total,
        "por_classe": por_classe,
        "num_posicoes": len(posicoes),
    }
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd backend && pytest tests/test_carteira_service.py -v`
Expected: PASS (6 passed).

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/carteira_service.py backend/tests/test_carteira_service.py
git commit -m "feat(carteira): resumo consolidado por classe (RF-04, RF-08)"
```

---

## Task 13: Router de carteira + isolamento (TDD)

**Files:**
- Test: `backend/tests/test_carteira_router.py`
- Create: `backend/app/routers/carteira.py`
- Modify: `backend/app/main.py`
- Modify: `backend/tests/conftest.py`

- [ ] **Step 1: Adicionar fixture `client_carteira` à `conftest.py`**

Em `backend/tests/conftest.py`, acrescentar (DB com fundos semeados + helper que registra usuário e devolve headers):

```python
@pytest.fixture
def client_carteira() -> Generator[tuple[TestClient, object], None, None]:
    """TestClient com fundos semeados + factory de usuário autenticado.

    Uso: client, novo_usuario = client_carteira; headers = novo_usuario("a@b.com").
    """
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    SessionTest = sessionmaker(bind=engine)
    with SessionTest() as db:
        db.add_all([
            Fundo(ticker="HGLG11", nome="CSHG Log", classe="FII"),
            Fundo(ticker="SPAF11", nome="Sparta Fiagro", classe="FIAGRO"),
        ])
        db.commit()

    def _override() -> Generator[Session, None, None]:
        db = SessionTest()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = _override
    client = TestClient(app)

    def novo_usuario(email: str = "a@b.com") -> dict[str, str]:
        r = client.post("/api/v1/auth/register", json={"email": email, "senha": "segredo123"})
        return {"Authorization": f"Bearer {r.json()['access_token']}"}

    try:
        yield client, novo_usuario
    finally:
        app.dependency_overrides.clear()
        Base.metadata.drop_all(engine)
```

- [ ] **Step 2: Escrever os testes que falham**

Criar `backend/tests/test_carteira_router.py`:

```python
def test_criar_posicao(client_carteira):
    client, novo_usuario = client_carteira
    h = novo_usuario()
    r = client.post("/api/v1/carteira/posicoes",
                    json={"ticker": "HGLG11", "quantidade": 10, "preco": "100.00"}, headers=h)
    assert r.status_code == 201
    body = r.json()
    assert body["ticker"] == "HGLG11"
    assert body["quantidade"] == 10


def test_aporte_recalcula_media(client_carteira):
    client, novo_usuario = client_carteira
    h = novo_usuario()
    client.post("/api/v1/carteira/posicoes",
                json={"ticker": "HGLG11", "quantidade": 10, "preco": "100.00"}, headers=h)
    r = client.post("/api/v1/carteira/posicoes",
                    json={"ticker": "HGLG11", "quantidade": 10, "preco": "120.00"}, headers=h)
    assert r.json()["preco_medio"] == "110.00"


def test_listar_escopado_ao_usuario(client_carteira):
    client, novo_usuario = client_carteira
    ha = novo_usuario("a@b.com")
    hb = novo_usuario("b@b.com")
    client.post("/api/v1/carteira/posicoes",
                json={"ticker": "HGLG11", "quantidade": 1, "preco": "10.00"}, headers=ha)
    r = client.get("/api/v1/carteira/posicoes", headers=hb)
    assert r.json() == []


def test_resumo_por_classe(client_carteira):
    client, novo_usuario = client_carteira
    h = novo_usuario()
    client.post("/api/v1/carteira/posicoes",
                json={"ticker": "HGLG11", "quantidade": 10, "preco": "100.00"}, headers=h)
    client.post("/api/v1/carteira/posicoes",
                json={"ticker": "SPAF11", "quantidade": 5, "preco": "200.00"}, headers=h)
    r = client.get("/api/v1/carteira/resumo", headers=h)
    body = r.json()
    assert body["total_investido"] == "2000.00"
    assert body["por_classe"]["FIAGRO"] == "1000.00"


def test_editar_posicao(client_carteira):
    client, novo_usuario = client_carteira
    h = novo_usuario()
    pid = client.post("/api/v1/carteira/posicoes",
                      json={"ticker": "HGLG11", "quantidade": 10, "preco": "100.00"}, headers=h).json()["id"]
    r = client.put(f"/api/v1/carteira/posicoes/{pid}",
                   json={"quantidade": 20, "preco_medio": "90.00"}, headers=h)
    assert r.status_code == 200
    assert r.json()["valor_investido"] == "1800.00"


def test_remover_posicao(client_carteira):
    client, novo_usuario = client_carteira
    h = novo_usuario()
    pid = client.post("/api/v1/carteira/posicoes",
                      json={"ticker": "HGLG11", "quantidade": 10, "preco": "100.00"}, headers=h).json()["id"]
    assert client.delete(f"/api/v1/carteira/posicoes/{pid}", headers=h).status_code == 204
    assert client.get("/api/v1/carteira/posicoes", headers=h).json() == []


def test_isolamento_nao_edita_posicao_de_outro(client_carteira):
    client, novo_usuario = client_carteira
    ha = novo_usuario("a@b.com")
    hb = novo_usuario("b@b.com")
    pid = client.post("/api/v1/carteira/posicoes",
                      json={"ticker": "HGLG11", "quantidade": 1, "preco": "10.00"}, headers=ha).json()["id"]
    r = client.put(f"/api/v1/carteira/posicoes/{pid}",
                   json={"quantidade": 99, "preco_medio": "1.00"}, headers=hb)
    assert r.status_code == 404


def test_ticker_fora_do_catalogo_404(client_carteira):
    client, novo_usuario = client_carteira
    h = novo_usuario()
    r = client.post("/api/v1/carteira/posicoes",
                    json={"ticker": "ZZZZ99", "quantidade": 1, "preco": "1.00"}, headers=h)
    assert r.status_code == 404


def test_sem_token_401(client_carteira):
    client, _ = client_carteira
    assert client.get("/api/v1/carteira/posicoes").status_code == 401
```

- [ ] **Step 3: Rodar e confirmar que falha**

Run: `cd backend && pytest tests/test_carteira_router.py -v`
Expected: FAIL (404 — router inexistente).

- [ ] **Step 4: Implementar o router**

Criar `backend/app/routers/carteira.py`:

```python
from __future__ import annotations

from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.posicao import Posicao
from app.models.usuario import Usuario
from app.repositories.posicao_repository import PosicaoRepository
from app.services.carteira_service import (
    TickerNaoEncontrado,
    registrar_aporte,
    resumo_carteira,
)
from app.utils.security import get_current_user

router = APIRouter(prefix="/carteira", tags=["carteira"])


class AporteIn(BaseModel):
    ticker: str
    quantidade: int = Field(gt=0)
    preco: Decimal = Field(gt=0)


class PosicaoUpdate(BaseModel):
    quantidade: int = Field(gt=0)
    preco_medio: Decimal = Field(gt=0)


class PosicaoOut(BaseModel):
    id: int
    ticker: str
    nome: str | None
    classe: str
    quantidade: int
    preco_medio: Decimal
    valor_investido: Decimal


class ResumoOut(BaseModel):
    total_investido: Decimal
    por_classe: dict[str, Decimal]
    num_posicoes: int


def _to_out(p: Posicao) -> PosicaoOut:
    return PosicaoOut(
        id=p.id, ticker=p.fundo.ticker, nome=p.fundo.nome, classe=p.fundo.classe,
        quantidade=p.quantidade, preco_medio=p.preco_medio, valor_investido=p.valor_investido,
    )


@router.post("/posicoes", response_model=PosicaoOut, status_code=status.HTTP_201_CREATED)
def criar_posicao(
    body: AporteIn,
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PosicaoOut:
    """Registra um aporte (cria ou recalcula a média) no fundo informado."""
    try:
        posicao = registrar_aporte(db, usuario.id, body.ticker, body.quantidade, body.preco)
    except TickerNaoEncontrado:
        raise HTTPException(status_code=404, detail="Ticker não encontrado no catálogo")
    return _to_out(posicao)


@router.get("/posicoes", response_model=list[PosicaoOut])
def listar_posicoes(
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[PosicaoOut]:
    """Lista as posições do usuário autenticado."""
    return [_to_out(p) for p in PosicaoRepository(db).listar_por_usuario(usuario.id)]


@router.get("/resumo", response_model=ResumoOut)
def resumo(
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ResumoOut:
    """Posição consolidada do usuário (total + por classe)."""
    return ResumoOut(**resumo_carteira(db, usuario.id))


@router.put("/posicoes/{posicao_id}", response_model=PosicaoOut)
def editar_posicao(
    posicao_id: int,
    body: PosicaoUpdate,
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PosicaoOut:
    """Corrige quantidade e preço médio de uma posição do usuário."""
    repo = PosicaoRepository(db)
    posicao = repo.buscar(posicao_id, usuario.id)
    if posicao is None:
        raise HTTPException(status_code=404, detail="Posição não encontrada")
    posicao.quantidade = body.quantidade
    posicao.preco_medio = body.preco_medio
    posicao.valor_investido = (body.preco_medio * Decimal(body.quantidade)).quantize(Decimal("0.01"))
    return _to_out(repo.salvar(posicao))


@router.delete("/posicoes/{posicao_id}", status_code=status.HTTP_204_NO_CONTENT)
def remover_posicao(
    posicao_id: int,
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """Remove uma posição do usuário."""
    repo = PosicaoRepository(db)
    posicao = repo.buscar(posicao_id, usuario.id)
    if posicao is None:
        raise HTTPException(status_code=404, detail="Posição não encontrada")
    repo.remover(posicao)
```

- [ ] **Step 5: Registrar o router no `main.py`**

Em `backend/app/main.py`, incluir `carteira` no import dos routers e adicionar:

```python
app.include_router(carteira.router, prefix="/api/v1")
```

- [ ] **Step 6: Rodar e confirmar que passa**

Run: `cd backend && pytest tests/test_carteira_router.py -v`
Expected: PASS (9 passed).

- [ ] **Step 7: Commit**

```bash
git add backend/app/routers/carteira.py backend/app/main.py backend/tests/test_carteira_router.py backend/tests/conftest.py
git commit -m "feat(carteira): endpoints CRUD com isolamento por dono (RF-01/04/05, RNF-02')"
```

---

## Task 14: Gate de qualidade do backend

**Files:** nenhum (verificação)

- [ ] **Step 1: Suíte completa**

Run: `cd backend && pytest -q`
Expected: PASS (todos — núcleo + ~28 novos).

- [ ] **Step 2: Lint + tipos**

Run: `cd backend && ruff check . --fix && black . && mypy app/`
Expected: ruff `All checks passed!`; mypy sem erros novos em `app/`.

- [ ] **Step 3: Smoke do fluxo de auth + carteira**

Run (terminal): `cd backend && uvicorn app.main:app --port 8000`
Em outro terminal:
```bash
TOKEN=$(curl -s -X POST localhost:8000/api/v1/auth/register -H 'Content-Type: application/json' -d '{"email":"smoke@x.com","senha":"segredo123"}' | python -c "import sys,json;print(json.load(sys.stdin)['access_token'])")
curl -s -X POST localhost:8000/api/v1/carteira/posicoes -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"ticker":"HGLG11","quantidade":10,"preco":"100.00"}'
curl -s localhost:8000/api/v1/carteira/resumo -H "Authorization: Bearer $TOKEN"
```
Expected: cria posição e retorna resumo com `total_investido` `"1000.00"`. (Requer fundos no banco local — rodar `python -m scripts.seed_fundos` antes se necessário.)

- [ ] **Step 4: Commit (se houve ajustes de lint/format)**

```bash
git add -A backend/
git commit -m "chore(backend): lint/format/types após S1 auth+carteira"
```

---

# PARTE B — FRONTEND

> Padrões a seguir: hooks com TanStack Query (ver `useRanking.ts`); testes com Vitest + Testing Library mockando o módulo de endpoints (ver `useRanking.test.tsx`); mobile-first (estilizar do menor breakpoint para cima). Validar fluxo no viewport mobile (~375px) antes de declarar pronto.

## Task 15: `authStore` (TDD)

**Files:**
- Test: `frontend/src/stores/authStore.test.ts`
- Create: `frontend/src/stores/authStore.ts`

- [ ] **Step 1: Escrever o teste que falha**

Criar `frontend/src/stores/authStore.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "./authStore";

beforeEach(() => useAuthStore.getState().logout());

describe("authStore", () => {
  it("começa deslogado", () => {
    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().isAuthenticated()).toBe(false);
  });

  it("setAuth guarda token e usuário", () => {
    useAuthStore.getState().setAuth("tok123", { id: 1, email: "a@b.com" });
    expect(useAuthStore.getState().token).toBe("tok123");
    expect(useAuthStore.getState().isAuthenticated()).toBe(true);
    expect(useAuthStore.getState().user?.email).toBe("a@b.com");
  });

  it("logout limpa o estado", () => {
    useAuthStore.getState().setAuth("tok123", { id: 1, email: "a@b.com" });
    useAuthStore.getState().logout();
    expect(useAuthStore.getState().token).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd frontend && npx vitest run src/stores/authStore.test.ts`
Expected: FAIL (módulo não existe).

- [ ] **Step 3: Implementar o store**

Criar `frontend/src/stores/authStore.ts`:

```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthUser {
  id: number;
  email: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  setAuth: (token: string, user: AuthUser) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
      isAuthenticated: () => get().token !== null,
    }),
    { name: "fii-auth" }
  )
);
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd frontend && npx vitest run src/stores/authStore.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/stores/authStore.ts frontend/src/stores/authStore.test.ts
git commit -m "feat(auth): authStore com token persistido (RNF-02')"
```

---

## Task 16: Interceptors do axios (TDD)

**Files:**
- Test: `frontend/src/api/client.test.ts`
- Modify: `frontend/src/api/client.ts`

- [ ] **Step 1: Escrever o teste que falha**

Criar `frontend/src/api/client.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { apiClient } from "./client";
import { useAuthStore } from "@/stores/authStore";

beforeEach(() => useAuthStore.getState().logout());

describe("apiClient interceptor", () => {
  it("injeta Authorization quando há token", async () => {
    useAuthStore.getState().setAuth("tok123", { id: 1, email: "a@b.com" });
    const cfg = await apiClient.interceptors.request.handlers[0].fulfilled({
      headers: {},
    });
    expect(cfg.headers.Authorization).toBe("Bearer tok123");
  });

  it("não injeta header sem token", async () => {
    const cfg = await apiClient.interceptors.request.handlers[0].fulfilled({
      headers: {},
    });
    expect(cfg.headers.Authorization).toBeUndefined();
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd frontend && npx vitest run src/api/client.test.ts`
Expected: FAIL (sem interceptor registrado).

- [ ] **Step 3: Implementar os interceptors**

Substituir `frontend/src/api/client.ts` por:

```typescript
import axios from "axios";
import { useAuthStore } from "@/stores/authStore";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    }
    return Promise.reject(error);
  }
);
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd frontend && npx vitest run src/api/client.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/api/client.ts frontend/src/api/client.test.ts
git commit -m "feat(auth): interceptors axios (Bearer + logout em 401) (RNF-02')"
```

---

## Task 17: Endpoints + hook de auth

**Files:**
- Create: `frontend/src/api/endpoints/auth.ts`
- Create: `frontend/src/hooks/useAuth.ts`
- Test: `frontend/src/hooks/useAuth.test.tsx`

- [ ] **Step 1: Escrever o teste que falha**

Criar `frontend/src/hooks/useAuth.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useAuth } from "./useAuth";
import { useAuthStore } from "@/stores/authStore";
import * as authApi from "@/api/endpoints/auth";

vi.mock("@/api/endpoints/auth");

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.resetAllMocks();
  useAuthStore.getState().logout();
});

describe("useAuth", () => {
  it("login guarda token e usuário no store", async () => {
    vi.mocked(authApi.login).mockResolvedValue({ access_token: "tok", token_type: "bearer" });
    vi.mocked(authApi.me).mockResolvedValue({ id: 1, email: "a@b.com" });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.login("a@b.com", "segredo123");
    });
    await waitFor(() => expect(useAuthStore.getState().token).toBe("tok"));
    expect(useAuthStore.getState().user?.email).toBe("a@b.com");
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd frontend && npx vitest run src/hooks/useAuth.test.tsx`
Expected: FAIL (módulos não existem).

- [ ] **Step 3: Implementar endpoints e hook**

Criar `frontend/src/api/endpoints/auth.ts`:

```typescript
import { apiClient } from "@/api/client";
import type { AuthUser } from "@/stores/authStore";

interface TokenResponse {
  access_token: string;
  token_type: string;
}

export async function register(email: string, senha: string): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>("/api/v1/auth/register", { email, senha });
  return data;
}

export async function login(email: string, senha: string): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>("/api/v1/auth/login", { email, senha });
  return data;
}

export async function me(): Promise<AuthUser> {
  const { data } = await apiClient.get<AuthUser>("/api/v1/auth/me");
  return data;
}
```

Criar `frontend/src/hooks/useAuth.ts`:

```typescript
import { useAuthStore } from "@/stores/authStore";
import * as authApi from "@/api/endpoints/auth";

export function useAuth() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const logout = useAuthStore((s) => s.logout);

  async function autenticar(token: string) {
    useAuthStore.setState({ token });
    const usuario = await authApi.me();
    setAuth(token, usuario);
  }

  return {
    async login(email: string, senha: string) {
      const { access_token } = await authApi.login(email, senha);
      await autenticar(access_token);
    },
    async register(email: string, senha: string) {
      const { access_token } = await authApi.register(email, senha);
      await autenticar(access_token);
    },
    logout,
  };
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd frontend && npx vitest run src/hooks/useAuth.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/api/endpoints/auth.ts frontend/src/hooks/useAuth.ts frontend/src/hooks/useAuth.test.tsx
git commit -m "feat(auth): endpoints e hook useAuth (login/register/me) (RNF-02')"
```

---

## Task 18: ProtectedRoute (TDD)

**Files:**
- Test: `frontend/src/components/ProtectedRoute.test.tsx`
- Create: `frontend/src/components/ProtectedRoute.tsx`

- [ ] **Step 1: Escrever o teste que falha**

Criar `frontend/src/components/ProtectedRoute.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { useAuthStore } from "@/stores/authStore";

function renderEm(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/carteira" element={<div>Carteira privada</div>} />
        </Route>
        <Route path="/login" element={<div>Tela de login</div>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => useAuthStore.getState().logout());

describe("ProtectedRoute", () => {
  it("redireciona para /login sem token", () => {
    renderEm("/carteira");
    expect(screen.getByText("Tela de login")).toBeInTheDocument();
  });

  it("renderiza o conteúdo com token", () => {
    useAuthStore.getState().setAuth("tok", { id: 1, email: "a@b.com" });
    renderEm("/carteira");
    expect(screen.getByText("Carteira privada")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd frontend && npx vitest run src/components/ProtectedRoute.test.tsx`
Expected: FAIL (módulo não existe).

- [ ] **Step 3: Implementar**

Criar `frontend/src/components/ProtectedRoute.tsx`:

```tsx
import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.token !== null);
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd frontend && npx vitest run src/components/ProtectedRoute.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ProtectedRoute.tsx frontend/src/components/ProtectedRoute.test.tsx
git commit -m "feat(auth): ProtectedRoute redireciona para /login (RNF-02')"
```

---

## Task 19: Endpoints + hook de carteira

**Files:**
- Create: `frontend/src/api/endpoints/carteira.ts`
- Create: `frontend/src/hooks/useCarteira.ts`
- Test: `frontend/src/hooks/useCarteira.test.tsx`

- [ ] **Step 1: Escrever o teste que falha**

Criar `frontend/src/hooks/useCarteira.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useCarteira } from "./useCarteira";
import * as carteiraApi from "@/api/endpoints/carteira";

vi.mock("@/api/endpoints/carteira");

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => vi.resetAllMocks());

describe("useCarteira", () => {
  it("carrega posições e resumo", async () => {
    vi.mocked(carteiraApi.listarPosicoes).mockResolvedValue([
      { id: 1, ticker: "HGLG11", nome: "CSHG Log", classe: "FII", quantidade: 10, preco_medio: "100.00", valor_investido: "1000.00" },
    ]);
    vi.mocked(carteiraApi.getResumo).mockResolvedValue({
      total_investido: "1000.00", por_classe: { FII: "1000.00", FIAGRO: "0.00" }, num_posicoes: 1,
    });
    const { result } = renderHook(() => useCarteira(), { wrapper });
    await waitFor(() => expect(result.current.posicoes).toHaveLength(1));
    expect(result.current.posicoes[0].ticker).toBe("HGLG11");
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd frontend && npx vitest run src/hooks/useCarteira.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementar endpoints e hook**

Criar `frontend/src/api/endpoints/carteira.ts`:

```typescript
import { apiClient } from "@/api/client";

export interface Posicao {
  id: number;
  ticker: string;
  nome: string | null;
  classe: string;
  quantidade: number;
  preco_medio: string;
  valor_investido: string;
}

export interface ResumoCarteira {
  total_investido: string;
  por_classe: Record<string, string>;
  num_posicoes: number;
}

export async function listarPosicoes(): Promise<Posicao[]> {
  const { data } = await apiClient.get<Posicao[]>("/api/v1/carteira/posicoes");
  return data;
}

export async function getResumo(): Promise<ResumoCarteira> {
  const { data } = await apiClient.get<ResumoCarteira>("/api/v1/carteira/resumo");
  return data;
}

export async function criarAporte(input: {
  ticker: string;
  quantidade: number;
  preco: string;
}): Promise<Posicao> {
  const { data } = await apiClient.post<Posicao>("/api/v1/carteira/posicoes", input);
  return data;
}

export async function removerPosicao(id: number): Promise<void> {
  await apiClient.delete(`/api/v1/carteira/posicoes/${id}`);
}
```

Criar `frontend/src/hooks/useCarteira.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listarPosicoes,
  getResumo,
  criarAporte,
  removerPosicao,
  type Posicao,
  type ResumoCarteira,
} from "@/api/endpoints/carteira";

export function useCarteira() {
  const qc = useQueryClient();
  const posicoesQuery = useQuery({ queryKey: ["carteira", "posicoes"], queryFn: listarPosicoes });
  const resumoQuery = useQuery({ queryKey: ["carteira", "resumo"], queryFn: getResumo });

  const invalidar = () => qc.invalidateQueries({ queryKey: ["carteira"] });
  const aporte = useMutation({ mutationFn: criarAporte, onSuccess: invalidar });
  const remover = useMutation({ mutationFn: removerPosicao, onSuccess: invalidar });

  const posicoes: Posicao[] = posicoesQuery.data ?? [];
  const resumo: ResumoCarteira | undefined = resumoQuery.data;

  return {
    posicoes,
    resumo,
    isLoading: posicoesQuery.isLoading,
    isError: posicoesQuery.isError,
    aporte,
    remover,
  };
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd frontend && npx vitest run src/hooks/useCarteira.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/api/endpoints/carteira.ts frontend/src/hooks/useCarteira.ts frontend/src/hooks/useCarteira.test.tsx
git commit -m "feat(carteira): endpoints e hook useCarteira (RF-01/04)"
```

---

## Task 20: Páginas Login e Registro (TDD)

**Files:**
- Test: `frontend/src/pages/LoginPage.test.tsx`
- Create: `frontend/src/pages/LoginPage.tsx`
- Create: `frontend/src/pages/RegisterPage.tsx`

- [ ] **Step 1: Escrever o teste que falha**

Criar `frontend/src/pages/LoginPage.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LoginPage } from "./LoginPage";

const loginMock = vi.fn();
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ login: loginMock }) }));

beforeEach(() => loginMock.mockReset());

function renderPage() {
  return render(<MemoryRouter><LoginPage /></MemoryRouter>);
}

describe("LoginPage", () => {
  it("envia e-mail e senha ao logar", async () => {
    loginMock.mockResolvedValue(undefined);
    renderPage();
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: "segredo123" } });
    fireEvent.click(screen.getByRole("button", { name: /entrar/i }));
    await waitFor(() => expect(loginMock).toHaveBeenCalledWith("a@b.com", "segredo123"));
  });

  it("mostra erro quando o login falha", async () => {
    loginMock.mockRejectedValue(new Error("falhou"));
    renderPage();
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: "errada123" } });
    fireEvent.click(screen.getByRole("button", { name: /entrar/i }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd frontend && npx vitest run src/pages/LoginPage.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementar as páginas (mobile-first)**

Criar `frontend/src/pages/LoginPage.tsx`:

```tsx
import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    try {
      await login(email, senha);
      navigate("/carteira");
    } catch {
      setErro("E-mail ou senha inválidos.");
    }
  }

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-sm flex-col justify-center gap-4 px-4">
      <h1 className="text-xl font-semibold">Entrar</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          E-mail
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Senha
          <input
            type="password" required value={senha} onChange={(e) => setSenha(e.target.value)}
            className="rounded border px-3 py-2"
          />
        </label>
        {erro && <p role="alert" className="text-sm text-red-600">{erro}</p>}
        <button type="submit" className="rounded bg-primary px-3 py-2 text-white">Entrar</button>
      </form>
      <p className="text-sm">
        Não tem conta? <Link to="/registro" className="underline">Cadastre-se</Link>
      </p>
    </div>
  );
}
```

Criar `frontend/src/pages/RegisterPage.tsx` (mesma estrutura, chamando `register`; senha mínima de 8):

```tsx
import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    if (senha.length < 8) {
      setErro("A senha precisa ter ao menos 8 caracteres.");
      return;
    }
    try {
      await register(email, senha);
      navigate("/carteira");
    } catch {
      setErro("Não foi possível cadastrar (e-mail já em uso?).");
    }
  }

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-sm flex-col justify-center gap-4 px-4">
      <h1 className="text-xl font-semibold">Criar conta</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          E-mail
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="rounded border px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Senha
          <input type="password" required value={senha} onChange={(e) => setSenha(e.target.value)}
            className="rounded border px-3 py-2" />
        </label>
        {erro && <p role="alert" className="text-sm text-red-600">{erro}</p>}
        <button type="submit" className="rounded bg-primary px-3 py-2 text-white">Cadastrar</button>
      </form>
      <p className="text-sm">
        Já tem conta? <Link to="/login" className="underline">Entrar</Link>
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd frontend && npx vitest run src/pages/LoginPage.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/LoginPage.tsx frontend/src/pages/RegisterPage.tsx frontend/src/pages/LoginPage.test.tsx
git commit -m "feat(auth): páginas de login e registro mobile-first (RNF-02', RNF-05)"
```

---

## Task 21: CarteiraPage (TDD)

**Files:**
- Test: `frontend/src/pages/CarteiraPage.test.tsx`
- Create: `frontend/src/pages/CarteiraPage.tsx`

- [ ] **Step 1: Escrever o teste que falha**

Criar `frontend/src/pages/CarteiraPage.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CarteiraPage } from "./CarteiraPage";

vi.mock("@/hooks/useCarteira", () => ({
  useCarteira: () => ({
    posicoes: [
      { id: 1, ticker: "HGLG11", nome: "CSHG Log", classe: "FII", quantidade: 10, preco_medio: "100.00", valor_investido: "1000.00" },
    ],
    resumo: { total_investido: "1000.00", por_classe: { FII: "1000.00", FIAGRO: "0.00" }, num_posicoes: 1 },
    isLoading: false,
    isError: false,
    aporte: { mutate: vi.fn(), isPending: false },
    remover: { mutate: vi.fn(), isPending: false },
  }),
}));

describe("CarteiraPage", () => {
  it("lista a posição e o total investido", () => {
    render(<CarteiraPage />);
    expect(screen.getByText("HGLG11")).toBeInTheDocument();
    expect(screen.getByText(/1\.000,00|1000\.00/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd frontend && npx vitest run src/pages/CarteiraPage.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementar a página (mobile-first)**

Criar `frontend/src/pages/CarteiraPage.tsx`:

```tsx
import { useState, type FormEvent } from "react";
import { useCarteira } from "@/hooks/useCarteira";

export function CarteiraPage() {
  const { posicoes, resumo, isLoading, isError, aporte, remover } = useCarteira();
  const [ticker, setTicker] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [preco, setPreco] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    aporte.mutate({ ticker: ticker.toUpperCase(), quantidade: Number(quantidade), preco });
    setTicker(""); setQuantidade(""); setPreco("");
  }

  if (isLoading) return <p className="px-4">Carregando carteira…</p>;
  if (isError) return <p className="px-4" role="alert">Erro ao carregar a carteira.</p>;

  return (
    <div className="flex flex-col gap-4 px-4 py-2">
      <h1 className="text-xl font-semibold">Minha Carteira</h1>

      {resumo && (
        <section className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Patrimônio investido</p>
          <p className="text-2xl font-bold">R$ {resumo.total_investido}</p>
          <p className="text-xs text-muted-foreground">
            FII R$ {resumo.por_classe.FII ?? "0.00"} · FIAGRO R$ {resumo.por_classe.FIAGRO ?? "0.00"}
          </p>
        </section>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-2 rounded-lg border p-4">
        <h2 className="text-sm font-medium">Registrar aporte</h2>
        <input aria-label="Ticker" placeholder="Ticker (ex: HGLG11)" required
          value={ticker} onChange={(e) => setTicker(e.target.value)} className="rounded border px-3 py-2" />
        <input aria-label="Quantidade" type="number" min="1" placeholder="Quantidade" required
          value={quantidade} onChange={(e) => setQuantidade(e.target.value)} className="rounded border px-3 py-2" />
        <input aria-label="Preço" type="number" step="0.01" min="0.01" placeholder="Preço por cota" required
          value={preco} onChange={(e) => setPreco(e.target.value)} className="rounded border px-3 py-2" />
        <button type="submit" disabled={aporte.isPending}
          className="rounded bg-primary px-3 py-2 text-white">Adicionar</button>
      </form>

      <ul className="flex flex-col gap-2">
        {posicoes.map((p) => (
          <li key={p.id} className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="font-medium">{p.ticker} <span className="text-xs text-muted-foreground">{p.classe}</span></p>
              <p className="text-xs text-muted-foreground">
                {p.quantidade} cotas · PM R$ {p.preco_medio}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-semibold">R$ {p.valor_investido}</span>
              <button aria-label={`Remover ${p.ticker}`} onClick={() => remover.mutate(p.id)}
                className="text-sm text-red-600">Remover</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd frontend && npx vitest run src/pages/CarteiraPage.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/CarteiraPage.tsx frontend/src/pages/CarteiraPage.test.tsx
git commit -m "feat(carteira): CarteiraPage mobile-first (lista + aporte + resumo) (RF-01/04, RNF-05)"
```

---

## Task 22: Rotas + Header/Navigation com estado de auth

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/layout/Header.tsx`
- Modify: `frontend/src/components/layout/Navigation.tsx`

- [ ] **Step 1: Adicionar as rotas em `App.tsx`**

Substituir o conteúdo de `frontend/src/App.tsx` por:

```tsx
import { Routes, Route } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { DashboardPage } from "@/pages/DashboardPage";
import { RankingPage } from "@/pages/RankingPage";
import { ClustersPage } from "@/pages/ClustersPage";
import { PerfilPage } from "@/pages/PerfilPage";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { CarteiraPage } from "@/pages/CarteiraPage";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/ranking" element={<RankingPage />} />
        <Route path="/clusters" element={<ClustersPage />} />
        <Route path="/perfil" element={<PerfilPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<RegisterPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/carteira" element={<CarteiraPage />} />
        </Route>
      </Routes>
    </Layout>
  );
}
```

- [ ] **Step 2: Header mostra e-mail + logout quando autenticado**

Em `frontend/src/components/layout/Header.tsx`, ler o estado de auth e renderizar o e-mail logado + botão "Sair" (chama `logout()` e navega para `/login`), ou um link "Entrar" quando deslogado. Usar `useAuthStore` e `useNavigate`. Manter o estilo mobile-first existente do Header (não introduzir libs novas).

Exemplo de bloco a inserir no Header (adaptar ao layout atual):

```tsx
import { useAuthStore } from "@/stores/authStore";
import { useNavigate, Link } from "react-router-dom";
// ...dentro do componente:
const user = useAuthStore((s) => s.user);
const logout = useAuthStore((s) => s.logout);
const navigate = useNavigate();
// ...no JSX:
{user ? (
  <div className="flex items-center gap-2 text-sm">
    <span className="max-w-[8rem] truncate">{user.email}</span>
    <button onClick={() => { logout(); navigate("/login"); }} className="underline">Sair</button>
  </div>
) : (
  <Link to="/login" className="text-sm underline">Entrar</Link>
)}
```

- [ ] **Step 3: Navigation ganha item "Carteira"**

Em `frontend/src/components/layout/Navigation.tsx`, adicionar o link para `/carteira` na lista de navegação (rótulo "Carteira"), seguindo o padrão dos itens existentes (ícone lucide opcional, ex.: `Wallet`).

- [ ] **Step 4: Verificar build + testes do front**

Run: `cd frontend && npm run build && npx vitest run`
Expected: build sem erro de tipos; todos os testes PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/App.tsx frontend/src/components/layout/Header.tsx frontend/src/components/layout/Navigation.tsx
git commit -m "feat(auth): rotas de auth/carteira + estado de login no header e nav (RNF-02', RNF-05)"
```

---

## Task 23: Regenerar tipos do OpenAPI + verificação ponta a ponta

**Files:**
- Modify: `frontend/src/types/api.ts`

- [ ] **Step 1: Subir o backend e regenerar os tipos**

Run (backend em um terminal): `cd backend && uvicorn app.main:app --port 8000`
Run (frontend): `cd frontend && npx openapi-typescript http://localhost:8000/openapi.json -o src/types/api.ts`
Expected: `src/types/api.ts` inclui os paths `/api/v1/auth/*` e `/api/v1/carteira/*`.

- [ ] **Step 2: Lint do front**

Run: `cd frontend && npm run lint`
Expected: sem erros (corrigir o que aparecer).

- [ ] **Step 3: Smoke ponta a ponta no viewport mobile (RNF-05) — `verification-before-completion`**

Com backend (porta 8000, banco semeado) e `npm run dev` no front, abrir em viewport ~375px:
- registrar uma conta → redireciona para `/carteira`;
- adicionar um aporte de um ticker do catálogo (ex.: `HGLG11`) → aparece na lista e soma no patrimônio;
- recarregar a página → continua logado (token persistido) e a carteira carrega;
- abrir `/carteira` em uma aba anônima (sem token) → redireciona para `/login`;
- "Sair" → volta para `/login` e `/carteira` fica bloqueada.

Expected: todos os passos OK; nenhum erro de CORS no console.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/api.ts
git commit -m "chore(api): regenera tipos OpenAPI com auth e carteira (RNF-04)"
```

---

## Self-Review (writing-plans)

- **Cobertura do spec:** §3 modelo (Tasks 4-6) ✓ · §4 auth (Tasks 1-3, 7-9) ✓ · §5 carteira/M1 (Tasks 10-13) ✓ · §6 frontend (Tasks 15-22) ✓ · §7 erros (401/409/404/422 cobertos em Tasks 8-9,13) ✓ · §8 testes TDD em cada task ✓ · §10 arquivos batem ✓.
- **Placeholders:** sem TBD/TODO; todo passo de código mostra o código. O `<rev>` da migração é o id gerado pelo Alembic (não é placeholder de lógica). Header/Navigation (Task 22) trazem o bloco concreto a inserir, adaptado ao layout existente — proposital, para não reescrever componentes que não li por inteiro.
- **Consistência de tipos/nomes:** `hash_senha`/`verificar_senha`/`criar_access_token`/`decodificar_token`/`get_current_user` idênticos entre security.py, routers e testes · `registrar_aporte`/`resumo_carteira`/`TickerNaoEncontrado` idênticos entre service, router e testes · `PosicaoRepository.buscar(id, usuario_id)` usado com a mesma assinatura no router · `useAuthStore`/`setAuth`/`logout`/`token` idênticos entre store, interceptor, hooks e ProtectedRoute · campos monetários trafegam como **string** no JSON (Pydantic `Decimal`) e os testes do front e back esperam string.
- **Decisões herdadas do spec:** isolamento via 404 (Task 13) · patrimônio = custo · `AUTH_SECRET` com default de dev (Task 1).
- **Ordem/risco:** Tasks 4 e 5 têm dependência de mapper (relationship `Usuario`↔`Posicao`) — sinalizado para executar juntas. Demais tasks são incrementais e verdes ao fim de cada uma.
