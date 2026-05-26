# Backend Completo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconstruir todo o backend Python (infraestrutura + coleta Status Invest + scoring multicritério + K-Means) e expor API FastAPI que o frontend React já existente consome.

**Architecture:** Camadas Repository → Service → Router. SQLite existente com 50 fundos e schema completo. Coleta via scraping do Status Invest (httpx + BeautifulSoup). Scoring com redistribuição de pesos por dimensão. K-Means com 4 features (dy_12m, p_vp, vacancia_media, log10_liquidez), k=4 fixo. API FastAPI com prefixo `/api/v1`.

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy 2.0, SQLite (existente), httpx, BeautifulSoup4/lxml, scikit-learn, pandas, numpy, pytest, respx

---

## Mapa de Arquivos

### Criados neste plano

```
backend/
├── app/
│   ├── __init__.py
│   ├── config.py
│   ├── database.py
│   ├── main.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── fundo.py
│   │   ├── indicador.py
│   │   ├── scoring.py
│   │   ├── cluster.py
│   │   └── perfil.py
│   ├── repositories/
│   │   ├── __init__.py
│   │   ├── fundo_repository.py
│   │   └── indicador_repository.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── coleta_service.py
│   │   ├── scoring_service.py
│   │   └── clustering_service.py
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── fundos.py
│   │   ├── ranking.py
│   │   ├── dashboard.py
│   │   ├── perfil.py
│   │   ├── scoring.py
│   │   └── clustering.py
│   └── utils/
│       ├── __init__.py
│       ├── http_client.py
│       └── parsers/
│           ├── __init__.py
│           └── status_invest.py
├── scripts/
│   ├── __init__.py
│   ├── coletar_dados.py
│   ├── rodar_scoring.py
│   └── rodar_clustering.py
└── tests/
    ├── __init__.py
    ├── conftest.py
    ├── fixtures/
    │   ├── __init__.py
    │   └── hglg11_page.html
    ├── test_models.py
    ├── test_fundo_repository.py
    ├── test_indicador_repository.py
    ├── test_http_client.py
    ├── test_status_invest_parser.py
    ├── test_coleta_service.py
    ├── test_scoring_service.py
    └── test_clustering_service.py
```

---

## Contexto crítico para todos os tasks

- **DB já existe** em `backend/data/fii_insights.db` com schema completo e 50 fundos. NÃO rodar `alembic upgrade head` (vai falhar, tabelas já existem).
- **Python 3.12** está no venv (`.venv/`). Ativar com `source .venv/bin/activate` em todos os comandos.
- **Working dir:** sempre `backend/` salvo indicação contrária.
- **Segmentos reais no banco:** Logística, Lajes Corporativas, Shopping, Recebíveis, Híbrido, Fundo de Fundos, Renda Urbana.

---

## Task 1: Infraestrutura — config, database, models

**Files:**
- Create: `backend/app/__init__.py`
- Create: `backend/app/config.py`
- Create: `backend/app/database.py`
- Create: `backend/app/models/__init__.py`
- Create: `backend/app/models/fundo.py`
- Create: `backend/app/models/indicador.py`
- Create: `backend/app/models/scoring.py`
- Create: `backend/app/models/cluster.py`
- Create: `backend/app/models/perfil.py`
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/conftest.py`
- Create: `backend/tests/test_models.py`

- [ ] **1.1 — Criar `backend/app/__init__.py`** (vazio)

```python
```

- [ ] **1.2 — Criar `backend/app/config.py`**

```python
from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./data/fii_insights.db"
    brapi_token: str = ""
    cors_origins: str = "http://localhost:5173"
    log_level: str = "INFO"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]


settings = Settings()
```

- [ ] **1.3 — Criar `backend/app/database.py`**

```python
from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

- [ ] **1.4 — Criar `backend/app/models/fundo.py`**

```python
from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Fundo(Base):
    __tablename__ = "fundos"

    id: Mapped[int] = mapped_column(primary_key=True)
    ticker: Mapped[str] = mapped_column(String(10), unique=True, nullable=False)
    nome: Mapped[str | None] = mapped_column(String(200))
    segmento: Mapped[str | None] = mapped_column(String(100))
    gestora: Mapped[str | None] = mapped_column(String(200))
    data_ipo: Mapped[date | None]
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    indicadores: Mapped[list["Indicador"]] = relationship(back_populates="fundo")
    scorings: Mapped[list["ScoringHistorico"]] = relationship(back_populates="fundo")
    fundo_clusters: Mapped[list["FundoCluster"]] = relationship(back_populates="fundo")
```

- [ ] **1.5 — Criar `backend/app/models/indicador.py`**

```python
from __future__ import annotations

from datetime import date

from sqlalchemy import Date, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Indicador(Base):
    __tablename__ = "indicadores"

    id: Mapped[int] = mapped_column(primary_key=True)
    fundo_id: Mapped[int] = mapped_column(ForeignKey("fundos.id"), nullable=False)
    data_referencia: Mapped[date] = mapped_column(Date, nullable=False)

    dy_atual: Mapped[float | None]
    dy_12m: Mapped[float | None]
    p_vp: Mapped[float | None]
    vacancia_fisica: Mapped[float | None]
    vacancia_financeira: Mapped[float | None]
    liquidez_diaria: Mapped[float | None]
    volatilidade_12m: Mapped[float | None]
    patrimonio_liquido: Mapped[float | None]
    num_cotistas: Mapped[int | None] = mapped_column(Integer, nullable=True)

    fundo: Mapped["Fundo"] = relationship(back_populates="indicadores")
```

- [ ] **1.6 — Criar `backend/app/models/scoring.py`**

```python
from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ScoringHistorico(Base):
    __tablename__ = "scoring_historico"

    id: Mapped[int] = mapped_column(primary_key=True)
    fundo_id: Mapped[int] = mapped_column(ForeignKey("fundos.id"), nullable=False)
    data_execucao: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    score: Mapped[float] = mapped_column(nullable=False)
    classificacao: Mapped[str] = mapped_column(String(20), nullable=False)

    fundo: Mapped["Fundo"] = relationship(back_populates="scorings")
```

- [ ] **1.7 — Criar `backend/app/models/cluster.py`**

```python
from __future__ import annotations

from datetime import date

from sqlalchemy import Date, ForeignKey, Integer, PrimaryKeyConstraint, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Cluster(Base):
    __tablename__ = "clusters"

    id: Mapped[int] = mapped_column(primary_key=True)
    nome_interpretado: Mapped[str] = mapped_column(String(100), nullable=False)
    perfil_risco: Mapped[str] = mapped_column(String(20), nullable=False)
    descricao: Mapped[str | None] = mapped_column(String(500))
    dy_medio: Mapped[float | None]
    volatilidade_media: Mapped[float | None]
    p_vp_medio: Mapped[float | None]
    num_fiis: Mapped[int] = mapped_column(Integer, nullable=False)

    fundo_clusters: Mapped[list["FundoCluster"]] = relationship(back_populates="cluster")


class FundoCluster(Base):
    __tablename__ = "fundo_clusters"
    __table_args__ = (PrimaryKeyConstraint("fundo_id", "cluster_id"),)

    fundo_id: Mapped[int] = mapped_column(ForeignKey("fundos.id"))
    cluster_id: Mapped[int] = mapped_column(ForeignKey("clusters.id"))
    data_atribuicao: Mapped[date] = mapped_column(Date, nullable=False)

    fundo: Mapped["Fundo"] = relationship(back_populates="fundo_clusters")
    cluster: Mapped["Cluster"] = relationship(back_populates="fundo_clusters")
```

- [ ] **1.8 — Criar `backend/app/models/perfil.py`**

```python
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class PerfilInvestidor(Base):
    __tablename__ = "perfis_investidor"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tipo: Mapped[str] = mapped_column(String(20), nullable=False, default="moderado")
    pesos_personalizados: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
```

- [ ] **1.9 — Criar `backend/app/models/__init__.py`**

```python
from app.models.cluster import Cluster, FundoCluster
from app.models.fundo import Fundo
from app.models.indicador import Indicador
from app.models.perfil import PerfilInvestidor
from app.models.scoring import ScoringHistorico

__all__ = ["Fundo", "Indicador", "ScoringHistorico", "Cluster", "FundoCluster", "PerfilInvestidor"]
```

- [ ] **1.10 — Criar `backend/tests/__init__.py`** (vazio)

```python
```

- [ ] **1.11 — Criar `backend/tests/conftest.py`**

```python
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
import app.models  # noqa: F401 — registra todos os models no Base


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()
    Base.metadata.drop_all(engine)
```

- [ ] **1.12 — Criar `backend/tests/test_models.py`**

```python
from datetime import date, datetime

from app.models.fundo import Fundo
from app.models.indicador import Indicador
from app.models.scoring import ScoringHistorico
from app.models.cluster import Cluster, FundoCluster


def test_fundo_criado_com_ticker(db_session):
    fundo = Fundo(ticker="TEST11")
    db_session.add(fundo)
    db_session.commit()
    assert fundo.id is not None
    assert fundo.ticker == "TEST11"


def test_indicador_com_campos_nulos(db_session):
    fundo = Fundo(ticker="NULL11")
    db_session.add(fundo)
    db_session.flush()
    ind = Indicador(fundo_id=fundo.id, data_referencia=date.today())
    db_session.add(ind)
    db_session.commit()
    assert ind.dy_atual is None
    assert ind.p_vp is None


def test_scoring_historico_salvo(db_session):
    fundo = Fundo(ticker="SCOR11")
    db_session.add(fundo)
    db_session.flush()
    sh = ScoringHistorico(
        fundo_id=fundo.id,
        data_execucao=datetime.now(),
        score=72.5,
        classificacao="Bom",
    )
    db_session.add(sh)
    db_session.commit()
    assert sh.id is not None
    assert sh.classificacao == "Bom"


def test_cluster_e_fundo_cluster(db_session):
    fundo = Fundo(ticker="CLST11")
    db_session.add(fundo)
    db_session.flush()
    cluster = Cluster(
        nome_interpretado="Tijolo Conservador",
        perfil_risco="conservador",
        num_fiis=10,
    )
    db_session.add(cluster)
    db_session.flush()
    fc = FundoCluster(fundo_id=fundo.id, cluster_id=cluster.id, data_atribuicao=date.today())
    db_session.add(fc)
    db_session.commit()
    assert fc.fundo_id == fundo.id
```

- [ ] **1.13 — Rodar testes**

```bash
cd /home/hiago/projetos/fii-insights/backend
source .venv/bin/activate
pytest tests/test_models.py -v
```

Esperado: `4 passed`

- [ ] **1.14 — Commit**

```bash
git add backend/app/__init__.py backend/app/config.py backend/app/database.py \
        backend/app/models/ backend/tests/__init__.py backend/tests/conftest.py \
        backend/tests/test_models.py
git commit -m "feat: reconstrói infraestrutura — config, database e models ORM"
```

---

## Task 2: Repositories

**Files:**
- Create: `backend/app/repositories/__init__.py`
- Create: `backend/app/repositories/fundo_repository.py`
- Create: `backend/app/repositories/indicador_repository.py`
- Create: `backend/tests/test_fundo_repository.py`
- Create: `backend/tests/test_indicador_repository.py`

- [ ] **2.1 — Criar `backend/app/repositories/__init__.py`** (vazio)

```python
```

- [ ] **2.2 — Escrever `backend/tests/test_fundo_repository.py`** (RED)

```python
import pytest
from app.repositories.fundo_repository import FundoRepository


def test_buscar_por_ticker_existente(db_session):
    repo = FundoRepository(db_session)
    repo.criar(ticker="XPLG11")
    fundo = repo.buscar_por_ticker("XPLG11")
    assert fundo is not None
    assert fundo.ticker == "XPLG11"


def test_buscar_por_ticker_inexistente(db_session):
    repo = FundoRepository(db_session)
    assert repo.buscar_por_ticker("NONE11") is None


def test_listar_todos_retorna_todos(db_session):
    repo = FundoRepository(db_session)
    repo.criar(ticker="A11")
    repo.criar(ticker="B11")
    fundos = repo.listar_todos()
    tickers = [f.ticker for f in fundos]
    assert "A11" in tickers
    assert "B11" in tickers


def test_criar_com_campos_opcionais(db_session):
    repo = FundoRepository(db_session)
    fundo = repo.criar(ticker="FULL11", nome="Full FII", segmento="Logística")
    assert fundo.nome == "Full FII"
    assert fundo.segmento == "Logística"
```

- [ ] **2.3 — Criar `backend/app/repositories/fundo_repository.py`**

```python
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.fundo import Fundo


class FundoRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def criar(self, ticker: str, **kwargs: object) -> Fundo:
        fundo = Fundo(ticker=ticker, **kwargs)
        self.db.add(fundo)
        self.db.commit()
        self.db.refresh(fundo)
        return fundo

    def buscar_por_ticker(self, ticker: str) -> Fundo | None:
        return self.db.scalar(select(Fundo).where(Fundo.ticker == ticker))

    def listar_todos(self) -> list[Fundo]:
        return list(self.db.scalars(select(Fundo).order_by(Fundo.ticker)))
```

- [ ] **2.4 — Rodar e confirmar PASSA**

```bash
pytest tests/test_fundo_repository.py -v
```

Esperado: `4 passed`

- [ ] **2.5 — Escrever `backend/tests/test_indicador_repository.py`** (RED)

```python
import pytest
from datetime import date
from app.repositories.fundo_repository import FundoRepository
from app.repositories.indicador_repository import IndicadorRepository


def _fundo(db, ticker):
    return FundoRepository(db).criar(ticker=ticker)


def test_criar_indicador(db_session):
    fundo = _fundo(db_session, "IND11")
    repo = IndicadorRepository(db_session)
    ind = repo.criar(fundo_id=fundo.id, data_referencia=date(2026, 5, 26), dy_12m=0.085)
    assert ind.id is not None
    assert ind.dy_12m == pytest.approx(0.085)


def test_buscar_mais_recente(db_session):
    fundo = _fundo(db_session, "REC11")
    repo = IndicadorRepository(db_session)
    repo.criar(fundo_id=fundo.id, data_referencia=date(2026, 5, 1), dy_12m=0.07)
    repo.criar(fundo_id=fundo.id, data_referencia=date(2026, 5, 26), dy_12m=0.09)
    ind = repo.buscar_mais_recente(fundo.id)
    assert ind is not None
    assert ind.dy_12m == pytest.approx(0.09)


def test_upsert_cria_novo(db_session):
    fundo = _fundo(db_session, "UPST11")
    repo = IndicadorRepository(db_session)
    ind = repo.upsert(fundo_id=fundo.id, data_referencia=date(2026, 5, 26), p_vp=0.93)
    assert ind.id is not None
    assert ind.p_vp == pytest.approx(0.93)


def test_upsert_atualiza_existente(db_session):
    fundo = _fundo(db_session, "UPDT11")
    repo = IndicadorRepository(db_session)
    repo.criar(fundo_id=fundo.id, data_referencia=date(2026, 5, 26), dy_12m=0.08)
    repo.upsert(fundo_id=fundo.id, data_referencia=date(2026, 5, 26), dy_12m=0.09)
    todos = repo.listar_por_fundo(fundo.id)
    assert len(todos) == 1
    assert todos[0].dy_12m == pytest.approx(0.09)


def test_listar_mais_recentes_todos_fundos(db_session):
    f1 = _fundo(db_session, "F111")
    f2 = _fundo(db_session, "F211")
    repo = IndicadorRepository(db_session)
    repo.criar(fundo_id=f1.id, data_referencia=date(2026, 5, 26), dy_12m=0.08)
    repo.criar(fundo_id=f2.id, data_referencia=date(2026, 5, 26), dy_12m=0.09)
    todos = repo.listar_mais_recentes_todos()
    assert len(todos) == 2
```

- [ ] **2.6 — Criar `backend/app/repositories/indicador_repository.py`**

```python
from __future__ import annotations

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

    def upsert(self, fundo_id: int, data_referencia: date, **campos: object) -> Indicador:
        stmt = select(Indicador).where(
            Indicador.fundo_id == fundo_id,
            Indicador.data_referencia == data_referencia,
        )
        ind = self.db.scalar(stmt)
        if ind is None:
            ind = Indicador(fundo_id=fundo_id, data_referencia=data_referencia)
            self.db.add(ind)
        for campo, valor in campos.items():
            setattr(ind, campo, valor)
        self.db.commit()
        self.db.refresh(ind)
        return ind

    def buscar_mais_recente(self, fundo_id: int) -> Indicador | None:
        return self.db.scalar(
            select(Indicador)
            .where(Indicador.fundo_id == fundo_id)
            .order_by(Indicador.data_referencia.desc())
            .limit(1)
        )

    def listar_por_fundo(self, fundo_id: int) -> list[Indicador]:
        return list(
            self.db.scalars(
                select(Indicador)
                .where(Indicador.fundo_id == fundo_id)
                .order_by(Indicador.data_referencia.desc())
            )
        )

    def listar_mais_recentes_todos(self) -> list[Indicador]:
        """Retorna o indicador mais recente de cada fundo."""
        from sqlalchemy import func
        subq = (
            select(Indicador.fundo_id, func.max(Indicador.data_referencia).label("max_data"))
            .group_by(Indicador.fundo_id)
            .subquery()
        )
        stmt = select(Indicador).join(
            subq,
            (Indicador.fundo_id == subq.c.fundo_id)
            & (Indicador.data_referencia == subq.c.max_data),
        )
        return list(self.db.scalars(stmt))
```

- [ ] **2.7 — Rodar e confirmar PASSA**

```bash
pytest tests/test_indicador_repository.py -v
```

Esperado: `5 passed`

- [ ] **2.8 — Commit**

```bash
git add backend/app/repositories/ backend/tests/test_fundo_repository.py \
        backend/tests/test_indicador_repository.py
git commit -m "feat: implementa FundoRepository e IndicadorRepository com upsert"
```

---

## Task 3: Coleta de dados (Status Invest)

**Files:**
- Create: `backend/app/utils/__init__.py`
- Create: `backend/app/utils/http_client.py`
- Create: `backend/app/utils/parsers/__init__.py`
- Create: `backend/app/utils/parsers/status_invest.py`
- Create: `backend/app/services/__init__.py`
- Create: `backend/app/services/coleta_service.py`
- Create: `backend/scripts/__init__.py`
- Create: `backend/scripts/coletar_dados.py`
- Create: `backend/tests/fixtures/__init__.py`
- Create: `backend/tests/fixtures/hglg11_page.html`
- Create: `backend/tests/test_http_client.py`
- Create: `backend/tests/test_status_invest_parser.py`
- Create: `backend/tests/test_coleta_service.py`

- [ ] **3.1 — Criar `backend/app/utils/__init__.py`** (vazio)

```python
```

- [ ] **3.2 — Criar `backend/app/utils/parsers/__init__.py`** (vazio)

```python
```

- [ ] **3.3 — Criar `backend/app/services/__init__.py`** (vazio)

```python
```

- [ ] **3.4 — Criar `backend/scripts/__init__.py`** (vazio)

```python
```

- [ ] **3.5 — Criar `backend/tests/fixtures/__init__.py`** (vazio)

```python
```

- [ ] **3.6 — Criar `backend/tests/fixtures/hglg11_page.html`**

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head><title>HGLG11 - CSHG Logística | Status Invest</title></head>
<body>
  <div class="info-top-field">
    <h3>P/VP</h3>
    <p><strong>0,93</strong></p>
  </div>
  <div class="info-top-field">
    <h3>Dividend Yield <span class="material-icons">help_outline</span></h3>
    <p><strong>8,50</strong> %</p>
  </div>
  <div class="info-top-field">
    <h3>Último DY</h3>
    <p><strong>0,72</strong> %</p>
  </div>
  <div class="info-top-field">
    <h3>Liq. méd. diária</h3>
    <p>R$ <strong>9.863.300,65</strong></p>
  </div>
  <div class="info-top-field">
    <h3>Patrimônio</h3>
    <p>R$ 7.234.911.198</p>
  </div>
  <div class="info-top-field">
    <h3>Nº de Cotistas</h3>
    <p><strong>565.330</strong></p>
  </div>
  <div class="vacancy-section">
    <span>VACÂNCIA FÍSICA</span>
    <strong>2,50%</strong>
  </div>
  <div class="vacancy-section">
    <span>VACÂNCIA FINANCEIRA</span>
    <strong>3,10%</strong>
  </div>
</body>
</html>
```

- [ ] **3.7 — Criar `backend/app/utils/http_client.py`**

```python
from __future__ import annotations

import logging
import time

import httpx

logger = logging.getLogger(__name__)

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "pt-BR,pt;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

_STATUS_RETRIABLE = {429, 500, 502, 503, 504}
_STATUS_NAO_RETRIABLE = {400, 401, 403, 404}


def criar_cliente_http() -> httpx.Client:
    return httpx.Client(headers=_HEADERS, timeout=15.0, follow_redirects=True)


def fetch_com_retry(client: httpx.Client, url: str, max_tentativas: int = 3) -> str:
    ultimo_erro: Exception | None = None
    for tentativa in range(max_tentativas):
        try:
            resp = client.get(url)
            if resp.status_code in _STATUS_NAO_RETRIABLE:
                resp.raise_for_status()
            if resp.status_code in _STATUS_RETRIABLE:
                raise httpx.HTTPStatusError(
                    f"HTTP {resp.status_code}", request=resp.request, response=resp
                )
            resp.raise_for_status()
            return resp.text
        except httpx.HTTPStatusError as e:
            if e.response.status_code in _STATUS_NAO_RETRIABLE:
                raise
            ultimo_erro = e
            if tentativa < max_tentativas - 1:
                wait = 2**tentativa
                logger.warning("Tentativa %d falhou: %s. Aguardando %ds", tentativa + 1, e, wait)
                time.sleep(wait)
        except (httpx.TimeoutException, httpx.NetworkError) as e:
            ultimo_erro = e
            if tentativa < max_tentativas - 1:
                wait = 2**tentativa
                time.sleep(wait)
    raise ultimo_erro  # type: ignore[misc]
```

- [ ] **3.8 — Criar `backend/tests/test_http_client.py`** (os testes confirmam o comportamento)

```python
import httpx
import pytest
import respx
from unittest.mock import patch

from app.utils.http_client import criar_cliente_http, fetch_com_retry


def test_fetch_retorna_html_em_sucesso():
    with respx.mock:
        respx.get("https://exemplo.com/fii").mock(
            return_value=httpx.Response(200, text="<html>ok</html>")
        )
        with criar_cliente_http() as client:
            resultado = fetch_com_retry(client, "https://exemplo.com/fii")
    assert resultado == "<html>ok</html>"


def test_fetch_retry_em_503():
    with respx.mock:
        respx.get("https://exemplo.com/fii").mock(
            side_effect=[
                httpx.Response(503, text="Service Unavailable"),
                httpx.Response(200, text="<html>ok</html>"),
            ]
        )
        with patch("app.utils.http_client.time.sleep") as mock_sleep:
            with criar_cliente_http() as client:
                resultado = fetch_com_retry(client, "https://exemplo.com/fii")
    assert resultado == "<html>ok</html>"
    mock_sleep.assert_called_once_with(1)


def test_fetch_levanta_apos_max_tentativas():
    with respx.mock:
        respx.get("https://exemplo.com/fii").mock(
            return_value=httpx.Response(503, text="Service Unavailable")
        )
        with patch("app.utils.http_client.time.sleep"):
            with criar_cliente_http() as client:
                with pytest.raises(httpx.HTTPStatusError):
                    fetch_com_retry(client, "https://exemplo.com/fii", max_tentativas=3)


def test_fetch_nao_retry_em_404():
    with respx.mock:
        respx.get("https://exemplo.com/fii").mock(
            return_value=httpx.Response(404, text="Not Found")
        )
        with patch("app.utils.http_client.time.sleep") as mock_sleep:
            with criar_cliente_http() as client:
                with pytest.raises(httpx.HTTPStatusError):
                    fetch_com_retry(client, "https://exemplo.com/fii")
    mock_sleep.assert_not_called()
```

- [ ] **3.9 — Rodar e confirmar PASSA**

```bash
pytest tests/test_http_client.py -v
```

Esperado: `4 passed`

- [ ] **3.10 — Criar `backend/app/utils/parsers/status_invest.py`**

```python
from __future__ import annotations

import re
from typing import Any

from bs4 import BeautifulSoup, Tag


class StatusInvestParser:
    """Extrai indicadores financeiros de FII da página do Status Invest."""

    def extrair(self, html: str) -> dict[str, Any]:
        soup = BeautifulSoup(html, "lxml")
        return {
            "dy_atual": self._extrair_dy_atual(soup),
            "dy_12m": self._extrair_dy_12m(soup),
            "p_vp": self._extrair_p_vp(soup),
            "vacancia_fisica": self._extrair_vacancia_fisica(soup),
            "vacancia_financeira": self._extrair_vacancia_financeira(soup),
            "liquidez_diaria": self._extrair_liquidez(soup),
            "volatilidade_12m": None,  # não disponível no Status Invest
            "patrimonio_liquido": self._extrair_patrimonio(soup),
            "num_cotistas": self._extrair_cotistas(soup),
        }

    def _h3_por_label(self, soup: BeautifulSoup, label: str) -> Tag | None:
        for h3 in soup.find_all("h3"):
            if re.search(label, h3.get_text(), re.IGNORECASE):
                return h3  # type: ignore[return-value]
        return None

    def _strong_apos_h3(self, soup: BeautifulSoup, label: str) -> str | None:
        h3 = self._h3_por_label(soup, label)
        if not h3:
            return None
        strong = h3.find_next("strong")
        return strong.get_text(strip=True) if isinstance(strong, Tag) else None

    def _p_apos_h3(self, soup: BeautifulSoup, label: str) -> str | None:
        h3 = self._h3_por_label(soup, label)
        if not h3:
            return None
        p = h3.find_next("p")
        if isinstance(p, Tag):
            return p.get_text(strip=True).replace("R$", "").strip()
        return None

    def _strong_apos_span(self, soup: BeautifulSoup, label: str) -> str | None:
        for node in soup.find_all(string=re.compile(label, re.IGNORECASE)):
            parent = node.parent
            if not isinstance(parent, Tag):
                continue
            strong = parent.find_next("strong")
            if isinstance(strong, Tag):
                return strong.get_text(strip=True).replace("%", "").strip()
        return None

    @staticmethod
    def _br_float(texto: str | None) -> float | None:
        if not texto:
            return None
        try:
            return float(texto.replace(".", "").replace(",", ".").strip())
        except ValueError:
            return None

    @staticmethod
    def _br_pct(texto: str | None) -> float | None:
        if not texto:
            return None
        try:
            limpo = texto.replace("%", "").replace(".", "").replace(",", ".").strip()
            return float(limpo) / 100.0
        except ValueError:
            return None

    @staticmethod
    def _br_int(texto: str | None) -> int | None:
        if not texto:
            return None
        try:
            return int(texto.replace(".", "").replace(",", "").strip())
        except ValueError:
            return None

    def _extrair_p_vp(self, soup: BeautifulSoup) -> float | None:
        return self._br_float(self._strong_apos_h3(soup, r"^P/VP$"))

    def _extrair_dy_12m(self, soup: BeautifulSoup) -> float | None:
        return self._br_pct(self._strong_apos_h3(soup, r"Dividend Yield"))

    def _extrair_dy_atual(self, soup: BeautifulSoup) -> float | None:
        for label in [r"Último DY", r"DY Atual", r"Último Rendimento"]:
            valor = self._strong_apos_h3(soup, label)
            if valor:
                return self._br_pct(valor)
        return None

    def _extrair_liquidez(self, soup: BeautifulSoup) -> float | None:
        return self._br_float(self._strong_apos_h3(soup, r"Liq\. méd"))

    def _extrair_patrimonio(self, soup: BeautifulSoup) -> float | None:
        texto = self._p_apos_h3(soup, r"^Patrimônio$")
        if texto:
            return self._br_float(texto)
        return self._br_float(self._strong_apos_h3(soup, r"^Patrimônio$"))

    def _extrair_cotistas(self, soup: BeautifulSoup) -> int | None:
        return self._br_int(self._strong_apos_h3(soup, r"Nº de Cotistas"))

    def _extrair_vacancia_fisica(self, soup: BeautifulSoup) -> float | None:
        return self._br_pct(self._strong_apos_span(soup, r"VACÂNCIA FÍSICA"))

    def _extrair_vacancia_financeira(self, soup: BeautifulSoup) -> float | None:
        return self._br_pct(self._strong_apos_span(soup, r"VACÂNCIA FINANCEIRA"))
```

- [ ] **3.11 — Criar `backend/tests/test_status_invest_parser.py`**

```python
import pytest
from pathlib import Path
from app.utils.parsers.status_invest import StatusInvestParser

FIXTURE = (Path(__file__).parent / "fixtures" / "hglg11_page.html").read_text(encoding="utf-8")


@pytest.fixture
def parser():
    return StatusInvestParser()


def test_extrair_p_vp(parser):
    assert parser.extrair(FIXTURE)["p_vp"] == pytest.approx(0.93, abs=0.01)


def test_extrair_dy_12m(parser):
    assert parser.extrair(FIXTURE)["dy_12m"] == pytest.approx(0.085, abs=0.001)


def test_extrair_dy_atual(parser):
    assert parser.extrair(FIXTURE)["dy_atual"] == pytest.approx(0.0072, abs=0.0001)


def test_extrair_liquidez(parser):
    assert parser.extrair(FIXTURE)["liquidez_diaria"] == pytest.approx(9_863_300.65, rel=0.01)


def test_extrair_patrimonio(parser):
    assert parser.extrair(FIXTURE)["patrimonio_liquido"] == pytest.approx(7_234_911_198.0, rel=0.01)


def test_extrair_cotistas(parser):
    assert parser.extrair(FIXTURE)["num_cotistas"] == 565_330


def test_extrair_vacancia_fisica(parser):
    assert parser.extrair(FIXTURE)["vacancia_fisica"] == pytest.approx(0.025, abs=0.001)


def test_extrair_vacancia_financeira(parser):
    assert parser.extrair(FIXTURE)["vacancia_financeira"] == pytest.approx(0.031, abs=0.001)


def test_campo_ausente_retorna_none(parser):
    dados = parser.extrair("<html><body><p>vazio</p></body></html>")
    assert dados["p_vp"] is None
    assert dados["dy_12m"] is None
    assert dados["volatilidade_12m"] is None


def test_todas_as_chaves_presentes(parser):
    dados = parser.extrair(FIXTURE)
    assert set(dados.keys()) == {
        "dy_atual", "dy_12m", "p_vp", "vacancia_fisica", "vacancia_financeira",
        "liquidez_diaria", "volatilidade_12m", "patrimonio_liquido", "num_cotistas",
    }
```

- [ ] **3.12 — Rodar e confirmar PASSA**

```bash
pytest tests/test_status_invest_parser.py -v
```

Esperado: `10 passed`

- [ ] **3.13 — Criar `backend/app/services/coleta_service.py`**

```python
from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from datetime import date

from sqlalchemy.orm import Session

from app.repositories.fundo_repository import FundoRepository
from app.repositories.indicador_repository import IndicadorRepository
from app.utils.http_client import criar_cliente_http, fetch_com_retry
from app.utils.parsers.status_invest import StatusInvestParser

logger = logging.getLogger(__name__)

_SI_BASE = "https://statusinvest.com.br/fundos-imobiliarios"
_DELAY = 0.3


@dataclass
class ColetaResultado:
    coletados: int = 0
    falhas: int = 0
    erros: list[tuple[str, str]] = field(default_factory=list)


class ColetaService:
    def __init__(self, db: Session) -> None:
        self._db = db
        self._fundos = FundoRepository(db)
        self._indicadores = IndicadorRepository(db)
        self._parser = StatusInvestParser()

    def coletar_todos(self) -> ColetaResultado:
        fundos = self._fundos.listar_todos()
        resultado = ColetaResultado()
        hoje = date.today()

        with criar_cliente_http() as client:
            for i, fundo in enumerate(fundos):
                if i > 0:
                    time.sleep(_DELAY)
                url = f"{_SI_BASE}/{fundo.ticker}"
                try:
                    html = fetch_com_retry(client, url)
                    campos = self._parser.extrair(html)
                    self._indicadores.upsert(fundo_id=fundo.id, data_referencia=hoje, **campos)
                    resultado.coletados += 1
                    logger.info("Coletado: %s", fundo.ticker)
                except Exception as e:
                    resultado.falhas += 1
                    resultado.erros.append((fundo.ticker, str(e)))
                    logger.warning("Falha em %s: %s", fundo.ticker, e)

        return resultado
```

- [ ] **3.14 — Criar `backend/tests/test_coleta_service.py`**

```python
import httpx
import pytest
import respx
from pathlib import Path
from unittest.mock import patch

from app.repositories.fundo_repository import FundoRepository
from app.repositories.indicador_repository import IndicadorRepository
from app.services.coleta_service import ColetaService

_HTML = (Path(__file__).parent / "fixtures" / "hglg11_page.html").read_text()
_BASE = "https://statusinvest.com.br/fundos-imobiliarios"


def test_coletar_salva_indicadores(db_session):
    FundoRepository(db_session).criar(ticker="HGLG11")
    with respx.mock:
        respx.get(f"{_BASE}/HGLG11").mock(return_value=httpx.Response(200, text=_HTML))
        with patch("app.services.coleta_service.time.sleep"):
            resultado = ColetaService(db_session).coletar_todos()
    assert resultado.coletados == 1
    assert resultado.falhas == 0


def test_coletar_continua_apos_falha(db_session):
    repo = FundoRepository(db_session)
    repo.criar(ticker="HGLG11")
    repo.criar(ticker="ERRO11")
    with respx.mock:
        respx.get(f"{_BASE}/HGLG11").mock(return_value=httpx.Response(200, text=_HTML))
        respx.get(f"{_BASE}/ERRO11").mock(return_value=httpx.Response(404, text="Not Found"))
        with patch("app.services.coleta_service.time.sleep"):
            resultado = ColetaService(db_session).coletar_todos()
    assert resultado.coletados == 1
    assert resultado.falhas == 1
    assert resultado.erros[0][0] == "ERRO11"


def test_delay_aplicado(db_session):
    repo = FundoRepository(db_session)
    repo.criar(ticker="HGLG11")
    repo.criar(ticker="MXRF11")
    with respx.mock:
        respx.get(f"{_BASE}/HGLG11").mock(return_value=httpx.Response(200, text=_HTML))
        respx.get(f"{_BASE}/MXRF11").mock(return_value=httpx.Response(200, text=_HTML))
        with patch("app.services.coleta_service.time.sleep") as mock_sleep:
            ColetaService(db_session).coletar_todos()
    assert mock_sleep.call_count == 1
    mock_sleep.assert_called_with(0.3)
```

- [ ] **3.15 — Rodar e confirmar PASSA**

```bash
pytest tests/test_coleta_service.py -v
```

Esperado: `3 passed`

- [ ] **3.16 — Criar `backend/scripts/coletar_dados.py`**

```python
"""Coleta indicadores dos FIIs via Status Invest.

Uso:
    cd backend && source .venv/bin/activate
    python -m scripts.coletar_dados
"""
from __future__ import annotations

import logging
import sys

import app.models  # noqa: F401
from app.database import SessionLocal
from app.services.coleta_service import ColetaService

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s — %(message)s")
logger = logging.getLogger(__name__)


def main() -> None:
    logger.info("Iniciando coleta...")
    with SessionLocal() as db:
        resultado = ColetaService(db).coletar_todos()
    logger.info("Coleta: %d coletados, %d falhas", resultado.coletados, resultado.falhas)
    for ticker, msg in resultado.erros:
        logger.warning("  %s: %s", ticker, msg)
    sys.exit(0 if resultado.falhas == 0 else 1)


if __name__ == "__main__":
    main()
```

- [ ] **3.17 — Rodar suite completa**

```bash
pytest tests/ -v
```

Esperado: ≥ 23 passed

- [ ] **3.18 — Commit**

```bash
git add backend/app/utils/ backend/app/services/coleta_service.py \
        backend/scripts/ backend/tests/fixtures/ \
        backend/tests/test_http_client.py backend/tests/test_status_invest_parser.py \
        backend/tests/test_coleta_service.py
git commit -m "feat: implementa coleta via Status Invest com retry e upsert"
```

---

## Task 4: Scoring Service (TDD)

**Files:**
- Create: `backend/app/services/scoring_service.py`
- Create: `backend/scripts/rodar_scoring.py`
- Create: `backend/tests/test_scoring_service.py`

- [ ] **4.1 — Escrever `backend/tests/test_scoring_service.py`** (RED)

```python
import pytest
from datetime import date, datetime

from app.models.fundo import Fundo
from app.models.indicador import Indicador
from app.services.scoring_service import (
    ScoringService,
    classificar_score,
    pontuar_dy,
    pontuar_pvp,
    pontuar_vacancia,
    pontuar_liquidez,
    pontuar_segmento,
)


# ── testes de faixas ──────────────────────────────────────────────────

def test_dy_faixas():
    assert pontuar_dy(0.05) == 1   # ≤6%
    assert pontuar_dy(0.07) == 3   # 6-8%
    assert pontuar_dy(0.09) == 5   # 8-10%
    assert pontuar_dy(0.11) == 4   # 10-12%
    assert pontuar_dy(0.13) == 2   # >12%


def test_pvp_faixas():
    assert pontuar_pvp(0.75) == 5   # <0.80
    assert pontuar_pvp(0.87) == 4   # 0.80-0.95
    assert pontuar_pvp(1.00) == 3   # 0.95-1.05
    assert pontuar_pvp(1.10) == 2   # 1.05-1.20
    assert pontuar_pvp(1.25) == 1   # >1.20


def test_vacancia_faixas():
    assert pontuar_vacancia(0.03) == 5   # <5%
    assert pontuar_vacancia(0.07) == 4   # 5-10%
    assert pontuar_vacancia(0.12) == 3   # 10-15%
    assert pontuar_vacancia(0.20) == 2   # 15-25%
    assert pontuar_vacancia(0.30) == 1   # >25%


def test_liquidez_faixas():
    assert pontuar_liquidez(50_000) == 1       # <100k
    assert pontuar_liquidez(200_000) == 2      # 100-500k
    assert pontuar_liquidez(700_000) == 3      # 500k-1M
    assert pontuar_liquidez(2_000_000) == 4    # 1-5M
    assert pontuar_liquidez(10_000_000) == 5   # >5M


def test_segmento_scores():
    assert pontuar_segmento("Logística") == 5
    assert pontuar_segmento("Lajes Corporativas") == 4
    assert pontuar_segmento("Shopping") == 4
    assert pontuar_segmento("Renda Urbana") == 3
    assert pontuar_segmento("Híbrido") == 3
    assert pontuar_segmento("Fundo de Fundos") == 2
    assert pontuar_segmento("Recebíveis") == 2
    assert pontuar_segmento(None) is None
    assert pontuar_segmento("Outro Qualquer") == 3  # default moderado


def test_classificar_score():
    assert classificar_score(85.0) == "Excelente"
    assert classificar_score(80.0) == "Excelente"
    assert classificar_score(75.0) == "Bom"
    assert classificar_score(60.0) == "Bom"
    assert classificar_score(55.0) == "Regular"
    assert classificar_score(40.0) == "Regular"
    assert classificar_score(39.9) == "Evitar"


# ── testes do ScoringService integrado ───────────────────────────────

def _criar_fundo_com_indicador(db_session, ticker, segmento="Logística", **campos):
    fundo = Fundo(ticker=ticker, segmento=segmento)
    db_session.add(fundo)
    db_session.flush()
    ind = Indicador(fundo_id=fundo.id, data_referencia=date(2026, 5, 26), **campos)
    db_session.add(ind)
    db_session.commit()
    return fundo, ind


def test_scoring_service_calcula_e_salva(db_session):
    _criar_fundo_com_indicador(
        db_session, "SCOR11",
        dy_atual=0.09, dy_12m=0.085, p_vp=0.93,
        vacancia_fisica=0.025, vacancia_financeira=0.031,
        liquidez_diaria=9_863_300.0, patrimonio_liquido=7_000_000_000.0,
        num_cotistas=565_330,
    )
    _criar_fundo_com_indicador(
        db_session, "SCOR22",
        dy_atual=0.07, dy_12m=0.07, p_vp=1.10,
        vacancia_fisica=0.08, vacancia_financeira=0.10,
        liquidez_diaria=500_000.0, patrimonio_liquido=1_000_000_000.0,
        num_cotistas=100_000,
    )
    resultado = ScoringService(db_session).executar()
    assert resultado["calculados"] == 2
    assert resultado["erros"] == 0


def test_scoring_fundo_sem_alguns_indicadores(db_session):
    """Fundo com indicadores nulos não deve crashar — redistribui pesos."""
    _criar_fundo_com_indicador(
        db_session, "NULL11",
        dy_atual=0.09, p_vp=0.93,
        # vacâncias, liquidez, volatilidade, pl, cotistas = None
    )
    resultado = ScoringService(db_session).executar()
    assert resultado["calculados"] == 1
    assert resultado["erros"] == 0


def test_scoring_nao_processa_fundo_sem_indicadores(db_session):
    fundo = Fundo(ticker="VOID11", segmento="Logística")
    db_session.add(fundo)
    db_session.commit()
    resultado = ScoringService(db_session).executar()
    assert resultado["calculados"] == 0
    assert resultado["sem_dados"] == 1
```

- [ ] **4.2 — Rodar e confirmar FALHA**

```bash
pytest tests/test_scoring_service.py -v 2>&1 | head -20
```

Esperado: `ModuleNotFoundError` ou `ImportError`

- [ ] **4.3 — Criar `backend/app/services/scoring_service.py`**

```python
from __future__ import annotations

import logging
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.fundo import Fundo
from app.models.indicador import Indicador
from app.models.scoring import ScoringHistorico
from app.repositories.fundo_repository import FundoRepository
from app.repositories.indicador_repository import IndicadorRepository

logger = logging.getLogger(__name__)

# ── pesos e dimensões ────────────────────────────────────────────────

PESOS_DEFAULT: dict[str, float] = {
    "dy_atual": 0.20,
    "dy_12m": 0.10,
    "p_vp": 0.15,
    "vacancia_fisica": 0.10,
    "vacancia_financeira": 0.10,
    "liquidez_diaria": 0.10,
    "volatilidade_12m": 0.10,
    "patrimonio_liquido": 0.05,
    "num_cotistas": 0.05,
    "segmento": 0.05,
}

DIMENSOES: dict[str, list[str]] = {
    "Rentabilidade": ["dy_atual", "dy_12m"],
    "Valuation": ["p_vp"],
    "Risco": ["vacancia_fisica", "vacancia_financeira", "liquidez_diaria", "volatilidade_12m"],
    "Estrutura": ["patrimonio_liquido", "num_cotistas", "segmento"],
}


# ── funções de pontuação (1 a 5) ────────────────────────────────────

def pontuar_dy(valor: float) -> int:
    if valor <= 0.06:
        return 1
    if valor <= 0.08:
        return 3
    if valor <= 0.10:
        return 5
    if valor <= 0.12:
        return 4
    return 2


def pontuar_pvp(valor: float) -> int:
    if valor < 0.80:
        return 5
    if valor < 0.95:
        return 4
    if valor < 1.05:
        return 3
    if valor < 1.20:
        return 2
    return 1


def pontuar_vacancia(valor: float) -> int:
    if valor < 0.05:
        return 5
    if valor < 0.10:
        return 4
    if valor < 0.15:
        return 3
    if valor < 0.25:
        return 2
    return 1


def pontuar_liquidez(valor: float) -> int:
    if valor < 100_000:
        return 1
    if valor < 500_000:
        return 2
    if valor < 1_000_000:
        return 3
    if valor < 5_000_000:
        return 4
    return 5


def pontuar_volatilidade(valor: float) -> int:
    if valor < 0.10:
        return 5
    if valor < 0.15:
        return 4
    if valor < 0.20:
        return 3
    if valor < 0.30:
        return 2
    return 1


def pontuar_percentil(valor: float, todos: list[float]) -> int:
    if not todos:
        return 3
    ordenados = sorted(todos)
    n = len(ordenados)
    rank = sum(1 for v in ordenados if v <= valor) / n
    if rank <= 0.20:
        return 1
    if rank <= 0.40:
        return 2
    if rank <= 0.60:
        return 3
    if rank <= 0.80:
        return 4
    return 5


_SEGMENTO_SCORES: dict[str, int] = {
    "Logística": 5,
    "Lajes Corporativas": 4,
    "Shopping": 4,
    "Renda Urbana": 3,
    "Híbrido": 3,
    "Fundo de Fundos": 2,
    "Recebíveis": 2,
}


def pontuar_segmento(segmento: str | None) -> int | None:
    if segmento is None:
        return None
    return _SEGMENTO_SCORES.get(segmento, 3)


def classificar_score(score: float) -> str:
    if score >= 80:
        return "Excelente"
    if score >= 60:
        return "Bom"
    if score >= 40:
        return "Regular"
    return "Evitar"


# ── cálculo do score com redistribuição por dimensão ─────────────────

def _calcular_pontuacoes(
    ind: Indicador,
    fundo: Fundo,
    todos_pl: list[float],
    todos_cotistas: list[float],
) -> dict[str, float | None]:
    p: dict[str, float | None] = {}
    p["dy_atual"] = float(pontuar_dy(ind.dy_atual)) if ind.dy_atual is not None else None
    p["dy_12m"] = float(pontuar_dy(ind.dy_12m)) if ind.dy_12m is not None else None
    p["p_vp"] = float(pontuar_pvp(ind.p_vp)) if ind.p_vp is not None else None
    p["vacancia_fisica"] = float(pontuar_vacancia(ind.vacancia_fisica)) if ind.vacancia_fisica is not None else None
    p["vacancia_financeira"] = float(pontuar_vacancia(ind.vacancia_financeira)) if ind.vacancia_financeira is not None else None
    p["liquidez_diaria"] = float(pontuar_liquidez(ind.liquidez_diaria)) if ind.liquidez_diaria is not None else None
    p["volatilidade_12m"] = float(pontuar_volatilidade(ind.volatilidade_12m)) if ind.volatilidade_12m is not None else None
    p["patrimonio_liquido"] = float(pontuar_percentil(ind.patrimonio_liquido, todos_pl)) if ind.patrimonio_liquido is not None else None
    p["num_cotistas"] = float(pontuar_percentil(float(ind.num_cotistas), todos_cotistas)) if ind.num_cotistas is not None else None
    p["segmento"] = float(v) if (v := pontuar_segmento(fundo.segmento)) is not None else None
    return p


def calcular_score_com_pesos(
    pontuacoes: dict[str, float | None],
    pesos: dict[str, float],
) -> float:
    """Score 0-100 com redistribuição proporcional dentro de cada dimensão."""
    pesos_efetivos: dict[str, float] = {}

    for indicadores_dim in DIMENSOES.values():
        presentes = [k for k in indicadores_dim if pontuacoes.get(k) is not None]
        if not presentes:
            continue
        peso_dim = sum(pesos[k] for k in indicadores_dim)
        peso_presente = sum(pesos[k] for k in presentes)
        for k in presentes:
            pesos_efetivos[k] = pesos[k] * (peso_dim / peso_presente)

    if not pesos_efetivos:
        return 0.0

    peso_total = sum(pesos_efetivos.values())
    score = sum(
        (pesos_efetivos[k] / peso_total) * (pontuacoes[k] / 5.0) * 100  # type: ignore[operator]
        for k in pesos_efetivos
    )
    return round(score, 2)


# ── ScoringService ────────────────────────────────────────────────────

class ScoringService:
    def __init__(self, db: Session, pesos: dict[str, float] | None = None) -> None:
        self._db = db
        self._pesos = pesos or PESOS_DEFAULT
        self._fundos_repo = FundoRepository(db)
        self._ind_repo = IndicadorRepository(db)

    def executar(self) -> dict[str, int]:
        fundos = self._fundos_repo.listar_todos()
        indicadores_recentes = self._ind_repo.listar_mais_recentes_todos()
        ind_por_fundo: dict[int, Indicador] = {i.fundo_id: i for i in indicadores_recentes}

        todos_pl = [i.patrimonio_liquido for i in indicadores_recentes if i.patrimonio_liquido is not None]
        todos_cotistas = [float(i.num_cotistas) for i in indicadores_recentes if i.num_cotistas is not None]

        calculados = erros = sem_dados = 0
        agora = datetime.now()

        for fundo in fundos:
            ind = ind_por_fundo.get(fundo.id)
            if ind is None:
                sem_dados += 1
                continue
            try:
                pontuacoes = _calcular_pontuacoes(ind, fundo, todos_pl, todos_cotistas)
                score = calcular_score_com_pesos(pontuacoes, self._pesos)
                classificacao = classificar_score(score)
                sh = ScoringHistorico(
                    fundo_id=fundo.id,
                    data_execucao=agora,
                    score=score,
                    classificacao=classificacao,
                )
                self._db.add(sh)
                calculados += 1
                logger.info("%s → %.1f (%s)", fundo.ticker, score, classificacao)
            except Exception as e:
                erros += 1
                logger.error("Erro no scoring de %s: %s", fundo.ticker, e)

        self._db.commit()
        return {"calculados": calculados, "erros": erros, "sem_dados": sem_dados}
```

- [ ] **4.4 — Rodar e confirmar PASSA**

```bash
pytest tests/test_scoring_service.py -v
```

Esperado: todos os testes passando

- [ ] **4.5 — Criar `backend/scripts/rodar_scoring.py`**

```python
"""Executa o motor de scoring para todos os FIIs.

Uso:
    cd backend && source .venv/bin/activate
    python -m scripts.rodar_scoring
"""
from __future__ import annotations

import logging
import sys

import app.models  # noqa: F401
from app.database import SessionLocal
from app.services.scoring_service import ScoringService

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s — %(message)s")
logger = logging.getLogger(__name__)


def main() -> None:
    logger.info("Iniciando scoring...")
    with SessionLocal() as db:
        resultado = ScoringService(db).executar()
    logger.info(
        "Scoring: %d calculados, %d sem dados, %d erros",
        resultado["calculados"], resultado["sem_dados"], resultado["erros"],
    )
    sys.exit(0 if resultado["erros"] == 0 else 1)


if __name__ == "__main__":
    main()
```

- [ ] **4.6 — Rodar suite completa**

```bash
pytest tests/ -v
```

Esperado: todos passando

- [ ] **4.7 — Commit**

```bash
git add backend/app/services/scoring_service.py backend/scripts/rodar_scoring.py \
        backend/tests/test_scoring_service.py
git commit -m "feat: implementa ScoringService com redistribuição de pesos por dimensão"
```

---

## Task 5: Clustering Service (TDD)

**Files:**
- Create: `backend/app/services/clustering_service.py`
- Create: `backend/scripts/rodar_clustering.py`
- Create: `backend/tests/test_clustering_service.py`

- [ ] **5.1 — Escrever `backend/tests/test_clustering_service.py`** (RED)

```python
import pytest
import numpy as np
from datetime import date

from app.models.fundo import Fundo
from app.models.indicador import Indicador
from app.services.clustering_service import (
    ClusteringService,
    preparar_features,
    interpretar_cluster,
)


def _criar_fundos_com_indicadores(db_session, n=20):
    """Cria n fundos com indicadores variados para o K-Means ter dados suficientes."""
    rng = np.random.default_rng(42)
    fundos = []
    for i in range(n):
        fundo = Fundo(ticker=f"TS{i:02d}11", segmento="Logística")
        db_session.add(fundo)
        db_session.flush()
        ind = Indicador(
            fundo_id=fundo.id,
            data_referencia=date(2026, 5, 26),
            dy_12m=float(rng.uniform(0.05, 0.15)),
            p_vp=float(rng.uniform(0.70, 1.30)),
            vacancia_fisica=float(rng.uniform(0.0, 0.30)),
            vacancia_financeira=float(rng.uniform(0.0, 0.30)),
            liquidez_diaria=float(rng.uniform(100_000, 50_000_000)),
        )
        db_session.add(ind)
        fundos.append(fundo)
    db_session.commit()
    return fundos


def test_preparar_features_retorna_array(db_session):
    _criar_fundos_com_indicadores(db_session, 10)
    from app.repositories.indicador_repository import IndicadorRepository
    from app.repositories.fundo_repository import FundoRepository
    inds = IndicadorRepository(db_session).listar_mais_recentes_todos()
    fundos = {f.id: f for f in FundoRepository(db_session).listar_todos()}
    X, ids = preparar_features(inds, fundos)
    assert X.shape[0] == 10
    assert X.shape[1] == 4   # dy_12m, p_vp, vacancia_media, log10_liquidez
    assert len(ids) == 10


def test_preparar_features_exclui_fundo_sem_liquidez(db_session):
    fundo = Fundo(ticker="NOLIQU11", segmento="Logística")
    db_session.add(fundo)
    db_session.flush()
    ind = Indicador(
        fundo_id=fundo.id,
        data_referencia=date(2026, 5, 26),
        dy_12m=0.08,
        p_vp=1.0,
        # liquidez_diaria=None → excluído
    )
    db_session.add(ind)
    db_session.commit()
    from app.repositories.indicador_repository import IndicadorRepository
    from app.repositories.fundo_repository import FundoRepository
    inds = IndicadorRepository(db_session).listar_mais_recentes_todos()
    fundos = {f.id: f for f in FundoRepository(db_session).listar_todos()}
    X, ids = preparar_features(inds, fundos)
    assert fundo.id not in ids


def test_clustering_service_cria_4_clusters(db_session):
    _criar_fundos_com_indicadores(db_session, 20)
    resultado = ClusteringService(db_session).executar()
    assert resultado["clusters_criados"] == 4
    assert resultado["fundos_clusterizados"] > 0


def test_interpretar_cluster_conservador():
    # Baixo DY, baixa vacância, alto DY = papel agressivo...
    # Centróide típico de cluster conservador: dy baixo, vol baixa
    nome, perfil = interpretar_cluster(
        dy_medio=0.06, p_vp_medio=1.05, vacancia_media=0.03, log_liq_medio=7.0
    )
    assert isinstance(nome, str)
    assert perfil in {"conservador", "moderado", "arrojado"}
```

- [ ] **5.2 — Rodar e confirmar FALHA**

```bash
pytest tests/test_clustering_service.py -v 2>&1 | head -10
```

Esperado: `ModuleNotFoundError`

- [ ] **5.3 — Criar `backend/app/services/clustering_service.py`**

```python
from __future__ import annotations

import logging
import math
from datetime import date
from pathlib import Path

import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sqlalchemy.orm import Session

from app.models.cluster import Cluster, FundoCluster
from app.models.fundo import Fundo
from app.models.indicador import Indicador
from app.repositories.fundo_repository import FundoRepository
from app.repositories.indicador_repository import IndicadorRepository

logger = logging.getLogger(__name__)

_FIGURES_DIR = Path(__file__).parent.parent.parent / "data" / "figures"


def preparar_features(
    indicadores: list[Indicador],
    fundos: dict[int, Fundo],
) -> tuple[np.ndarray, list[int]]:
    """
    Extrai 4 features para o K-Means:
    [dy_12m, p_vp, vacancia_media, log10(liquidez_diaria)]

    Exclui fundos sem dy_12m, p_vp ou liquidez_diaria (obrigatórios).
    Imputa vacancia_media nula com a mediana dos presentes.
    """
    rows: list[list[float]] = []
    fundo_ids: list[int] = []

    candidatos = []
    for ind in indicadores:
        if ind.dy_12m is None or ind.p_vp is None or ind.liquidez_diaria is None:
            continue
        if ind.liquidez_diaria <= 0:
            continue
        candidatos.append(ind)

    # mediana da vacância para imputação
    vacancias = []
    for ind in candidatos:
        v_f = ind.vacancia_fisica or 0.0
        v_fin = ind.vacancia_financeira or 0.0
        if ind.vacancia_fisica is not None or ind.vacancia_financeira is not None:
            vacancias.append((v_f + v_fin) / 2)
    vacancia_mediana = float(np.median(vacancias)) if vacancias else 0.0

    for ind in candidatos:
        v_f = ind.vacancia_fisica or 0.0
        v_fin = ind.vacancia_financeira or 0.0
        if ind.vacancia_fisica is not None or ind.vacancia_financeira is not None:
            vacancia_media = (v_f + v_fin) / 2
        else:
            vacancia_media = vacancia_mediana

        rows.append([
            ind.dy_12m,
            ind.p_vp,
            vacancia_media,
            math.log10(ind.liquidez_diaria),
        ])
        fundo_ids.append(ind.fundo_id)

    if not rows:
        return np.empty((0, 4)), []

    return np.array(rows, dtype=float), fundo_ids


def interpretar_cluster(
    dy_medio: float,
    p_vp_medio: float,
    vacancia_media: float,
    log_liq_medio: float,
) -> tuple[str, str]:
    """Heurística para nomear e classificar o perfil de risco de um cluster."""
    # Alto DY + alta vacância → papel/agressivo
    if dy_medio > 0.11 or (dy_medio > 0.09 and vacancia_media > 0.10):
        return "Papel Agressivo", "arrojado"
    # Baixo DY + baixa vacância → conservador
    if dy_medio < 0.08 and vacancia_media < 0.08:
        return "Tijolo Conservador", "conservador"
    # P/VP descontado + DY moderado → balanceado
    if p_vp_medio < 0.95 and dy_medio >= 0.08:
        return "Tijolo Balanceado", "moderado"
    return "Híbrido Diversificado", "moderado"


class ClusteringService:
    def __init__(self, db: Session, k: int = 4) -> None:
        self._db = db
        self._k = k
        self._fundos_repo = FundoRepository(db)
        self._ind_repo = IndicadorRepository(db)

    def executar(self) -> dict[str, int]:
        indicadores = self._ind_repo.listar_mais_recentes_todos()
        fundos = {f.id: f for f in self._fundos_repo.listar_todos()}

        X, fundo_ids = preparar_features(indicadores, fundos)

        if len(fundo_ids) < self._k:
            logger.warning("Fundos insuficientes para %d clusters (%d disponíveis)", self._k, len(fundo_ids))
            return {"clusters_criados": 0, "fundos_clusterizados": 0}

        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        kmeans = KMeans(n_clusters=self._k, random_state=42, n_init=10)
        labels = kmeans.fit_predict(X_scaled)

        # Calcular centróides no espaço original
        centroids_orig = scaler.inverse_transform(kmeans.cluster_centers_)

        # Limpar clusters anteriores
        self._db.query(FundoCluster).delete()
        self._db.query(Cluster).delete()
        self._db.flush()

        hoje = date.today()
        cluster_ids: dict[int, int] = {}

        for k_idx in range(self._k):
            mask = labels == k_idx
            membros_idx = [i for i, m in enumerate(mask) if m]

            dy_medio = float(centroids_orig[k_idx, 0])
            p_vp_medio = float(centroids_orig[k_idx, 1])
            vacancia_media = float(centroids_orig[k_idx, 2])
            log_liq = float(centroids_orig[k_idx, 3])

            nome, perfil = interpretar_cluster(dy_medio, p_vp_medio, vacancia_media, log_liq)

            cluster = Cluster(
                nome_interpretado=nome,
                perfil_risco=perfil,
                descricao=f"DY médio: {dy_medio:.1%}, P/VP médio: {p_vp_medio:.2f}, Vacância média: {vacancia_media:.1%}",
                dy_medio=dy_medio,
                volatilidade_media=None,
                p_vp_medio=p_vp_medio,
                num_fiis=len(membros_idx),
            )
            self._db.add(cluster)
            self._db.flush()
            cluster_ids[k_idx] = cluster.id

            for idx in membros_idx:
                fc = FundoCluster(
                    fundo_id=fundo_ids[idx],
                    cluster_id=cluster.id,
                    data_atribuicao=hoje,
                )
                self._db.add(fc)
                ticker = fundos.get(fundo_ids[idx])
                logger.info("  %s → %s", ticker.ticker if ticker else fundo_ids[idx], nome)

        self._db.commit()
        logger.info("Clustering concluído: %d clusters, %d fundos", self._k, len(fundo_ids))

        self._salvar_figuras(X_scaled, labels, kmeans)

        return {"clusters_criados": self._k, "fundos_clusterizados": len(fundo_ids)}

    def _salvar_figuras(self, X_scaled: np.ndarray, labels: np.ndarray, kmeans: KMeans) -> None:
        try:
            import matplotlib
            matplotlib.use("Agg")
            import matplotlib.pyplot as plt

            _FIGURES_DIR.mkdir(parents=True, exist_ok=True)

            # Elbow (inércia por k)
            ks = range(2, 9)
            inercias = [KMeans(n_clusters=k, random_state=42, n_init=10).fit(X_scaled).inertia_ for k in ks]
            fig, ax = plt.subplots()
            ax.plot(list(ks), inercias, "o-")
            ax.set_xlabel("k")
            ax.set_ylabel("Inércia")
            ax.set_title("Método do Cotovelo")
            ax.axvline(x=self._k, color="red", linestyle="--", label=f"k={self._k} escolhido")
            ax.legend()
            fig.savefig(_FIGURES_DIR / "cotovelo.png", dpi=100, bbox_inches="tight")
            plt.close(fig)

            # Scatter dy_12m vs p_vp colorido por cluster
            fig, ax = plt.subplots()
            for k_idx in range(self._k):
                mask = labels == k_idx
                ax.scatter(X_scaled[mask, 0], X_scaled[mask, 1], label=f"Cluster {k_idx}", alpha=0.7)
            ax.set_xlabel("DY 12M (padronizado)")
            ax.set_ylabel("P/VP (padronizado)")
            ax.set_title("Clusters FII — DY vs P/VP")
            ax.legend()
            fig.savefig(_FIGURES_DIR / "clusters_scatter.png", dpi=100, bbox_inches="tight")
            plt.close(fig)

            logger.info("Figuras salvas em %s", _FIGURES_DIR)
        except Exception as e:
            logger.warning("Falha ao salvar figuras: %s", e)
```

- [ ] **5.4 — Rodar e confirmar PASSA**

```bash
pytest tests/test_clustering_service.py -v
```

Esperado: todos os testes passando

- [ ] **5.5 — Criar `backend/scripts/rodar_clustering.py`**

```python
"""Executa K-Means clustering nos FIIs.

Uso:
    cd backend && source .venv/bin/activate
    python -m scripts.rodar_clustering
"""
from __future__ import annotations

import logging
import sys

import app.models  # noqa: F401
from app.database import SessionLocal
from app.services.clustering_service import ClusteringService

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s — %(message)s")
logger = logging.getLogger(__name__)


def main() -> None:
    logger.info("Iniciando clustering K-Means (k=4)...")
    with SessionLocal() as db:
        resultado = ClusteringService(db).executar()
    logger.info(
        "Clustering: %d clusters criados, %d fundos clusterizados",
        resultado["clusters_criados"],
        resultado["fundos_clusterizados"],
    )
    sys.exit(0)


if __name__ == "__main__":
    main()
```

- [ ] **5.6 — Rodar suite completa**

```bash
pytest tests/ -v
```

Esperado: todos passando

- [ ] **5.7 — Commit**

```bash
git add backend/app/services/clustering_service.py backend/scripts/rodar_clustering.py \
        backend/tests/test_clustering_service.py
git commit -m "feat: implementa ClusteringService K-Means k=4 com heurísticas de nomeação"
```

---

## Task 6: FastAPI — main.py e todos os routers

**Files:**
- Create: `backend/app/main.py`
- Create: `backend/app/routers/__init__.py`
- Create: `backend/app/routers/fundos.py`
- Create: `backend/app/routers/ranking.py`
- Create: `backend/app/routers/dashboard.py`
- Create: `backend/app/routers/perfil.py`
- Create: `backend/app/routers/scoring.py`
- Create: `backend/app/routers/clustering.py`

- [ ] **6.1 — Criar `backend/app/routers/__init__.py`** (vazio)

```python
```

- [ ] **6.2 — Criar `backend/app/main.py`**

```python
from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import clustering, dashboard, fundos, perfil, ranking, scoring

logging.basicConfig(level=getattr(logging, settings.log_level))

app = FastAPI(title="FII Insights API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(fundos.router, prefix="/api/v1")
app.include_router(ranking.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(perfil.router, prefix="/api/v1")
app.include_router(scoring.router, prefix="/api/v1")
app.include_router(clustering.router, prefix="/api/v1")


@app.get("/health")
def health():
    return {"status": "ok"}
```

- [ ] **6.3 — Criar `backend/app/routers/fundos.py`**

```python
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.repositories.fundo_repository import FundoRepository
from app.repositories.indicador_repository import IndicadorRepository

router = APIRouter(tags=["fundos"])


class IndicadorOut(BaseModel):
    dy_atual: float | None
    dy_12m: float | None
    p_vp: float | None
    vacancia_fisica: float | None
    vacancia_financeira: float | None
    liquidez_diaria: float | None
    patrimonio_liquido: float | None
    num_cotistas: int | None

    model_config = {"from_attributes": True}


class FundoOut(BaseModel):
    id: int
    ticker: str
    nome: str | None
    segmento: str | None
    gestora: str | None

    model_config = {"from_attributes": True}


class FundoDetalheOut(FundoOut):
    indicador: IndicadorOut | None


@router.get("/fundos", response_model=list[FundoOut])
def listar_fundos(db: Session = Depends(get_db)):
    """Lista todos os FIIs cadastrados."""
    return FundoRepository(db).listar_todos()


@router.get("/fundos/{ticker}", response_model=FundoDetalheOut)
def detalhe_fundo(ticker: str, db: Session = Depends(get_db)):
    """Retorna dados detalhados de um FII pelo ticker."""
    fundo = FundoRepository(db).buscar_por_ticker(ticker.upper())
    if not fundo:
        raise HTTPException(status_code=404, detail=f"Fundo {ticker} não encontrado")
    ind = IndicadorRepository(db).buscar_mais_recente(fundo.id)
    return FundoDetalheOut(
        **FundoOut.model_validate(fundo).model_dump(),
        indicador=IndicadorOut.model_validate(ind) if ind else None,
    )
```

- [ ] **6.4 — Criar `backend/app/routers/ranking.py`**

```python
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.fundo import Fundo
from app.models.scoring import ScoringHistorico

router = APIRouter(tags=["ranking"])


class RankingItemOut(BaseModel):
    ticker: str
    nome: str | None
    segmento: str | None
    score: float
    classificacao: str

    model_config = {"from_attributes": True}


@router.get("/ranking", response_model=list[RankingItemOut])
def listar_ranking(
    busca: str | None = Query(None, description="Filtrar por ticker"),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """Retorna FIIs ordenados por score decrescente (mais recente por fundo)."""
    # Subquery: score mais recente por fundo
    subq = (
        select(ScoringHistorico.fundo_id, func.max(ScoringHistorico.data_execucao).label("max_dt"))
        .group_by(ScoringHistorico.fundo_id)
        .subquery()
    )
    stmt = (
        select(Fundo.ticker, Fundo.nome, Fundo.segmento, ScoringHistorico.score, ScoringHistorico.classificacao)
        .join(ScoringHistorico, Fundo.id == ScoringHistorico.fundo_id)
        .join(subq, (ScoringHistorico.fundo_id == subq.c.fundo_id) & (ScoringHistorico.data_execucao == subq.c.max_dt))
        .order_by(ScoringHistorico.score.desc())
        .offset(offset)
        .limit(limit)
    )
    if busca:
        stmt = stmt.where(Fundo.ticker.ilike(f"%{busca}%"))

    rows = db.execute(stmt).mappings().all()
    return [RankingItemOut(**row) for row in rows]
```

- [ ] **6.5 — Criar `backend/app/routers/dashboard.py`**

```python
from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.fundo import Fundo
from app.models.indicador import Indicador
from app.models.scoring import ScoringHistorico

router = APIRouter(tags=["dashboard"])


class DashboardStatsOut(BaseModel):
    total_fundos: int
    com_dados: int
    score_medio: float | None
    por_classificacao: dict[str, int]
    dy_medio: float | None
    p_vp_medio: float | None


@router.get("/dashboard/stats", response_model=DashboardStatsOut)
def dashboard_stats(db: Session = Depends(get_db)):
    """Estatísticas agregadas para o dashboard."""
    total_fundos = db.scalar(select(func.count()).select_from(Fundo)) or 0

    # Fundos com indicadores
    com_dados = db.scalar(
        select(func.count(func.distinct(Indicador.fundo_id))).select_from(Indicador)
    ) or 0

    # Score médio e por classificação (scores mais recentes)
    subq = (
        select(ScoringHistorico.fundo_id, func.max(ScoringHistorico.data_execucao).label("max_dt"))
        .group_by(ScoringHistorico.fundo_id)
        .subquery()
    )
    scores_recentes = db.execute(
        select(ScoringHistorico.score, ScoringHistorico.classificacao)
        .join(subq, (ScoringHistorico.fundo_id == subq.c.fundo_id) & (ScoringHistorico.data_execucao == subq.c.max_dt))
    ).all()

    score_medio = None
    por_classificacao: dict[str, int] = {"Excelente": 0, "Bom": 0, "Regular": 0, "Evitar": 0}
    if scores_recentes:
        score_medio = round(sum(r.score for r in scores_recentes) / len(scores_recentes), 2)
        for r in scores_recentes:
            por_classificacao[r.classificacao] = por_classificacao.get(r.classificacao, 0) + 1

    # Médias de indicadores
    row = db.execute(
        select(func.avg(Indicador.dy_12m), func.avg(Indicador.p_vp)).select_from(Indicador)
    ).one()
    dy_medio = round(float(row[0]), 4) if row[0] else None
    p_vp_medio = round(float(row[1]), 4) if row[1] else None

    return DashboardStatsOut(
        total_fundos=total_fundos,
        com_dados=com_dados,
        score_medio=score_medio,
        por_classificacao=por_classificacao,
        dy_medio=dy_medio,
        p_vp_medio=p_vp_medio,
    )
```

- [ ] **6.6 — Criar `backend/app/routers/perfil.py`**

```python
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.perfil import PerfilInvestidor

router = APIRouter(tags=["perfil"])

_PERFIL_ID = "perfil-unico"  # sistema mono-usuário, ID fixo


class PerfilOut(BaseModel):
    id: str
    tipo: str
    pesos_personalizados: dict | None

    model_config = {"from_attributes": True}


class PerfilUpdate(BaseModel):
    tipo: str
    pesos_personalizados: dict | None = None


def _get_ou_criar_perfil(db: Session) -> PerfilInvestidor:
    perfil = db.scalar(select(PerfilInvestidor).where(PerfilInvestidor.id == _PERFIL_ID))
    if not perfil:
        perfil = PerfilInvestidor(id=_PERFIL_ID, tipo="moderado")
        db.add(perfil)
        db.commit()
        db.refresh(perfil)
    return perfil


@router.get("/perfil", response_model=PerfilOut)
def get_perfil(db: Session = Depends(get_db)):
    """Retorna o perfil do investidor."""
    return _get_ou_criar_perfil(db)


@router.put("/perfil", response_model=PerfilOut)
def update_perfil(body: PerfilUpdate, db: Session = Depends(get_db)):
    """Atualiza tipo e pesos personalizados do perfil."""
    perfil = _get_ou_criar_perfil(db)
    perfil.tipo = body.tipo
    perfil.pesos_personalizados = body.pesos_personalizados
    db.commit()
    db.refresh(perfil)
    return perfil
```

- [ ] **6.7 — Criar `backend/app/routers/scoring.py`**

```python
from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.scoring_service import ScoringService

router = APIRouter(tags=["scoring"])


class ScoringResultadoOut(BaseModel):
    calculados: int
    erros: int
    sem_dados: int


@router.post("/scoring/executar", response_model=ScoringResultadoOut)
def executar_scoring(db: Session = Depends(get_db)):
    """Executa o scoring multicritério para todos os FIIs com indicadores."""
    resultado = ScoringService(db).executar()
    return ScoringResultadoOut(**resultado)
```

- [ ] **6.8 — Criar `backend/app/routers/clustering.py`**

```python
from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.cluster import Cluster, FundoCluster
from app.models.fundo import Fundo
from app.services.clustering_service import ClusteringService

router = APIRouter(tags=["clustering"])


class ClusterItemOut(BaseModel):
    id: int
    nome_interpretado: str
    perfil_risco: str
    descricao: str | None
    dy_medio: float | None
    p_vp_medio: float | None
    num_fiis: int
    tickers: list[str]


class ClusteringResultadoOut(BaseModel):
    clusters_criados: int
    fundos_clusterizados: int


@router.get("/clusters", response_model=list[ClusterItemOut])
def listar_clusters(db: Session = Depends(get_db)):
    """Lista os clusters com os tickers de cada um."""
    clusters = db.scalars(select(Cluster)).all()
    resultado = []
    for cluster in clusters:
        tickers = db.scalars(
            select(Fundo.ticker)
            .join(FundoCluster, Fundo.id == FundoCluster.fundo_id)
            .where(FundoCluster.cluster_id == cluster.id)
            .order_by(Fundo.ticker)
        ).all()
        resultado.append(
            ClusterItemOut(
                id=cluster.id,
                nome_interpretado=cluster.nome_interpretado,
                perfil_risco=cluster.perfil_risco,
                descricao=cluster.descricao,
                dy_medio=cluster.dy_medio,
                p_vp_medio=cluster.p_vp_medio,
                num_fiis=cluster.num_fiis,
                tickers=list(tickers),
            )
        )
    return resultado


@router.post("/clustering/executar", response_model=ClusteringResultadoOut)
def executar_clustering(db: Session = Depends(get_db)):
    """Executa K-Means clustering nos FIIs com dados coletados."""
    resultado = ClusteringService(db).executar()
    return ClusteringResultadoOut(**resultado)
```

- [ ] **6.9 — Testar API manualmente**

```bash
cd /home/hiago/projetos/fii-insights/backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000 &
sleep 3
curl -s http://localhost:8000/health | python3 -m json.tool
curl -s http://localhost:8000/api/v1/fundos | python3 -m json.tool | head -30
curl -s http://localhost:8000/api/v1/dashboard/stats | python3 -m json.tool
```

Esperado: `/health` retorna `{"status": "ok"}`, `/fundos` lista os 50 FIIs.

- [ ] **6.10 — Parar uvicorn e commitar**

```bash
pkill -f "uvicorn app.main" 2>/dev/null || true
git add backend/app/main.py backend/app/routers/
git commit -m "feat: adiciona FastAPI com routers fundos, ranking, dashboard, perfil, scoring e clustering"
```

---

## Task 7: Execução real — coletar, score e clustering

> **Este task usa o banco de produção real (`data/fii_insights.db`). Executar após os Tasks 1-6.**

- [ ] **7.1 — Coletar dados reais**

```bash
cd /home/hiago/projetos/fii-insights/backend
source .venv/bin/activate
python -m scripts.coletar_dados
```

Esperado: logs de coleta. Mínimo 25 FIIs coletados para prosseguir (alguns podem falhar com 403/429).

- [ ] **7.2 — Verificar indicadores no banco**

```bash
python3 -c "
import sqlite3
conn = sqlite3.connect('data/fii_insights.db')
c = conn.cursor()
n = c.execute('SELECT COUNT(*) FROM indicadores').fetchone()[0]
print(f'Indicadores: {n}')
pvp = c.execute('SELECT COUNT(*) FROM indicadores WHERE p_vp IS NOT NULL').fetchone()[0]
dy = c.execute('SELECT COUNT(*) FROM indicadores WHERE dy_12m IS NOT NULL').fetchone()[0]
liq = c.execute('SELECT COUNT(*) FROM indicadores WHERE liquidez_diaria IS NOT NULL').fetchone()[0]
print(f'  com P/VP: {pvp}')
print(f'  com DY 12M: {dy}')
print(f'  com liquidez: {liq}')
conn.close()
"
```

Esperado: `Indicadores: N` onde N ≥ 25.

- [ ] **7.3 — Rodar scoring**

```bash
python -m scripts.rodar_scoring
```

Esperado: logs com tickers e classificações.

- [ ] **7.4 — Rodar clustering**

```bash
python -m scripts.rodar_clustering
```

Esperado: `4 clusters criados, N fundos clusterizados`

- [ ] **7.5 — Verificar API com dados reais**

```bash
uvicorn app.main:app --port 8000 &
sleep 3
curl -s http://localhost:8000/api/v1/ranking | python3 -m json.tool | head -40
curl -s http://localhost:8000/api/v1/dashboard/stats | python3 -m json.tool
curl -s http://localhost:8000/api/v1/clusters | python3 -m json.tool
pkill -f "uvicorn app.main" 2>/dev/null || true
```

Esperado: ranking retorna FIIs com score, stats retorna totais reais, clusters mostra 4 grupos com tickers.

- [ ] **7.6 — Rodar suite completa de testes**

```bash
pytest tests/ -v
```

Esperado: todos os testes passando.

- [ ] **7.7 — ruff e commit final**

```bash
ruff check . --fix
git add backend/
git commit -m "feat: backend completo — coleta real, scoring e clustering com dados de produção"
```

---

## Definição de Pronto

| Critério | Verificado |
|---|---|
| `pytest tests/ -v` → 100% passing | [ ] |
| `python -m scripts.coletar_dados` → ≥ 25 FIIs coletados | [ ] |
| `python -m scripts.rodar_scoring` → scoring_historico populado | [ ] |
| `python -m scripts.rodar_clustering` → 4 clusters + fundos atribuídos | [ ] |
| `GET /api/v1/ranking` → FIIs com score real | [ ] |
| `GET /api/v1/dashboard/stats` → stats reais | [ ] |
| `GET /api/v1/clusters` → 4 clusters com tickers | [ ] |
| `GET /api/v1/fundos/{ticker}` → detalhe de um FII | [ ] |
