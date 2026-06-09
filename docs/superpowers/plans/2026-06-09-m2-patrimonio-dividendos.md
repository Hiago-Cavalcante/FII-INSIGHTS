# M2 — Patrimônio & Dividendos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Coletar o histórico de proventos dos fundos (Status Invest) e expor uma projeção de renda mensal da carteira do usuário, com sub-aba Dividendos na Carteira e mini-card na Início.

**Architecture:** Proventos são dado de catálogo (tabela `proventos`, FK → `fundos`). Coleta manual via script, reaproveitando `StatusInvestClient.buscar_proventos`. Um serviço calcula a renda mensal estimada por fundo = média (12m, só `rendimento`) × quantidade. Endpoints autenticados em `/carteira/dividendos`; histórico por fundo em `/fundos/{ticker}/proventos`. Front consome via TanStack Query.

**Tech Stack:** FastAPI · SQLAlchemy 2.0 + Alembic · pytest · React + TypeScript · TanStack Query · Recharts · Vitest.

**Spec:** `docs/superpowers/specs/2026-06-09-m2-patrimonio-dividendos-design.md`

**Schema real do endpoint de proventos (capturado de HGLG11):**
```json
{ "assetEarningsModels": [
  {"ed":"29/05/2026","pd":"15/06/2026","et":"Rendimento","etd":"Rendimento","v":1.1,"sv":"1,10000000","adj":false}
]}
```
`ed` = data-com (dd/MM/yyyy) · `pd` = data-pagamento (dd/MM/yyyy, pode ser "-") · `et`/`etd` = tipo · `v` = valor/cota (float).

---

## Task 1: `parse_proventos` + fixture real

**Files:**
- Create: `backend/tests/fixtures/proventos_hglg11.json`
- Modify: `backend/app/utils/parsers/status_invest_json.py`
- Test: `backend/tests/test_status_invest_json.py` (acrescentar)

- [ ] **Step 1: Criar o fixture real** (trecho representativo, inclui rendimento, amortização sintética e pagamento sem data)

Create `backend/tests/fixtures/proventos_hglg11.json`:
```json
{
  "assetEarningsModels": [
    {"ed": "29/05/2026", "pd": "15/06/2026", "et": "Rendimento", "etd": "Rendimento", "v": 1.1, "sv": "1,10000000", "adj": false},
    {"ed": "30/04/2026", "pd": "15/05/2026", "et": "Rendimento", "etd": "Rendimento", "v": 1.0, "sv": "1,00000000", "adj": false},
    {"ed": "31/03/2026", "pd": "-", "et": "Amortização", "etd": "Amortização", "v": 0.5, "sv": "0,50000000", "adj": false},
    {"ed": "", "pd": "", "et": "Rendimento", "etd": "Rendimento", "v": 0.9, "sv": "0,90000000", "adj": false}
  ]
}
```

- [ ] **Step 2: Escrever o teste que falha**

Acrescentar em `backend/tests/test_status_invest_json.py`:
```python
import json
from datetime import date
from pathlib import Path

from app.utils.parsers.status_invest_json import parse_proventos

_FIXT = Path(__file__).parent / "fixtures" / "proventos_hglg11.json"


def test_parse_proventos_extrai_campos():
    payload = json.loads(_FIXT.read_text(encoding="utf-8"))
    itens = parse_proventos(payload)
    # 3 itens válidos: o de "ed" vazio é descartado
    assert len(itens) == 3
    primeiro = itens[0]
    assert primeiro["data_com"] == date(2026, 5, 29)
    assert primeiro["data_pagamento"] == date(2026, 6, 15)
    assert primeiro["valor_por_cota"] == 1.1
    assert primeiro["tipo"] == "rendimento"


def test_parse_proventos_normaliza_tipo_e_pagamento_nulo():
    payload = json.loads(_FIXT.read_text(encoding="utf-8"))
    amortizacao = parse_proventos(payload)[2]
    assert amortizacao["tipo"] == "amortizacao"
    assert amortizacao["data_pagamento"] is None


def test_parse_proventos_vazio():
    assert parse_proventos({}) == []
    assert parse_proventos({"assetEarningsModels": []}) == []
```

- [ ] **Step 3: Rodar o teste e ver falhar**

Run: `cd backend && .venv/bin/python -m pytest tests/test_status_invest_json.py -k proventos -v`
Expected: FAIL — `ImportError: cannot import name 'parse_proventos'`

- [ ] **Step 4: Implementar `parse_proventos`**

Acrescentar ao final de `backend/app/utils/parsers/status_invest_json.py`:
```python
from datetime import date, datetime


def _parse_data_br(valor: Any) -> date | None:
    """Converte 'dd/mm/aaaa' em date. Retorna None para vazio ou '-'."""
    s = (valor or "").strip() if isinstance(valor, str) else ""
    if not s or s == "-":
        return None
    return datetime.strptime(s, "%d/%m/%Y").date()


def _normalizar_tipo(et: Any) -> str:
    """Mapeia o tipo do provento para o vocabulário interno."""
    t = (et or "").strip().lower() if isinstance(et, str) else ""
    if "amortiz" in t:
        return "amortizacao"
    if "jcp" in t or "juros" in t:
        return "jcp"
    return "rendimento"


def parse_proventos(payload: Any) -> list[dict[str, Any]]:
    """Normaliza o JSON de `companytickerprovents` em itens de provento.

    Descarta itens sem data-com (`ed`) ou sem valor (`v`).
    """
    modelos = payload.get("assetEarningsModels", []) if isinstance(payload, dict) else []
    itens: list[dict[str, Any]] = []
    for m in modelos:
        data_com = _parse_data_br(m.get("ed"))
        valor = m.get("v")
        if data_com is None or valor is None:
            continue
        itens.append(
            {
                "data_com": data_com,
                "data_pagamento": _parse_data_br(m.get("pd")),
                "valor_por_cota": float(valor),
                "tipo": _normalizar_tipo(m.get("et") or m.get("etd")),
            }
        )
    return itens
```

- [ ] **Step 5: Rodar o teste e ver passar**

Run: `cd backend && .venv/bin/python -m pytest tests/test_status_invest_json.py -k proventos -v`
Expected: PASS (3)

- [ ] **Step 6: Commit**

```bash
git add backend/app/utils/parsers/status_invest_json.py backend/tests/test_status_invest_json.py backend/tests/fixtures/proventos_hglg11.json
git commit -m "feat(proventos): parser do JSON de proventos da Status Invest (RF-21)"
```

---

## Task 2: Modelo `Provento` + registro + migração

**Files:**
- Create: `backend/app/models/provento.py`
- Modify: `backend/app/models/__init__.py`
- Test: `backend/tests/test_models.py` (acrescentar)

- [ ] **Step 1: Escrever o teste que falha**

Acrescentar em `backend/tests/test_models.py`:
```python
from datetime import date
from decimal import Decimal

from app.models.fundo import Fundo
from app.models.provento import Provento


def test_provento_persiste_e_relaciona_fundo(db_session):
    f = Fundo(ticker="HGLG11", nome="CSHG Log", classe="FII")
    db_session.add(f)
    db_session.flush()
    p = Provento(
        fundo_id=f.id,
        data_com=date(2026, 5, 29),
        data_pagamento=date(2026, 6, 15),
        valor_por_cota=Decimal("1.10"),
        tipo="rendimento",
    )
    db_session.add(p)
    db_session.commit()
    db_session.refresh(p)
    assert p.id is not None
    assert p.fundo.ticker == "HGLG11"
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `cd backend && .venv/bin/python -m pytest tests/test_models.py -k provento -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.models.provento'`

- [ ] **Step 3: Criar o modelo**

Create `backend/app/models/provento.py`:
```python
from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.fundo import Fundo


class Provento(Base):
    """Provento (rendimento/amortização/JCP) pago por um fundo numa data-com."""

    __tablename__ = "proventos"
    __table_args__ = (UniqueConstraint("fundo_id", "data_com", "tipo"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    fundo_id: Mapped[int] = mapped_column(ForeignKey("fundos.id"), nullable=False, index=True)
    data_com: Mapped[date] = mapped_column(Date, nullable=False)
    data_pagamento: Mapped[date | None] = mapped_column(Date)
    valor_por_cota: Mapped[Decimal] = mapped_column(Numeric(12, 6), nullable=False)
    tipo: Mapped[str] = mapped_column(String(20), nullable=False)

    fundo: Mapped[Fundo] = relationship()
```

- [ ] **Step 4: Registrar o modelo no Base**

Modify `backend/app/models/__init__.py` — adicionar import e entrada em `__all__`:
```python
from app.models.provento import Provento
```
```python
    "Provento",
```

- [ ] **Step 5: Rodar o teste e ver passar**

Run: `cd backend && .venv/bin/python -m pytest tests/test_models.py -k provento -v`
Expected: PASS (1)

- [ ] **Step 6: Gerar e aplicar a migração**

Run:
```bash
cd backend && .venv/bin/alembic revision --autogenerate -m "adiciona tabela proventos" && .venv/bin/alembic upgrade head
```
Expected: nova revisão criada em `migrations/versions/` com `op.create_table("proventos", ...)`; `upgrade head` sem erros.

- [ ] **Step 7: Commit**

```bash
git add backend/app/models/provento.py backend/app/models/__init__.py backend/tests/test_models.py backend/migrations/versions/
git commit -m "feat(proventos): modelo Provento + migração (RF-21)"
```

---

## Task 3: `ProventoRepository` (upsert idempotente)

**Files:**
- Create: `backend/app/repositories/provento_repository.py`
- Test: `backend/tests/test_provento_repository.py`

- [ ] **Step 1: Escrever o teste que falha**

Create `backend/tests/test_provento_repository.py`:
```python
from datetime import date
from decimal import Decimal

from app.models.fundo import Fundo
from app.repositories.provento_repository import ProventoRepository


def _fundo(db) -> int:
    f = Fundo(ticker="HGLG11", nome="CSHG Log", classe="FII")
    db.add(f)
    db.flush()
    return f.id


def test_upsert_cria_e_atualiza_sem_duplicar(db_session):
    repo = ProventoRepository(db_session)
    fid = _fundo(db_session)
    repo.upsert(fundo_id=fid, data_com=date(2026, 5, 29), tipo="rendimento",
                data_pagamento=date(2026, 6, 15), valor_por_cota=Decimal("1.10"))
    # mesma chave (fundo, data_com, tipo) → atualiza, não duplica
    repo.upsert(fundo_id=fid, data_com=date(2026, 5, 29), tipo="rendimento",
                data_pagamento=date(2026, 6, 16), valor_por_cota=Decimal("1.20"))
    proventos = repo.listar_por_fundo(fid)
    assert len(proventos) == 1
    assert proventos[0].valor_por_cota == Decimal("1.20")
    assert proventos[0].data_pagamento == date(2026, 6, 16)


def test_listar_por_fundo_ordena_por_data_com_desc(db_session):
    repo = ProventoRepository(db_session)
    fid = _fundo(db_session)
    repo.upsert(fundo_id=fid, data_com=date(2026, 4, 30), tipo="rendimento",
                data_pagamento=date(2026, 5, 15), valor_por_cota=Decimal("1.00"))
    repo.upsert(fundo_id=fid, data_com=date(2026, 5, 29), tipo="rendimento",
                data_pagamento=date(2026, 6, 15), valor_por_cota=Decimal("1.10"))
    datas = [p.data_com for p in repo.listar_por_fundo(fid)]
    assert datas == [date(2026, 5, 29), date(2026, 4, 30)]
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `cd backend && .venv/bin/python -m pytest tests/test_provento_repository.py -v`
Expected: FAIL — `ModuleNotFoundError: app.repositories.provento_repository`

- [ ] **Step 3: Implementar o repositório**

Create `backend/app/repositories/provento_repository.py`:
```python
from __future__ import annotations

from datetime import date
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.provento import Provento


class ProventoRepository:
    """Repositório de proventos por fundo (dado de catálogo)."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def upsert(
        self,
        fundo_id: int,
        data_com: date,
        tipo: str,
        data_pagamento: date | None,
        valor_por_cota: Decimal,
    ) -> Provento:
        """Insere ou atualiza pela chave (fundo_id, data_com, tipo) — idempotente."""
        stmt = select(Provento).where(
            Provento.fundo_id == fundo_id,
            Provento.data_com == data_com,
            Provento.tipo == tipo,
        )
        provento = self.db.scalar(stmt)
        if provento is None:
            provento = Provento(
                fundo_id=fundo_id,
                data_com=data_com,
                tipo=tipo,
                data_pagamento=data_pagamento,
                valor_por_cota=valor_por_cota,
            )
            self.db.add(provento)
        else:
            provento.data_pagamento = data_pagamento
            provento.valor_por_cota = valor_por_cota
        self.db.commit()
        self.db.refresh(provento)
        return provento

    def listar_por_fundo(self, fundo_id: int) -> list[Provento]:
        """Proventos de um fundo, mais recentes primeiro."""
        stmt = select(Provento).where(Provento.fundo_id == fundo_id).order_by(Provento.data_com.desc())
        return list(self.db.scalars(stmt))
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `cd backend && .venv/bin/python -m pytest tests/test_provento_repository.py -v`
Expected: PASS (2)

- [ ] **Step 5: Commit**

```bash
git add backend/app/repositories/provento_repository.py backend/tests/test_provento_repository.py
git commit -m "feat(proventos): ProventoRepository com upsert idempotente (RF-21)"
```

---

## Task 4: Serviço + script de coleta de proventos

**Files:**
- Create: `backend/app/services/coleta_proventos.py`
- Create: `backend/scripts/coletar_proventos.py`
- Test: `backend/tests/test_coleta_proventos.py`

- [ ] **Step 1: Escrever o teste que falha** (client fake, sem rede)

Create `backend/tests/test_coleta_proventos.py`:
```python
from app.models.fundo import Fundo
from app.repositories.provento_repository import ProventoRepository
from app.services.coleta_proventos import ColetaProventosService

_PAYLOAD = {
    "assetEarningsModels": [
        {"ed": "29/05/2026", "pd": "15/06/2026", "et": "Rendimento", "v": 1.1},
        {"ed": "30/04/2026", "pd": "15/05/2026", "et": "Rendimento", "v": 1.0},
    ]
}


class _ClientFake:
    def buscar_proventos(self, ticker: str):
        return _PAYLOAD


def test_coletar_todos_persiste_proventos(db_session):
    f = Fundo(ticker="HGLG11", nome="CSHG Log", classe="FII")
    db_session.add(f)
    db_session.commit()

    res = ColetaProventosService(db_session, client=_ClientFake()).coletar_todos()

    assert res.coletados == 1
    assert res.proventos == 2
    assert res.falhas == 0
    assert len(ProventoRepository(db_session).listar_por_fundo(f.id)) == 2
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `cd backend && .venv/bin/python -m pytest tests/test_coleta_proventos.py -v`
Expected: FAIL — `ModuleNotFoundError: app.services.coleta_proventos`

- [ ] **Step 3: Implementar o serviço**

Create `backend/app/services/coleta_proventos.py`:
```python
from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from decimal import Decimal

from sqlalchemy.orm import Session

from app.repositories.fundo_repository import FundoRepository
from app.repositories.provento_repository import ProventoRepository
from app.utils.parsers.status_invest_json import parse_proventos
from app.utils.status_invest_client import StatusInvestClient

logger = logging.getLogger(__name__)

_DELAY = 0.3


@dataclass
class ColetaProventosResultado:
    coletados: int = 0
    proventos: int = 0
    falhas: int = 0
    erros: list[tuple[str, str]] = field(default_factory=list)


class ColetaProventosService:
    """Coleta o histórico de proventos de todo o catálogo via Status Invest."""

    def __init__(self, db: Session, client: StatusInvestClient | None = None) -> None:
        self._db = db
        self._fundos = FundoRepository(db)
        self._repo = ProventoRepository(db)
        self._client = client or StatusInvestClient()

    def coletar_todos(self) -> ColetaProventosResultado:
        resultado = ColetaProventosResultado()
        fundos = self._fundos.listar_todos()
        for i, fundo in enumerate(fundos):
            if i > 0:
                time.sleep(_DELAY)
            try:
                itens = parse_proventos(self._client.buscar_proventos(fundo.ticker))
                for it in itens:
                    self._repo.upsert(
                        fundo_id=fundo.id,
                        data_com=it["data_com"],
                        tipo=it["tipo"],
                        data_pagamento=it["data_pagamento"],
                        valor_por_cota=Decimal(str(it["valor_por_cota"])),
                    )
                resultado.coletados += 1
                resultado.proventos += len(itens)
                logger.info("Proventos coletados: %s (%d)", fundo.ticker, len(itens))
            except Exception as e:  # noqa: BLE001 — registra e segue para o próximo fundo
                resultado.falhas += 1
                resultado.erros.append((fundo.ticker, str(e)))
                logger.warning("Falha proventos %s: %s", fundo.ticker, e)
        return resultado
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `cd backend && .venv/bin/python -m pytest tests/test_coleta_proventos.py -v`
Expected: PASS (1)

- [ ] **Step 5: Criar o script de coleta** (mesmo padrão de `coletar_dados.py`)

Create `backend/scripts/coletar_proventos.py`:
```python
"""Coleta o histórico de proventos dos fundos via Status Invest.

Uso:
    cd backend && source .venv/bin/activate
    python -m scripts.coletar_proventos
"""

from __future__ import annotations

import logging
import sys

import app.models  # noqa: F401
from app.database import SessionLocal
from app.services.coleta_proventos import ColetaProventosService

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s — %(message)s")
logger = logging.getLogger(__name__)


def main() -> None:
    logger.info("Iniciando coleta de proventos...")
    with SessionLocal() as db:
        resultado = ColetaProventosService(db).coletar_todos()
    logger.info(
        "Proventos: %d fundos, %d proventos, %d falhas",
        resultado.coletados,
        resultado.proventos,
        resultado.falhas,
    )
    for ticker, msg in resultado.erros:
        logger.warning("  %s: %s", ticker, msg)
    sys.exit(0 if resultado.falhas == 0 else 1)


if __name__ == "__main__":
    main()
```

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/coleta_proventos.py backend/scripts/coletar_proventos.py backend/tests/test_coleta_proventos.py
git commit -m "feat(proventos): serviço e script de coleta de proventos (RF-21)"
```

---

## Task 5: `dividendos_service` — projeção de renda (núcleo do M2)

**Files:**
- Create: `backend/app/services/dividendos_service.py`
- Test: `backend/tests/test_dividendos_service.py`

- [ ] **Step 1: Escrever o teste que falha**

Create `backend/tests/test_dividendos_service.py`:
```python
from datetime import date, timedelta
from decimal import Decimal

from app.models.fundo import Fundo
from app.models.posicao import Posicao
from app.models.provento import Provento
from app.services.dividendos_service import calcular_dividendos

HOJE = date(2026, 6, 1)


def _fundo(db, ticker: str, classe: str = "FII") -> int:
    f = Fundo(ticker=ticker, nome=ticker, classe=classe)
    db.add(f)
    db.flush()
    return f.id


def test_renda_mensal_media_12m_so_rendimento(db_session):
    fid = _fundo(db_session, "HGLG11")
    db_session.add(Posicao(usuario_id=1, fundo_id=fid, quantidade=10,
                           preco_medio=Decimal("100.00"), valor_investido=Decimal("1000.00")))
    # dois rendimentos na janela: média (1.0 + 1.2)/2 = 1.1 → ×10 = 11.00
    db_session.add(Provento(fundo_id=fid, data_com=HOJE - timedelta(days=40), tipo="rendimento",
                            data_pagamento=HOJE - timedelta(days=30), valor_por_cota=Decimal("1.0")))
    db_session.add(Provento(fundo_id=fid, data_com=HOJE - timedelta(days=10), tipo="rendimento",
                            data_pagamento=HOJE - timedelta(days=5), valor_por_cota=Decimal("1.2")))
    # amortização é ignorada
    db_session.add(Provento(fundo_id=fid, data_com=HOJE - timedelta(days=12), tipo="amortizacao",
                            data_pagamento=HOJE - timedelta(days=6), valor_por_cota=Decimal("5.0")))
    # rendimento antigo (fora dos 12m) é ignorado
    db_session.add(Provento(fundo_id=fid, data_com=HOJE - timedelta(days=500), tipo="rendimento",
                            data_pagamento=HOJE - timedelta(days=490), valor_por_cota=Decimal("9.9")))
    db_session.commit()

    r = calcular_dividendos(db_session, usuario_id=1, hoje=HOJE)
    assert r["renda_mensal"] == Decimal("11.00")
    assert r["renda_anual"] == Decimal("132.00")
    assert r["yield_on_cost"] == 0.132  # 132 / 1000
    assert r["por_fundo"][0]["ticker"] == "HGLG11"
    assert r["por_fundo"][0]["sem_dados"] is False
    assert r["por_fundo"][0]["percentual"] == 1.0


def test_fundo_sem_proventos_marca_sem_dados(db_session):
    fid = _fundo(db_session, "XPML11")
    db_session.add(Posicao(usuario_id=1, fundo_id=fid, quantidade=5,
                           preco_medio=Decimal("100.00"), valor_investido=Decimal("500.00")))
    db_session.commit()
    r = calcular_dividendos(db_session, usuario_id=1, hoje=HOJE)
    assert r["renda_mensal"] == Decimal("0.00")
    assert r["por_fundo"][0]["sem_dados"] is True


def test_carteira_vazia(db_session):
    r = calcular_dividendos(db_session, usuario_id=999, hoje=HOJE)
    assert r["renda_mensal"] == Decimal("0.00")
    assert r["renda_anual"] == Decimal("0.00")
    assert r["yield_on_cost"] is None
    assert r["por_fundo"] == []
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `cd backend && .venv/bin/python -m pytest tests/test_dividendos_service.py -v`
Expected: FAIL — `ModuleNotFoundError: app.services.dividendos_service`

- [ ] **Step 3: Implementar o serviço**

Create `backend/app/services/dividendos_service.py`:
```python
from __future__ import annotations

from datetime import date, timedelta
from decimal import ROUND_HALF_UP, Decimal
from typing import TypedDict

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.posicao import Posicao
from app.models.provento import Provento

_CENTAVO = Decimal("0.01")


class FundoRenda(TypedDict):
    ticker: str
    renda_mensal: Decimal
    percentual: float
    sem_dados: bool


class Dividendos(TypedDict):
    renda_mensal: Decimal
    renda_anual: Decimal
    yield_on_cost: float | None
    por_fundo: list[FundoRenda]


def _arredondar(valor: Decimal) -> Decimal:
    return valor.quantize(_CENTAVO, rounding=ROUND_HALF_UP)


def calcular_dividendos(db: Session, usuario_id: int, hoje: date | None = None) -> Dividendos:
    """Projeta a renda mensal estimada da carteira (média 12m, só rendimentos).

    renda_mensal_fundo = média(valor_por_cota dos rendimentos pagos nos
    últimos 12 meses) × quantidade. Fundo sem rendimentos → 0 e sem_dados=True.
    """
    hoje = hoje or date.today()
    inicio = hoje - timedelta(days=365)
    posicoes = list(db.scalars(select(Posicao).where(Posicao.usuario_id == usuario_id).order_by(Posicao.id)))

    total_investido = Decimal("0.00")
    renda_total = Decimal("0.00")
    parciais: list[tuple[str, Decimal, bool]] = []

    for p in posicoes:
        total_investido += p.valor_investido
        valores = list(
            db.scalars(
                select(Provento.valor_por_cota).where(
                    Provento.fundo_id == p.fundo_id,
                    Provento.tipo == "rendimento",
                    Provento.data_pagamento.is_not(None),
                    Provento.data_pagamento >= inicio,
                    Provento.data_pagamento <= hoje,
                )
            )
        )
        if valores:
            media = sum(valores, Decimal("0")) / Decimal(len(valores))
            renda_fundo = _arredondar(media * Decimal(p.quantidade))
            sem_dados = False
        else:
            renda_fundo = Decimal("0.00")
            sem_dados = True
        renda_total += renda_fundo
        parciais.append((p.fundo.ticker, renda_fundo, sem_dados))

    parciais.sort(key=lambda t: t[1], reverse=True)  # "quem paga mais" primeiro
    por_fundo: list[FundoRenda] = [
        {
            "ticker": ticker,
            "renda_mensal": renda_fundo,
            "percentual": round(float(renda_fundo / renda_total), 4) if renda_total > 0 else 0.0,
            "sem_dados": sem_dados,
        }
        for ticker, renda_fundo, sem_dados in parciais
    ]

    renda_anual = _arredondar(renda_total * 12)
    yield_on_cost = round(float(renda_anual / total_investido), 4) if total_investido > 0 else None

    return {
        "renda_mensal": _arredondar(renda_total),
        "renda_anual": renda_anual,
        "yield_on_cost": yield_on_cost,
        "por_fundo": por_fundo,
    }
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `cd backend && .venv/bin/python -m pytest tests/test_dividendos_service.py -v`
Expected: PASS (3)

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/dividendos_service.py backend/tests/test_dividendos_service.py
git commit -m "feat(dividendos): serviço de projeção de renda mensal (média 12m) (RF-23)"
```

---

## Task 6: Endpoint `GET /carteira/dividendos`

**Files:**
- Modify: `backend/app/routers/carteira.py`
- Modify: `backend/tests/conftest.py` (semear proventos na fixture `client_carteira`)
- Test: `backend/tests/test_carteira_router.py` (acrescentar)

- [ ] **Step 1: Semear proventos na fixture** (datas relativas a hoje p/ caírem na janela 12m)

Modify `backend/tests/conftest.py` — no topo, garantir imports:
```python
from datetime import date, timedelta
from decimal import Decimal

from app.models.provento import Provento
```
Dentro da fixture `client_carteira`, logo após o `db.commit()` que cria os fundos, acrescentar (precisamos do id de HGLG11):
```python
    with SessionTest() as db:
        hglg = db.scalar(select(Fundo).where(Fundo.ticker == "HGLG11"))
        hoje = date.today()
        db.add_all([
            Provento(fundo_id=hglg.id, data_com=hoje - timedelta(days=40), tipo="rendimento",
                     data_pagamento=hoje - timedelta(days=30), valor_por_cota=Decimal("1.0")),
            Provento(fundo_id=hglg.id, data_com=hoje - timedelta(days=10), tipo="rendimento",
                     data_pagamento=hoje - timedelta(days=5), valor_por_cota=Decimal("1.2")),
        ])
        db.commit()
```
Garantir que `select` está importado no conftest (já é usado? se não): `from sqlalchemy import create_engine, select`.

- [ ] **Step 2: Escrever o teste que falha**

Acrescentar em `backend/tests/test_carteira_router.py`:
```python
def test_dividendos_projeta_renda(client_carteira):
    client, novo_usuario = client_carteira
    h = novo_usuario()
    client.post("/api/v1/carteira/posicoes", json={"ticker": "HGLG11", "quantidade": 10, "preco": "100.00"}, headers=h)
    r = client.get("/api/v1/carteira/dividendos", headers=h)
    assert r.status_code == 200
    body = r.json()
    # média (1.0 + 1.2)/2 = 1.1 × 10 cotas = 11.00
    assert body["renda_mensal"] == "11.00"
    assert body["renda_anual"] == "132.00"
    assert body["por_fundo"][0]["ticker"] == "HGLG11"


def test_dividendos_exige_auth(client_carteira):
    client, _ = client_carteira
    assert client.get("/api/v1/carteira/dividendos").status_code == 401
```

- [ ] **Step 3: Rodar o teste e ver falhar**

Run: `cd backend && .venv/bin/python -m pytest tests/test_carteira_router.py -k dividendos -v`
Expected: FAIL — 404 (rota inexistente)

- [ ] **Step 4: Implementar o endpoint**

Modify `backend/app/routers/carteira.py` — adicionar imports:
```python
from app.services.dividendos_service import calcular_dividendos
```
Adicionar os schemas (após `ResumoOut`):
```python
class FundoRendaOut(BaseModel):
    ticker: str
    renda_mensal: Decimal
    percentual: float
    sem_dados: bool


class DividendosOut(BaseModel):
    renda_mensal: Decimal
    renda_anual: Decimal
    yield_on_cost: float | None
    por_fundo: list[FundoRendaOut]
```
Adicionar o endpoint (após `resumo`):
```python
@router.get("/dividendos", response_model=DividendosOut)
def dividendos(
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DividendosOut:
    """Projeção de renda mensal estimada da carteira (média 12m, só rendimentos)."""
    return DividendosOut(**calcular_dividendos(db, usuario.id))
```

- [ ] **Step 5: Rodar os testes e ver passar**

Run: `cd backend && .venv/bin/python -m pytest tests/test_carteira_router.py -v`
Expected: PASS (todos, incluindo os 2 novos)

- [ ] **Step 6: Commit**

```bash
git add backend/app/routers/carteira.py backend/tests/conftest.py backend/tests/test_carteira_router.py
git commit -m "feat(dividendos): endpoint GET /carteira/dividendos (RF-23)"
```

---

## Task 7: Endpoint `GET /fundos/{ticker}/proventos`

**Files:**
- Modify: `backend/app/routers/fundos.py`
- Test: `backend/tests/test_fundos_proventos.py`

- [ ] **Step 1: Escrever o teste que falha**

Create `backend/tests/test_fundos_proventos.py`:
```python
def test_proventos_do_fundo(client_carteira):
    client, _ = client_carteira  # a fixture já semeia 2 proventos p/ HGLG11
    r = client.get("/api/v1/fundos/HGLG11/proventos")
    assert r.status_code == 200
    body = r.json()
    assert len(body) == 2
    assert {"data_com", "data_pagamento", "valor_por_cota", "tipo"} <= set(body[0].keys())


def test_proventos_fundo_inexistente(client_carteira):
    client, _ = client_carteira
    assert client.get("/api/v1/fundos/ZZZZ11/proventos").status_code == 404
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `cd backend && .venv/bin/python -m pytest tests/test_fundos_proventos.py -v`
Expected: FAIL — 404 na rota `/proventos` (ainda não existe) ou KeyError

- [ ] **Step 3: Implementar o endpoint**

Modify `backend/app/routers/fundos.py` — adicionar imports:
```python
from datetime import date
from decimal import Decimal

from app.repositories.provento_repository import ProventoRepository
```
Adicionar schema (após `FundoDetalheOut`):
```python
class ProventoOut(BaseModel):
    data_com: date
    data_pagamento: date | None
    valor_por_cota: Decimal
    tipo: str

    model_config = {"from_attributes": True}
```
Adicionar o endpoint (após `detalhe_fundo`):
```python
@router.get("/fundos/{ticker}/proventos", response_model=list[ProventoOut])
def proventos_do_fundo(ticker: str, db: Session = Depends(get_db)) -> list[ProventoOut]:
    """Histórico de proventos de um fundo (mais recentes primeiro)."""
    fundo = FundoRepository(db).buscar_por_ticker(ticker.upper())
    if not fundo:
        raise HTTPException(status_code=404, detail=f"Fundo {ticker} não encontrado")
    return [ProventoOut.model_validate(p) for p in ProventoRepository(db).listar_por_fundo(fundo.id)]
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `cd backend && .venv/bin/python -m pytest tests/test_fundos_proventos.py -v`
Expected: PASS (2)

- [ ] **Step 5: Commit**

```bash
git add backend/app/routers/fundos.py backend/tests/test_fundos_proventos.py
git commit -m "feat(proventos): endpoint GET /fundos/{ticker}/proventos (RF-21)"
```

---

## Task 8: Cliente de API do front + regenerar tipos OpenAPI

**Files:**
- Create: `frontend/src/api/endpoints/dividendos.ts`
- Regenerar: `frontend/src/types/api.ts`

- [ ] **Step 1: Criar o módulo de endpoint** (mesmo padrão de `carteira.ts`)

Create `frontend/src/api/endpoints/dividendos.ts`:
```typescript
import { apiClient } from "@/api/client";

export interface FundoRenda {
  ticker: string;
  renda_mensal: string;
  percentual: number;
  sem_dados: boolean;
}

export interface Dividendos {
  renda_mensal: string;
  renda_anual: string;
  yield_on_cost: number | null;
  por_fundo: FundoRenda[];
}

export async function getDividendos(): Promise<Dividendos> {
  const { data } = await apiClient.get<Dividendos>("/api/v1/carteira/dividendos");
  return data;
}
```

- [ ] **Step 2: Regenerar os tipos da API** (backend rodando em :8000)

Run:
```bash
cd backend && .venv/bin/uvicorn app.main:app --port 8000 &
sleep 3
cd ../frontend && npx openapi-typescript http://localhost:8000/openapi.json -o src/types/api.ts
kill %1
```
Expected: `src/types/api.ts` passa a conter os paths `/api/v1/carteira/dividendos` e `/api/v1/fundos/{ticker}/proventos`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api/endpoints/dividendos.ts frontend/src/types/api.ts
git commit -m "feat(dividendos): cliente de API + tipos OpenAPI (RF-23)"
```

---

## Task 9: Hook `useDividendos`

**Files:**
- Create: `frontend/src/hooks/useDividendos.ts`
- Test: `frontend/src/hooks/useDividendos.test.tsx`

- [ ] **Step 1: Escrever o teste que falha**

Create `frontend/src/hooks/useDividendos.test.tsx`:
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useDividendos } from "./useDividendos";
import * as api from "@/api/endpoints/dividendos";

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("useDividendos", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("retorna a projeção de dividendos", async () => {
    vi.spyOn(api, "getDividendos").mockResolvedValue({
      renda_mensal: "11.00",
      renda_anual: "132.00",
      yield_on_cost: 0.132,
      por_fundo: [{ ticker: "HGLG11", renda_mensal: "11.00", percentual: 1, sem_dados: false }],
    });
    const { result } = renderHook(() => useDividendos(), { wrapper });
    await waitFor(() => expect(result.current.dividendos?.renda_mensal).toBe("11.00"));
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `cd frontend && npx vitest run src/hooks/useDividendos.test.tsx`
Expected: FAIL — módulo `./useDividendos` não existe

- [ ] **Step 3: Implementar o hook**

Create `frontend/src/hooks/useDividendos.ts`:
```typescript
import { useQuery } from "@tanstack/react-query";
import { getDividendos, type Dividendos } from "@/api/endpoints/dividendos";

export function useDividendos() {
  const query = useQuery({ queryKey: ["carteira", "dividendos"], queryFn: getDividendos });
  return {
    dividendos: query.data as Dividendos | undefined,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `cd frontend && npx vitest run src/hooks/useDividendos.test.tsx`
Expected: PASS (1)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useDividendos.ts frontend/src/hooks/useDividendos.test.tsx
git commit -m "feat(dividendos): hook useDividendos (RF-23)"
```

---

## Task 10: Sub-abas Posições | Dividendos na Carteira

**Files:**
- Create: `frontend/src/components/carteira/PosicoesView.tsx`
- Create: `frontend/src/components/carteira/DividendosView.tsx`
- Create: `frontend/src/components/charts/RendaPorFundoChart.tsx`
- Modify: `frontend/src/pages/CarteiraPage.tsx`
- Test: `frontend/src/pages/CarteiraPage.test.tsx` (acrescentar)

- [ ] **Step 1: Extrair o conteúdo atual para `PosicoesView`**

Create `frontend/src/components/carteira/PosicoesView.tsx` com o corpo atual da `CarteiraPage` (resumo + form de aporte + lista). Mover as linhas 6-117 da `CarteiraPage` atual para este componente, mantendo os imports de `useCarteira`, `MoneyValue`, `ClasseBadge`, `useState`, `FormEvent`. O componente não recebe props:
```typescript
import { useState, type FormEvent } from "react";
import { useCarteira } from "@/hooks/useCarteira";
import { MoneyValue } from "@/components/ui/MoneyValue";
import { ClasseBadge } from "@/components/ui/ClasseBadge";

export function PosicoesView() {
  const { posicoes, resumo, isLoading, isError, aporte, remover } = useCarteira();
  const [ticker, setTicker] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [preco, setPreco] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    aporte.mutate({ ticker: ticker.toUpperCase(), quantidade: Number(quantidade), preco });
    setTicker("");
    setQuantidade("");
    setPreco("");
  }

  if (isLoading) return <p className="text-muted-foreground">Carregando carteira…</p>;
  if (isError)
    return <p className="text-destructive" role="alert">Erro ao carregar a carteira.</p>;

  return (
    <div className="flex flex-col gap-4">
      {resumo && (
        <section className="glass rounded-2xl p-4">
          <p className="text-sm text-muted-foreground">Patrimônio investido</p>
          <MoneyValue valor={resumo.total_investido} className="text-3xl font-extrabold text-primary" />
          <p className="mt-1 text-xs text-muted-foreground">
            FII <MoneyValue valor={resumo.por_classe.FII ?? "0.00"} /> · FIAGRO{" "}
            <MoneyValue valor={resumo.por_classe.FIAGRO ?? "0.00"} />
          </p>
        </section>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-medium text-foreground">Registrar aporte</h2>
        <input aria-label="Ticker" placeholder="Ticker (ex: HGLG11)" required value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          className="rounded-xl border border-input bg-background px-3 py-2.5 text-foreground" />
        <input aria-label="Quantidade" type="number" min="1" placeholder="Quantidade" required value={quantidade}
          onChange={(e) => setQuantidade(e.target.value)}
          className="rounded-xl border border-input bg-background px-3 py-2.5 text-foreground" />
        <input aria-label="Preço" type="number" step="0.01" min="0.01" placeholder="Preço por cota" required value={preco}
          onChange={(e) => setPreco(e.target.value)}
          className="rounded-xl border border-input bg-background px-3 py-2.5 text-foreground" />
        <button type="submit" disabled={aporte.isPending}
          className="rounded-xl bg-primary py-2.5 font-semibold text-primary-foreground disabled:opacity-60">
          Adicionar
        </button>
      </form>

      <ul className="flex flex-col gap-2">
        {posicoes.map((p) => (
          <li key={p.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-3">
            <div>
              <p className="flex items-center gap-2 font-medium text-foreground">
                {p.ticker}
                <ClasseBadge classe={p.classe} />
              </p>
              <p className="text-xs text-muted-foreground">
                {p.quantidade} cotas · PM <MoneyValue valor={p.preco_medio} />
              </p>
            </div>
            <div className="flex items-center gap-3">
              <MoneyValue valor={p.valor_investido} className="font-semibold text-foreground" />
              <button aria-label={`Remover ${p.ticker}`} onClick={() => remover.mutate(p.id)}
                className="text-sm text-destructive">Remover</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Criar o gráfico de composição da renda**

Create `frontend/src/components/charts/RendaPorFundoChart.tsx`:
```typescript
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { FundoRenda } from "@/api/endpoints/dividendos";

export function RendaPorFundoChart({ porFundo }: { porFundo: FundoRenda[] }) {
  const dados = porFundo
    .filter((f) => !f.sem_dados)
    .map((f) => ({ ticker: f.ticker, renda: Number(f.renda_mensal) }));

  if (dados.length === 0)
    return <p className="text-xs text-muted-foreground">Sem dados de proventos para os fundos da carteira.</p>;

  return (
    <ResponsiveContainer width="100%" height={Math.max(120, dados.length * 40)}>
      <BarChart data={dados} layout="vertical" margin={{ left: 8, right: 8 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="ticker" width={64} tick={{ fontSize: 12 }} />
        <Tooltip formatter={(v: number) => `R$ ${v.toFixed(2)}/mês`} />
        <Bar dataKey="renda" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 3: Criar a `DividendosView`**

Create `frontend/src/components/carteira/DividendosView.tsx`:
```typescript
import { useDividendos } from "@/hooks/useDividendos";
import { MoneyValue } from "@/components/ui/MoneyValue";
import { RendaPorFundoChart } from "@/components/charts/RendaPorFundoChart";

export function DividendosView() {
  const { dividendos, isLoading, isError } = useDividendos();

  if (isLoading) return <p className="text-muted-foreground">Carregando dividendos…</p>;
  if (isError)
    return <p className="text-destructive" role="alert">Erro ao carregar os dividendos.</p>;
  if (!dividendos) return null;

  const yoc = dividendos.yield_on_cost;

  return (
    <div className="flex flex-col gap-4">
      <section className="glass rounded-2xl p-4">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          Renda mensal estimada
          <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] text-accent-foreground">média 12m</span>
        </p>
        <MoneyValue valor={dividendos.renda_mensal} className="text-3xl font-extrabold text-primary" />
        <p className="mt-1 text-xs text-muted-foreground">
          ≈ <MoneyValue valor={dividendos.renda_anual} /> por ano
          {yoc != null && <> · Yield on cost {(yoc * 100).toFixed(1).replace(".", ",")}% a.a.</>}
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-foreground">Composição da renda</h2>
        <div className="rounded-2xl border border-border bg-card p-3">
          <RendaPorFundoChart porFundo={dividendos.por_fundo} />
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-foreground">Quem paga mais</h2>
        <ul className="flex flex-col gap-2">
          {dividendos.por_fundo.map((f) => (
            <li key={f.ticker} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
              <span className="font-medium text-foreground">{f.ticker}</span>
              {f.sem_dados ? (
                <span className="text-xs text-muted-foreground">sem dados</span>
              ) : (
                <span className="text-sm text-foreground">
                  <MoneyValue valor={f.renda_mensal} />/mês · {(f.percentual * 100).toFixed(0)}%
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Reescrever `CarteiraPage` como container de abas**

Replace `frontend/src/pages/CarteiraPage.tsx` inteiramente por:
```typescript
import { useState } from "react";
import { cn } from "@/lib/utils";
import { PosicoesView } from "@/components/carteira/PosicoesView";
import { DividendosView } from "@/components/carteira/DividendosView";

type Sub = "posicoes" | "dividendos";

export function CarteiraPage() {
  const [sub, setSub] = useState<Sub>("posicoes");
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">Minha Carteira</h1>
      <div role="tablist" className="flex gap-2">
        {(["posicoes", "dividendos"] as const).map((s) => (
          <button
            key={s}
            role="tab"
            aria-selected={sub === s}
            onClick={() => setSub(s)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium",
              sub === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}
          >
            {s === "posicoes" ? "Posições" : "Dividendos"}
          </button>
        ))}
      </div>
      {sub === "posicoes" ? <PosicoesView /> : <DividendosView />}
    </div>
  );
}
```

- [ ] **Step 5: Escrever o teste de troca de abas**

Acrescentar em `frontend/src/pages/CarteiraPage.test.tsx` (mockando os dois hooks):
```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CarteiraPage } from "./CarteiraPage";

vi.mock("@/hooks/useCarteira", () => ({
  useCarteira: () => ({
    posicoes: [], resumo: { total_investido: "0.00", por_classe: {}, num_posicoes: 0 },
    isLoading: false, isError: false,
    aporte: { mutate: vi.fn(), isPending: false }, remover: { mutate: vi.fn() },
  }),
}));
vi.mock("@/hooks/useDividendos", () => ({
  useDividendos: () => ({
    dividendos: { renda_mensal: "11.00", renda_anual: "132.00", yield_on_cost: 0.132,
      por_fundo: [{ ticker: "HGLG11", renda_mensal: "11.00", percentual: 1, sem_dados: false }] },
    isLoading: false, isError: false,
  }),
}));

describe("CarteiraPage abas", () => {
  it("troca para a aba Dividendos e mostra a renda mensal", () => {
    render(<CarteiraPage />);
    expect(screen.getByText("Registrar aporte")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Dividendos" }));
    expect(screen.getByText(/Renda mensal estimada/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Rodar os testes do front e ver passar**

Run: `cd frontend && npx vitest run src/pages/CarteiraPage.test.tsx`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/carteira/ frontend/src/components/charts/RendaPorFundoChart.tsx frontend/src/pages/CarteiraPage.tsx frontend/src/pages/CarteiraPage.test.tsx
git commit -m "feat(dividendos): sub-abas Posições|Dividendos na Carteira (RF-23, RNF-05)"
```

---

## Task 11: Mini-card de renda na Início

**Files:**
- Modify: `frontend/src/pages/InicioPage.tsx`
- Test: `frontend/src/pages/InicioPage.test.tsx` (acrescentar)

- [ ] **Step 1: Escrever o teste que falha** (acrescentar ao mock existente de hooks)

Acrescentar em `frontend/src/pages/InicioPage.test.tsx` um mock de `useDividendos` e o caso:
```typescript
vi.mock("@/hooks/useDividendos", () => ({
  useDividendos: () => ({
    dividendos: { renda_mensal: "412.00", renda_anual: "4944.00", yield_on_cost: 0.102, por_fundo: [] },
    isLoading: false, isError: false,
  }),
}));

it("mostra a renda mensal estimada", () => {
  // render(<InicioPage />) dentro do provider já usado no arquivo
  expect(screen.getByText(/Renda mensal estimada/)).toBeInTheDocument();
});
```
> Observação: se o arquivo de teste ainda não existir/renderizar `InicioPage` com Router+QueryClient, siga o padrão já presente nos outros `*.test.tsx` de página (envolver em `MemoryRouter` + `QueryClientProvider`).

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `cd frontend && npx vitest run src/pages/InicioPage.test.tsx`
Expected: FAIL — texto "Renda mensal estimada" não encontrado

- [ ] **Step 3: Adicionar o mini-card**

Modify `frontend/src/pages/InicioPage.tsx` — adicionar import:
```typescript
import { useDividendos } from "@/hooks/useDividendos";
```
No componente, após `const { topFiis } = useDashboard();`:
```typescript
  const { dividendos } = useDividendos();
```
Logo após o `<Link to="/carteira">` do patrimônio, adicionar:
```tsx
      <Link to="/carteira" className="rounded-2xl border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">Renda mensal estimada</p>
        <MoneyValue
          valor={dividendos?.renda_mensal ?? "0.00"}
          className="text-2xl font-bold text-primary"
        />
        <p className="mt-1 text-xs text-muted-foreground">média dos últimos 12 meses</p>
      </Link>
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `cd frontend && npx vitest run src/pages/InicioPage.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/InicioPage.tsx frontend/src/pages/InicioPage.test.tsx
git commit -m "feat(dividendos): mini-card de renda mensal na Início (RF-04, RF-23)"
```

---

## Task 12: Gate final + smoke mobile (verification-before-completion)

**Files:** nenhum (verificação)

- [ ] **Step 1: Suíte backend completa + lint + tipos**

Run:
```bash
cd backend && .venv/bin/python -m pytest -q && .venv/bin/ruff check . && .venv/bin/mypy app/
```
Expected: pytest tudo verde · ruff sem erros · mypy sem erros.

- [ ] **Step 2: Suíte front + tipos + build + lint**

Run:
```bash
cd frontend && npx vitest run && npx tsc --noEmit && npm run build 2>&1 | tail -3 && npm run lint 2>&1 | tail -5
```
Expected: vitest verde · tsc sem erros · build OK · lint sem erros.

- [ ] **Step 3: Coleta real de proventos (dados de verdade)**

Run:
```bash
cd backend && .venv/bin/python -m scripts.coletar_proventos
```
Expected: log "Proventos: N fundos, M proventos, K falhas" com M > 0. (Marcar quantos FIAGROs ficaram sem dados — risco documentado.)

- [ ] **Step 4: Smoke ponta a ponta no viewport mobile (≈375px)**

Com `uvicorn` em :8000 e `npm run dev`:
- Login → Carteira → registrar um aporte (ex.: HGLG11, 10, 100,00).
- Trocar para a aba **Dividendos**: hero mostra renda mensal/anual/YoC, gráfico de composição e lista "quem paga mais".
- Início mostra o mini-card "Renda mensal estimada".
- Confirmar layout sem overflow em 375px (RNF-05).

- [ ] **Step 5: Finalizar a branch**

Usar a skill `superpowers:finishing-a-development-branch` para decidir merge/PR de `feature/m2-patrimonio-dividendos`.

---

## Self-Review

**1. Cobertura da spec:**
- Modelo `proventos` → Task 2 ✅
- Coleta (parser/repo/serviço/script) → Tasks 1, 3, 4 ✅
- Serviço de renda (média 12m, só rendimento, YoC, sem_dados) → Task 5 ✅
- `GET /carteira/dividendos` → Task 6 ✅
- `GET /fundos/{ticker}/proventos` (RF-21) → Task 7 ✅
- Front: hook, sub-abas, gráfico de composição, mini-card Início → Tasks 8-11 ✅
- Testes TDD em cada camada ✅ · Gate + smoke mobile → Task 12 ✅
- RF-22 fora de escopo (sem histórico de movimentação) — respeitado ✅

**2. Placeholders:** nenhum "TBD/TODO"; todo passo de código traz o código real. A única nota condicional (Task 11, estrutura do test file de página) remete a um padrão já existente no repo.

**3. Consistência de tipos:** `parse_proventos` retorna dicts com `data_com/data_pagamento/valor_por_cota/tipo` — consumidos igual em Task 4. `ProventoRepository.upsert(fundo_id, data_com, tipo, data_pagamento, valor_por_cota)` — mesma assinatura em Tasks 4 e 6. `calcular_dividendos → {renda_mensal, renda_anual, yield_on_cost, por_fundo[{ticker, renda_mensal, percentual, sem_dados}]}` — espelhado no schema Pydantic (Task 6), no TS `Dividendos`/`FundoRenda` (Task 8) e no chart (Task 10). Chaves de query `["carteira","dividendos"]` consistentes (Task 9) e invalidadas pelo `["carteira"]` já existente em `useCarteira`.
