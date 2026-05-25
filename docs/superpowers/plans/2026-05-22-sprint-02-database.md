# Sprint 02 — Banco de Dados (Models + Repositories + Seed) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar os 6 models SQLAlchemy, gerar a migração Alembic, implementar os 2 repositories com TDD e popular o banco com os 50 FIIs mais líquidos do Brasil.

**Architecture:** Models SQLAlchemy 2.0 (Mapped + DeclarativeBase) em arquivos separados por entidade, importados centralmente em `app/models/__init__.py`. Repositories encapsulam queries SQLAlchemy. Seed script idempotente que pode ser re-executado sem duplicar dados. Todos os testes usam SQLite em memória via fixture `db_session`.

**Tech Stack:** Python 3.12, SQLAlchemy 2.0, Alembic 1.14, pytest 8.3, SQLite

---

## Mapa de Arquivos

### Criados nesta sprint

```
backend/
├── app/
│   ├── models/
│   │   ├── __init__.py          ← exporta todos os models (modificar)
│   │   ├── fundo.py             ← class Fundo
│   │   ├── indicador.py         ← class Indicador
│   │   ├── scoring.py           ← class ScoringHistorico
│   │   ├── cluster.py           ← class Cluster + FundoCluster
│   │   └── perfil.py            ← class PerfilInvestidor
│   └── repositories/
│       ├── __init__.py          ← vazio (já existe)
│       ├── fundo_repository.py  ← class FundoRepository
│       └── indicador_repository.py ← class IndicadorRepository
├── migrations/versions/
│   └── XXXX_cria_tabelas_iniciais.py  ← gerado pelo alembic
├── scripts/
│   └── seed_fundos.py           ← seed dos 50 FIIs
└── tests/
    ├── conftest.py              ← adicionar fixture db_session (modificar)
    ├── test_models.py           ← testes de criação e constraints
    ├── test_fundo_repository.py ← testes CRUD do FundoRepository
    └── test_indicador_repository.py ← testes do IndicadorRepository
```

---

## Task 1: Atualizar conftest.py com fixture de banco de testes

**Files:**
- Modify: `backend/tests/conftest.py`

- [ ] **Passo 1: Atualizar `backend/tests/conftest.py`**

```python
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app import models  # noqa: F401 — registra todos os models no Base
from app.database import Base
from app.main import app


@pytest.fixture
def client() -> TestClient:
    """Retorna TestClient do FastAPI para testes de integração."""
    return TestClient(app)


@pytest.fixture
def db_session() -> Session:
    """Banco SQLite em memória isolado por teste."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(engine)
    SessionTest = sessionmaker(bind=engine)
    session = SessionTest()
    try:
        yield session  # type: ignore[misc]
    finally:
        session.close()
        Base.metadata.drop_all(engine)
```

- [ ] **Passo 2: Verificar que os testes existentes ainda passam**

```bash
cd /home/hiago/projetos/fii-insights/backend
source .venv/bin/activate
pytest tests/ -v
```

Esperado: 4 passed (os mesmos de antes — a fixture `db_session` ainda não é usada).

---

## Task 2: Model Fundo

**Files:**
- Create: `backend/app/models/fundo.py`
- Modify: `backend/app/models/__init__.py`
- Test: `backend/tests/test_models.py`

- [ ] **Passo 1: Escrever o teste que vai FALHAR**

Criar `backend/tests/test_models.py`:

```python
from datetime import date

import pytest
from sqlalchemy.exc import IntegrityError

from app.models.fundo import Fundo


def test_criar_fundo_minimo(db_session):
    fundo = Fundo(ticker="XPLG11")
    db_session.add(fundo)
    db_session.commit()
    db_session.refresh(fundo)

    assert fundo.id is not None
    assert fundo.ticker == "XPLG11"
    assert fundo.nome is None
    assert fundo.created_at is not None


def test_criar_fundo_completo(db_session):
    fundo = Fundo(
        ticker="HGLG11",
        nome="CSHG Logística",
        segmento="Logística",
        gestora="Credit Suisse Hedging-Griffo",
        data_ipo=date(2010, 2, 3),
    )
    db_session.add(fundo)
    db_session.commit()

    assert fundo.ticker == "HGLG11"
    assert fundo.segmento == "Logística"
    assert fundo.data_ipo == date(2010, 2, 3)


def test_ticker_unico(db_session):
    db_session.add(Fundo(ticker="KNRI11"))
    db_session.commit()

    db_session.add(Fundo(ticker="KNRI11"))
    with pytest.raises(IntegrityError):
        db_session.commit()
```

- [ ] **Passo 2: Rodar e confirmar FALHA**

```bash
cd /home/hiago/projetos/fii-insights/backend
source .venv/bin/activate
pytest tests/test_models.py -v
```

Esperado: `ModuleNotFoundError: No module named 'app.models.fundo'`

- [ ] **Passo 3: Criar `backend/app/models/fundo.py`**

```python
from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.cluster import FundoCluster
    from app.models.indicador import Indicador
    from app.models.scoring import ScoringHistorico


class Fundo(Base):
    __tablename__ = "fundos"

    id: Mapped[int] = mapped_column(primary_key=True)
    ticker: Mapped[str] = mapped_column(String(10), unique=True, nullable=False, index=True)
    nome: Mapped[str | None] = mapped_column(String(200))
    segmento: Mapped[str | None] = mapped_column(String(100))
    gestora: Mapped[str | None] = mapped_column(String(200))
    data_ipo: Mapped[date | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    indicadores: Mapped[list[Indicador]] = relationship(
        back_populates="fundo", cascade="all, delete-orphan"
    )
    scorings: Mapped[list[ScoringHistorico]] = relationship(
        back_populates="fundo", cascade="all, delete-orphan"
    )
    fundo_clusters: Mapped[list[FundoCluster]] = relationship(
        back_populates="fundo", cascade="all, delete-orphan"
    )
```

- [ ] **Passo 4: Atualizar `backend/app/models/__init__.py`**

```python
from app.models.fundo import Fundo

__all__ = ["Fundo"]
```

- [ ] **Passo 5: Rodar e confirmar PASSA**

```bash
pytest tests/test_models.py::test_criar_fundo_minimo tests/test_models.py::test_criar_fundo_completo tests/test_models.py::test_ticker_unico -v
```

Esperado: 3 passed

---

## Task 3: Model Indicador

**Files:**
- Create: `backend/app/models/indicador.py`
- Modify: `backend/app/models/__init__.py`
- Modify: `backend/tests/test_models.py` (adicionar testes)

- [ ] **Passo 1: Adicionar testes ao `test_models.py`**

Append no final do arquivo:

```python
from app.models.indicador import Indicador
from datetime import date as date_type


def test_criar_indicador_completo(db_session):
    fundo = Fundo(ticker="MXRF11")
    db_session.add(fundo)
    db_session.commit()

    ind = Indicador(
        fundo_id=fundo.id,
        data_referencia=date_type(2026, 5, 1),
        dy_atual=0.12,
        dy_12m=0.11,
        p_vp=0.98,
        vacancia_fisica=0.05,
        vacancia_financeira=0.04,
        liquidez_diaria=5_000_000.0,
        volatilidade_12m=0.12,
        patrimonio_liquido=2_000_000_000.0,
        num_cotistas=180_000,
    )
    db_session.add(ind)
    db_session.commit()
    db_session.refresh(ind)

    assert ind.id is not None
    assert ind.fundo_id == fundo.id
    assert ind.dy_atual == 0.12


def test_criar_indicador_com_nulos(db_session):
    fundo = Fundo(ticker="BCFF11")
    db_session.add(fundo)
    db_session.commit()

    ind = Indicador(fundo_id=fundo.id, data_referencia=date_type(2026, 5, 1))
    db_session.add(ind)
    db_session.commit()

    assert ind.dy_atual is None
    assert ind.p_vp is None


def test_relacionamento_fundo_indicadores(db_session):
    fundo = Fundo(ticker="VISC11")
    db_session.add(fundo)
    db_session.commit()

    for mes in [3, 4, 5]:
        db_session.add(
            Indicador(fundo_id=fundo.id, data_referencia=date_type(2026, mes, 1))
        )
    db_session.commit()
    db_session.refresh(fundo)

    assert len(fundo.indicadores) == 3
```

- [ ] **Passo 2: Rodar e confirmar FALHA**

```bash
pytest tests/test_models.py::test_criar_indicador_completo -v
```

Esperado: `ModuleNotFoundError: No module named 'app.models.indicador'`

- [ ] **Passo 3: Criar `backend/app/models/indicador.py`**

```python
from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Date, Float, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.fundo import Fundo


class Indicador(Base):
    __tablename__ = "indicadores"

    id: Mapped[int] = mapped_column(primary_key=True)
    fundo_id: Mapped[int] = mapped_column(ForeignKey("fundos.id"), nullable=False, index=True)
    data_referencia: Mapped[date] = mapped_column(Date, nullable=False)

    dy_atual: Mapped[float | None] = mapped_column(Float)
    dy_12m: Mapped[float | None] = mapped_column(Float)
    p_vp: Mapped[float | None] = mapped_column(Float)
    vacancia_fisica: Mapped[float | None] = mapped_column(Float)
    vacancia_financeira: Mapped[float | None] = mapped_column(Float)
    liquidez_diaria: Mapped[float | None] = mapped_column(Float)
    volatilidade_12m: Mapped[float | None] = mapped_column(Float)
    patrimonio_liquido: Mapped[float | None] = mapped_column(Float)
    num_cotistas: Mapped[int | None] = mapped_column(Integer)

    fundo: Mapped[Fundo] = relationship(back_populates="indicadores")
```

- [ ] **Passo 4: Atualizar `backend/app/models/__init__.py`**

```python
from app.models.fundo import Fundo
from app.models.indicador import Indicador

__all__ = ["Fundo", "Indicador"]
```

- [ ] **Passo 5: Rodar e confirmar PASSA**

```bash
pytest tests/test_models.py -k "indicador" -v
```

Esperado: 3 passed

---

## Task 4: Models ScoringHistorico, Cluster, FundoCluster e PerfilInvestidor

**Files:**
- Create: `backend/app/models/scoring.py`
- Create: `backend/app/models/cluster.py`
- Create: `backend/app/models/perfil.py`
- Modify: `backend/app/models/__init__.py`
- Modify: `backend/tests/test_models.py` (adicionar testes)

- [ ] **Passo 1: Adicionar testes ao `test_models.py`**

Append no final do arquivo:

```python
from datetime import datetime as dt

from app.models.cluster import Cluster, FundoCluster
from app.models.perfil import PerfilInvestidor
from app.models.scoring import ScoringHistorico


def test_criar_scoring_historico(db_session):
    fundo = Fundo(ticker="BTLG11")
    db_session.add(fundo)
    db_session.commit()

    scoring = ScoringHistorico(
        fundo_id=fundo.id,
        data_execucao=dt(2026, 5, 22, 10, 0, 0),
        score=75.5,
        classificacao="Bom",
    )
    db_session.add(scoring)
    db_session.commit()
    db_session.refresh(scoring)

    assert scoring.id is not None
    assert scoring.score == 75.5
    assert scoring.classificacao == "Bom"


def test_criar_cluster_e_associar_fundo(db_session):
    cluster = Cluster(
        nome_interpretado="Tijolo Conservador",
        perfil_risco="conservador",
        descricao="FIIs de baixa volatilidade com DY moderado",
        dy_medio=0.10,
        volatilidade_media=0.08,
        p_vp_medio=0.95,
        num_fiis=12,
    )
    db_session.add(cluster)
    db_session.commit()

    fundo = Fundo(ticker="ALZR11")
    db_session.add(fundo)
    db_session.commit()

    fc = FundoCluster(
        fundo_id=fundo.id,
        cluster_id=cluster.id,
        data_atribuicao=date_type(2026, 5, 22),
    )
    db_session.add(fc)
    db_session.commit()

    assert fc.fundo_id == fundo.id
    assert fc.cluster_id == cluster.id


def test_criar_perfil_investidor(db_session):
    perfil = PerfilInvestidor(tipo="moderado")
    db_session.add(perfil)
    db_session.commit()
    db_session.refresh(perfil)

    assert perfil.id is not None
    assert len(perfil.id) == 36  # UUID string
    assert perfil.tipo == "moderado"
    assert perfil.pesos_personalizados is None


def test_perfil_com_pesos_customizados(db_session):
    pesos = {"dy_atual": 0.25, "p_vp": 0.20, "vacancia_fisica": 0.10}
    perfil = PerfilInvestidor(tipo="arrojado", pesos_personalizados=pesos)
    db_session.add(perfil)
    db_session.commit()
    db_session.refresh(perfil)

    assert perfil.pesos_personalizados["dy_atual"] == 0.25
```

- [ ] **Passo 2: Rodar e confirmar FALHA**

```bash
pytest tests/test_models.py::test_criar_scoring_historico -v
```

Esperado: `ModuleNotFoundError: No module named 'app.models.scoring'`

- [ ] **Passo 3: Criar `backend/app/models/scoring.py`**

```python
from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.fundo import Fundo


class ScoringHistorico(Base):
    __tablename__ = "scoring_historico"

    id: Mapped[int] = mapped_column(primary_key=True)
    fundo_id: Mapped[int] = mapped_column(ForeignKey("fundos.id"), nullable=False, index=True)
    data_execucao: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    score: Mapped[float] = mapped_column(Float, nullable=False)
    classificacao: Mapped[str] = mapped_column(String(20), nullable=False)

    fundo: Mapped[Fundo] = relationship(back_populates="scorings")
```

- [ ] **Passo 4: Criar `backend/app/models/cluster.py`**

```python
from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Date, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.fundo import Fundo


class Cluster(Base):
    __tablename__ = "clusters"

    id: Mapped[int] = mapped_column(primary_key=True)
    nome_interpretado: Mapped[str] = mapped_column(String(100), nullable=False)
    perfil_risco: Mapped[str] = mapped_column(String(20), nullable=False)
    descricao: Mapped[str | None] = mapped_column(String(500))
    dy_medio: Mapped[float | None] = mapped_column(Float)
    volatilidade_media: Mapped[float | None] = mapped_column(Float)
    p_vp_medio: Mapped[float | None] = mapped_column(Float)
    num_fiis: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    fundo_clusters: Mapped[list[FundoCluster]] = relationship(
        back_populates="cluster", cascade="all, delete-orphan"
    )


class FundoCluster(Base):
    __tablename__ = "fundo_clusters"

    fundo_id: Mapped[int] = mapped_column(ForeignKey("fundos.id"), primary_key=True)
    cluster_id: Mapped[int] = mapped_column(ForeignKey("clusters.id"), primary_key=True)
    data_atribuicao: Mapped[date] = mapped_column(Date, nullable=False)

    fundo: Mapped[Fundo] = relationship(back_populates="fundo_clusters")
    cluster: Mapped[Cluster] = relationship(back_populates="fundo_clusters")
```

- [ ] **Passo 5: Criar `backend/app/models/perfil.py`**

```python
import uuid
from datetime import datetime

from sqlalchemy import DateTime, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class PerfilInvestidor(Base):
    __tablename__ = "perfis_investidor"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    tipo: Mapped[str] = mapped_column(String(20), nullable=False)
    pesos_personalizados: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )
```

- [ ] **Passo 6: Atualizar `backend/app/models/__init__.py`**

```python
from app.models.cluster import Cluster, FundoCluster
from app.models.fundo import Fundo
from app.models.indicador import Indicador
from app.models.perfil import PerfilInvestidor
from app.models.scoring import ScoringHistorico

__all__ = [
    "Fundo",
    "Indicador",
    "ScoringHistorico",
    "Cluster",
    "FundoCluster",
    "PerfilInvestidor",
]
```

- [ ] **Passo 7: Rodar todos os testes de models**

```bash
pytest tests/test_models.py -v
```

Esperado: 12 passed

---

## Task 5: Migração Alembic

**Files:**
- Modify: `backend/migrations/env.py` (já configurado — apenas verificar)
- Create: `backend/migrations/versions/XXXX_cria_tabelas_iniciais.py` (gerado)

- [ ] **Passo 1: Verificar que env.py importa os models**

```bash
cd /home/hiago/projetos/fii-insights/backend
source .venv/bin/activate
python -c "from migrations.env import *" 2>&1 | head -5
```

Se não houver erro de import, está OK.

- [ ] **Passo 2: Gerar a migração**

```bash
cd /home/hiago/projetos/fii-insights/backend
source .venv/bin/activate
alembic revision --autogenerate -m "cria tabelas iniciais"
```

Esperado: `Generating .../migrations/versions/XXXX_cria_tabelas_iniciais.py ... done`

- [ ] **Passo 3: Aplicar a migração**

```bash
alembic upgrade head
```

Esperado:
```
INFO  [alembic.runtime.migration] Running upgrade  -> XXXX, cria tabelas iniciais
```

- [ ] **Passo 4: Verificar tabelas criadas**

```bash
python -c "
from app.database import engine
from sqlalchemy import inspect
insp = inspect(engine)
tabelas = insp.get_table_names()
print(tabelas)
"
```

Esperado: lista contendo `['clusters', 'fundo_clusters', 'fundos', 'indicadores', 'perfis_investidor', 'scoring_historico']`

---

## Task 6: FundoRepository

**Files:**
- Create: `backend/app/repositories/fundo_repository.py`
- Create: `backend/tests/test_fundo_repository.py`

- [ ] **Passo 1: Criar `backend/tests/test_fundo_repository.py`**

```python
import pytest

from app.models.fundo import Fundo
from app.repositories.fundo_repository import FundoRepository


def test_criar_fundo(db_session):
    repo = FundoRepository(db_session)
    fundo = repo.criar(ticker="XPLG11", nome="XP Log", segmento="Logística")

    assert fundo.id is not None
    assert fundo.ticker == "XPLG11"


def test_buscar_por_ticker_existente(db_session):
    repo = FundoRepository(db_session)
    repo.criar(ticker="HGLG11", nome="CSHG Logística")

    resultado = repo.buscar_por_ticker("HGLG11")

    assert resultado is not None
    assert resultado.nome == "CSHG Logística"


def test_buscar_por_ticker_inexistente(db_session):
    repo = FundoRepository(db_session)

    resultado = repo.buscar_por_ticker("XXXX99")

    assert resultado is None


def test_buscar_por_id(db_session):
    repo = FundoRepository(db_session)
    criado = repo.criar(ticker="KNRI11")

    resultado = repo.buscar_por_id(criado.id)

    assert resultado is not None
    assert resultado.ticker == "KNRI11"


def test_listar_todos_ordenado(db_session):
    repo = FundoRepository(db_session)
    for ticker in ["XPLG11", "BTLG11", "ALZR11"]:
        repo.criar(ticker=ticker)

    lista = repo.listar_todos()

    assert len(lista) == 3
    assert lista[0].ticker == "ALZR11"
    assert lista[2].ticker == "XPLG11"


def test_atualizar_fundo(db_session):
    repo = FundoRepository(db_session)
    fundo = repo.criar(ticker="VISC11")

    atualizado = repo.atualizar(fundo, nome="Vinci Shopping Centers", segmento="Shopping")

    assert atualizado.nome == "Vinci Shopping Centers"
    assert atualizado.ticker == "VISC11"
```

- [ ] **Passo 2: Rodar e confirmar FALHA**

```bash
cd /home/hiago/projetos/fii-insights/backend
source .venv/bin/activate
pytest tests/test_fundo_repository.py -v
```

Esperado: `ModuleNotFoundError: No module named 'app.repositories.fundo_repository'`

- [ ] **Passo 3: Criar `backend/app/repositories/fundo_repository.py`**

```python
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.fundo import Fundo


class FundoRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def criar(
        self,
        ticker: str,
        nome: str | None = None,
        segmento: str | None = None,
        gestora: str | None = None,
        data_ipo: object = None,
    ) -> Fundo:
        fundo = Fundo(ticker=ticker, nome=nome, segmento=segmento, gestora=gestora, data_ipo=data_ipo)
        self.db.add(fundo)
        self.db.commit()
        self.db.refresh(fundo)
        return fundo

    def buscar_por_ticker(self, ticker: str) -> Fundo | None:
        stmt = select(Fundo).where(Fundo.ticker == ticker)
        return self.db.scalar(stmt)

    def buscar_por_id(self, id: int) -> Fundo | None:
        return self.db.get(Fundo, id)

    def listar_todos(self) -> list[Fundo]:
        stmt = select(Fundo).order_by(Fundo.ticker)
        return list(self.db.scalars(stmt))

    def atualizar(self, fundo: Fundo, **campos: object) -> Fundo:
        for campo, valor in campos.items():
            setattr(fundo, campo, valor)
        self.db.commit()
        self.db.refresh(fundo)
        return fundo
```

- [ ] **Passo 4: Rodar e confirmar PASSA**

```bash
pytest tests/test_fundo_repository.py -v
```

Esperado: 6 passed

---

## Task 7: IndicadorRepository

**Files:**
- Create: `backend/app/repositories/indicador_repository.py`
- Create: `backend/tests/test_indicador_repository.py`

- [ ] **Passo 1: Criar `backend/tests/test_indicador_repository.py`**

```python
from datetime import date

from app.models.fundo import Fundo
from app.models.indicador import Indicador
from app.repositories.indicador_repository import IndicadorRepository
from app.repositories.fundo_repository import FundoRepository


def _fundo(db_session, ticker: str) -> Fundo:
    repo = FundoRepository(db_session)
    return repo.criar(ticker=ticker)


def test_criar_indicador(db_session):
    fundo = _fundo(db_session, "MXRF11")
    repo = IndicadorRepository(db_session)

    ind = repo.criar(
        fundo_id=fundo.id,
        data_referencia=date(2026, 5, 1),
        dy_atual=0.12,
        liquidez_diaria=8_000_000.0,
    )

    assert ind.id is not None
    assert ind.fundo_id == fundo.id
    assert ind.dy_atual == 0.12


def test_buscar_mais_recente_por_fundo(db_session):
    fundo = _fundo(db_session, "HGLG11")
    repo = IndicadorRepository(db_session)

    for mes in [3, 4, 5]:
        repo.criar(fundo_id=fundo.id, data_referencia=date(2026, mes, 1), dy_atual=mes * 0.01)

    recente = repo.buscar_mais_recente(fundo.id)

    assert recente is not None
    assert recente.data_referencia == date(2026, 5, 1)
    assert recente.dy_atual == 0.05


def test_buscar_mais_recente_sem_indicador(db_session):
    fundo = _fundo(db_session, "BTLG11")
    repo = IndicadorRepository(db_session)

    resultado = repo.buscar_mais_recente(fundo.id)

    assert resultado is None


def test_listar_por_fundo(db_session):
    fundo = _fundo(db_session, "BRCO11")
    repo = IndicadorRepository(db_session)

    for mes in [1, 2, 3]:
        repo.criar(fundo_id=fundo.id, data_referencia=date(2026, mes, 1))

    lista = repo.listar_por_fundo(fundo.id)

    assert len(lista) == 3


def test_buscar_todos_mais_recentes(db_session):
    f1 = _fundo(db_session, "XPLG11")
    f2 = _fundo(db_session, "LVBI11")
    repo = IndicadorRepository(db_session)

    repo.criar(fundo_id=f1.id, data_referencia=date(2026, 4, 1), dy_atual=0.10)
    repo.criar(fundo_id=f1.id, data_referencia=date(2026, 5, 1), dy_atual=0.11)
    repo.criar(fundo_id=f2.id, data_referencia=date(2026, 5, 1), dy_atual=0.09)

    recentes = repo.buscar_todos_mais_recentes()

    assert len(recentes) == 2
    tickers = {r.fundo.ticker for r in recentes}
    assert tickers == {"XPLG11", "LVBI11"}
```

- [ ] **Passo 2: Rodar e confirmar FALHA**

```bash
pytest tests/test_indicador_repository.py -v
```

Esperado: `ModuleNotFoundError: No module named 'app.repositories.indicador_repository'`

- [ ] **Passo 3: Criar `backend/app/repositories/indicador_repository.py`**

```python
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.indicador import Indicador


class IndicadorRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def criar(self, fundo_id: int, data_referencia: date, **campos: object) -> Indicador:
        ind = Indicador(fundo_id=fundo_id, data_referencia=data_referencia, **campos)
        self.db.add(ind)
        self.db.commit()
        self.db.refresh(ind)
        return ind

    def buscar_mais_recente(self, fundo_id: int) -> Indicador | None:
        stmt = (
            select(Indicador)
            .where(Indicador.fundo_id == fundo_id)
            .order_by(Indicador.data_referencia.desc())
            .limit(1)
        )
        return self.db.scalar(stmt)

    def listar_por_fundo(self, fundo_id: int) -> list[Indicador]:
        stmt = (
            select(Indicador)
            .where(Indicador.fundo_id == fundo_id)
            .order_by(Indicador.data_referencia.desc())
        )
        return list(self.db.scalars(stmt))

    def buscar_todos_mais_recentes(self) -> list[Indicador]:
        """Retorna o indicador mais recente de cada fundo."""
        from sqlalchemy import func
        from app.models.fundo import Fundo  # noqa: import local para evitar circular

        subq = (
            select(
                Indicador.fundo_id,
                func.max(Indicador.data_referencia).label("max_data"),
            )
            .group_by(Indicador.fundo_id)
            .subquery()
        )
        stmt = (
            select(Indicador)
            .join(
                subq,
                (Indicador.fundo_id == subq.c.fundo_id)
                & (Indicador.data_referencia == subq.c.max_data),
            )
            .join(Fundo, Indicador.fundo_id == Fundo.id)
        )
        return list(self.db.scalars(stmt))
```

- [ ] **Passo 4: Rodar e confirmar PASSA**

```bash
pytest tests/test_indicador_repository.py -v
```

Esperado: 5 passed

---

## Task 8: Seed dos 50 FIIs

**Files:**
- Create: `backend/scripts/seed_fundos.py`
- Create: `backend/tests/test_seed.py`

- [ ] **Passo 1: Criar `backend/tests/test_seed.py`**

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app import models  # noqa: F401
from app.database import Base
from app.repositories.fundo_repository import FundoRepository
from scripts.seed_fundos import FUNDOS_SEED, seed


def test_seed_cria_50_fundos():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)

    seed(session_factory=Session)

    with Session() as db:
        repo = FundoRepository(db)
        todos = repo.listar_todos()

    assert len(todos) == 50


def test_seed_idempotente():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)

    seed(session_factory=Session)
    seed(session_factory=Session)  # segunda vez não deve duplicar

    with Session() as db:
        repo = FundoRepository(db)
        todos = repo.listar_todos()

    assert len(todos) == 50


def test_seed_tem_campos_obrigatorios():
    assert len(FUNDOS_SEED) == 50
    for item in FUNDOS_SEED:
        assert "ticker" in item
        assert "segmento" in item
        assert len(item["ticker"]) <= 10
```

- [ ] **Passo 2: Rodar e confirmar FALHA**

```bash
pytest tests/test_seed.py -v
```

Esperado: `ModuleNotFoundError: No module named 'scripts.seed_fundos'`

- [ ] **Passo 3: Criar `backend/scripts/seed_fundos.py`**

```python
"""Seed dos 50 FIIs mais líquidos do Brasil (dados cadastrais estáticos)."""
from __future__ import annotations

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from typing import Any

from sqlalchemy.orm import sessionmaker

from app.database import SessionLocal, engine, Base
from app import models  # noqa: F401
from app.repositories.fundo_repository import FundoRepository

FUNDOS_SEED: list[dict[str, Any]] = [
    {"ticker": "XPLG11", "nome": "XP Log Fundo de Investimento Imobiliário", "segmento": "Logística", "gestora": "XP Asset Management"},
    {"ticker": "HGLG11", "nome": "CSHG Logística", "segmento": "Logística", "gestora": "Credit Suisse Hedging-Griffo"},
    {"ticker": "KNRI11", "nome": "Kinea Renda Imobiliária", "segmento": "Lajes Corporativas", "gestora": "Kinea Investimentos"},
    {"ticker": "BCFF11", "nome": "BTG Pactual Fundo de Fundos", "segmento": "Fundo de Fundos", "gestora": "BTG Pactual"},
    {"ticker": "MXRF11", "nome": "Maxi Renda", "segmento": "Recebíveis", "gestora": "XP Asset Management"},
    {"ticker": "XPML11", "nome": "XP Malls", "segmento": "Shopping", "gestora": "XP Asset Management"},
    {"ticker": "HGRE11", "nome": "CSHG Real Estate", "segmento": "Lajes Corporativas", "gestora": "Credit Suisse Hedging-Griffo"},
    {"ticker": "RBRF11", "nome": "RBR Alpha", "segmento": "Fundo de Fundos", "gestora": "RBR Asset Management"},
    {"ticker": "VISC11", "nome": "Vinci Shopping Centers", "segmento": "Shopping", "gestora": "Vinci Real Estate"},
    {"ticker": "BTLG11", "nome": "BTG Pactual Logística", "segmento": "Logística", "gestora": "BTG Pactual"},
    {"ticker": "CPTS11", "nome": "Capitânia Securities II", "segmento": "Recebíveis", "gestora": "Capitânia"},
    {"ticker": "VRTA11", "nome": "Fator Verita", "segmento": "Recebíveis", "gestora": "Fator Administração de Recursos"},
    {"ticker": "PVBI11", "nome": "VBI Prime Properties", "segmento": "Lajes Corporativas", "gestora": "VBI Real Estate"},
    {"ticker": "RBRP11", "nome": "RBR Properties", "segmento": "Lajes Corporativas", "gestora": "RBR Asset Management"},
    {"ticker": "ALZR11", "nome": "Alianza Trust Renda Imobiliária", "segmento": "Renda Urbana", "gestora": "Alianza"},
    {"ticker": "BRCO11", "nome": "Bresco Logística", "segmento": "Logística", "gestora": "Bresco Investimentos"},
    {"ticker": "HGBS11", "nome": "Hedge Brasil Shopping", "segmento": "Shopping", "gestora": "Credit Suisse Hedging-Griffo"},
    {"ticker": "MALL11", "nome": "Malls Brasil Plural", "segmento": "Shopping", "gestora": "Brasil Plural"},
    {"ticker": "VINO11", "nome": "Vinci Offices", "segmento": "Lajes Corporativas", "gestora": "Vinci Real Estate"},
    {"ticker": "HGCR11", "nome": "CSHG Recebíveis Imobiliários", "segmento": "Recebíveis", "gestora": "Credit Suisse Hedging-Griffo"},
    {"ticker": "KNCR11", "nome": "Kinea Rendimentos Imobiliários", "segmento": "Recebíveis", "gestora": "Kinea Investimentos"},
    {"ticker": "RBRY11", "nome": "RBR Rendimentos High Grade", "segmento": "Recebíveis", "gestora": "RBR Asset Management"},
    {"ticker": "BRCR11", "nome": "BTG Pactual Corporate Office", "segmento": "Lajes Corporativas", "gestora": "BTG Pactual"},
    {"ticker": "IRDM11", "nome": "Iridium Recebíveis Imobiliários", "segmento": "Recebíveis", "gestora": "Iridium Gestora"},
    {"ticker": "VCJR11", "nome": "Vectis Juros Real", "segmento": "Recebíveis", "gestora": "Vectis Gestão"},
    {"ticker": "SNFF11", "nome": "Suno Fundo de Fundos", "segmento": "Fundo de Fundos", "gestora": "Suno Asset"},
    {"ticker": "HGRU11", "nome": "CSHG Renda Urbana", "segmento": "Renda Urbana", "gestora": "Credit Suisse Hedging-Griffo"},
    {"ticker": "RBRR11", "nome": "RBR Rendimento High Grade", "segmento": "Recebíveis", "gestora": "RBR Asset Management"},
    {"ticker": "TGAR11", "nome": "TG Ativo Real", "segmento": "Híbrido", "gestora": "TG Core Asset"},
    {"ticker": "LVBI11", "nome": "VBI Logístico", "segmento": "Logística", "gestora": "VBI Real Estate"},
    {"ticker": "TRXF11", "nome": "TRX Real Estate", "segmento": "Renda Urbana", "gestora": "TRX Gestora"},
    {"ticker": "AFHI11", "nome": "AF Invest CRI", "segmento": "Recebíveis", "gestora": "AF Invest"},
    {"ticker": "RBVA11", "nome": "Rio Bravo Renda Varejo", "segmento": "Renda Urbana", "gestora": "Rio Bravo"},
    {"ticker": "HSML11", "nome": "HSI Malls", "segmento": "Shopping", "gestora": "Hemisfério Sul Investimentos"},
    {"ticker": "XPCI11", "nome": "XP Crédito Imobiliário", "segmento": "Recebíveis", "gestora": "XP Asset Management"},
    {"ticker": "OUJP11", "nome": "Ourinvest JPP", "segmento": "Recebíveis", "gestora": "Ourinvest"},
    {"ticker": "MGFF11", "nome": "Mogno Fundo de Fundos", "segmento": "Fundo de Fundos", "gestora": "Mogno Capital"},
    {"ticker": "VGIP11", "nome": "Valora Imobiliário Prime", "segmento": "Recebíveis", "gestora": "Valora Gestão de Investimentos"},
    {"ticker": "RECR11", "nome": "REC Recebíveis Imobiliários", "segmento": "Recebíveis", "gestora": "REC Gestora"},
    {"ticker": "RZAK11", "nome": "Riza Aktie", "segmento": "Recebíveis", "gestora": "Riza Asset Management"},
    {"ticker": "JSRE11", "nome": "JS Real Estate Multigestão", "segmento": "Lajes Corporativas", "gestora": "JS Investimentos"},
    {"ticker": "GTWR11", "nome": "GTC Tower", "segmento": "Lajes Corporativas", "gestora": "Patria Investimentos"},
    {"ticker": "URPR11", "nome": "Urca Prime Renda", "segmento": "Recebíveis", "gestora": "Urca Capital Partners"},
    {"ticker": "HFOF11", "nome": "Hedge Fund of Funds Imobiliário", "segmento": "Fundo de Fundos", "gestora": "Hedge Investments"},
    {"ticker": "GGRC11", "nome": "GGR Coppenrath Invest", "segmento": "Logística", "gestora": "GGR Investimentos"},
    {"ticker": "ARRI11", "nome": "Áttimo Renda Imobiliária", "segmento": "Recebíveis", "gestora": "Áttimo Gestão"},
    {"ticker": "CACR11", "nome": "Caixa Rio Bravo CRI", "segmento": "Recebíveis", "gestora": "Rio Bravo"},
    {"ticker": "PORD11", "nome": "Polo Recebíveis", "segmento": "Recebíveis", "gestora": "Polo Capital"},
    {"ticker": "SPAF11", "nome": "Sparta Cred Fiagro", "segmento": "Recebíveis", "gestora": "Sparta Investimentos"},
    {"ticker": "HGFF11", "nome": "CSHG Fundo de Fundos", "segmento": "Fundo de Fundos", "gestora": "Credit Suisse Hedging-Griffo"},
    {"ticker": "VGHF11", "nome": "Valora Hedge Fund", "segmento": "Recebíveis", "gestora": "Valora Gestão de Investimentos"},
]


def seed(session_factory: type[sessionmaker] | None = None) -> None:
    """Popula o banco com os 50 FIIs. Idempotente."""
    if session_factory is None:
        Base.metadata.create_all(bind=engine)
        session_factory = SessionLocal

    with session_factory() as db:
        repo = FundoRepository(db)
        criados = 0
        for dados in FUNDOS_SEED:
            if not repo.buscar_por_ticker(dados["ticker"]):
                repo.criar(**dados)
                criados += 1
        print(f"Seed: {criados} criados, {len(FUNDOS_SEED) - criados} já existiam.")


if __name__ == "__main__":
    seed()
```

- [ ] **Passo 4: Rodar e confirmar PASSA**

```bash
pytest tests/test_seed.py -v
```

Esperado: 3 passed

---

## Task 9: Verificação final da Sprint 02

- [ ] **Passo 1: Suite completa de testes**

```bash
cd /home/hiago/projetos/fii-insights/backend
source .venv/bin/activate
pytest tests/ -v
```

Esperado: **26 passed** (4 da Sprint 01 + 12 models + 6 fundo_repo + 5 indicador_repo + 3 seed + falhar se algum count mudar)

- [ ] **Passo 2: ruff**

```bash
ruff check . --fix
```

Esperado: `All checks passed!`

- [ ] **Passo 3: mypy**

```bash
mypy app/ --ignore-missing-imports
```

Esperado: `Success: no issues found`

- [ ] **Passo 4: Rodar seed no banco real**

```bash
python -m scripts.seed_fundos
```

Esperado: `Seed: 50 criados, 0 já existiam.`

- [ ] **Passo 5: Verificar tabelas no banco**

```bash
python -c "
from app.database import engine
from sqlalchemy import inspect, text
insp = inspect(engine)
print('Tabelas:', insp.get_table_names())
with engine.connect() as c:
    n = c.execute(text('SELECT COUNT(*) FROM fundos')).scalar()
    print(f'Fundos no banco: {n}')
"
```

Esperado:
```
Tabelas: ['alembic_version', 'clusters', 'fundo_clusters', 'fundos', 'indicadores', 'perfis_investidor', 'scoring_historico']
Fundos no banco: 50
```

---

## Definição de Pronto — Sprint 02

| Critério | Verificado |
|---|---|
| 26 testes passando | [ ] |
| 6 tabelas criadas via Alembic | [ ] |
| 50 fundos no banco após seed | [ ] |
| `ruff check .` limpo | [ ] |
| `mypy app/` limpo | [ ] |
