# Integração Backend ↔ Frontend — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **⚠️ Regra de git do Hiago:** NUNCA rodar `git add/commit/push` sem autorização explícita. Cada "Step: Commit" abaixo significa **propor** o commit e **esperar o ok do Hiago** antes de executar.

**Goal:** Ligar o frontend (hoje em mock) ao backend FastAPI, tornando o backend a fonte única do scoring; o frontend consome via TanStack Query.

**Architecture:** Backend ganha um serviço de ranking sob demanda (`montar_ranking`) que pontua a coorte inteira com pesos dados e devolve indicadores em unidade de display, sem persistir. Dois endpoints (`GET /ranking?perfil=`, `POST /ranking/simular`) alimentam Ranking, Dashboard e o preview do Perfil. Clusters consome o `GET /clusters` existente.

**Tech Stack:** FastAPI + SQLAlchemy 2.0 + Pydantic v2 + pytest (backend); React 18 + TanStack Query v5 + axios + Vitest + Testing Library (frontend).

---

## Mapa de arquivos

**Backend**
- Modificar: `backend/app/services/scoring_service.py` — adicionar `PESOS_POR_PERFIL` (3 presets canônicos).
- Criar: `backend/app/services/ranking_service.py` — `RankingItem`, conversão de unidades, `montar_ranking`.
- Modificar: `backend/app/routers/ranking.py` — reescrever para usar `montar_ranking`; `GET /ranking?perfil=` + `POST /ranking/simular`.
- Modificar: `backend/app/routers/fundos.py` — `volatilidade_12m` no `IndicadorOut`.
- Modificar: `backend/app/routers/clustering.py` — `volatilidade_media` no `ClusterItemOut`.
- Modificar: `backend/tests/conftest.py` — fixture `client_seeded` (in-memory + override).
- Criar: `backend/tests/test_ranking_service.py`, `backend/tests/test_ranking_router.py`.

**Frontend**
- Modificar: `frontend/vite.config.ts`, `frontend/package.json` — config Vitest/jsdom.
- Criar: `frontend/src/test/setup.ts`.
- Criar: `frontend/src/types/api.ts` (gerado), `frontend/src/types/ranking.ts` (aliases limpos).
- Criar: `frontend/src/api/endpoints/ranking.ts`, `frontend/src/api/endpoints/clusters.ts`.
- Modificar: `frontend/src/hooks/useRanking.ts`, `frontend/src/hooks/useDashboard.ts`.
- Criar: `frontend/src/hooks/useClusters.ts`.
- Modificar: `frontend/src/pages/RankingPage.tsx`, `DashboardPage.tsx`, `ClustersPage.tsx`, `PerfilPage.tsx`.
- Modificar: `frontend/src/lib/pesosSchema.ts`, `frontend/src/stores/perfilStore.ts`, `frontend/src/types/domain.ts`.
- Deletar: `frontend/src/lib/scoring.ts`, `frontend/src/lib/scoring.test.ts`, `frontend/src/mocks/`.

---

# FASE 1 — Backend: serviço e endpoints de ranking

## Task 1: Presets de perfil + `montar_ranking`

**Files:**
- Modify: `backend/app/services/scoring_service.py`
- Create: `backend/app/services/ranking_service.py`
- Test: `backend/tests/test_ranking_service.py`

- [ ] **Step 1: Adicionar os 3 presets canônicos em `scoring_service.py`**

Logo abaixo de `PESOS_DEFAULT` (que é o perfil moderado), adicionar:

```python
# Presets canônicos por perfil (chaves = indicadores do modelo; soma = 1.0).
# moderado == PESOS_DEFAULT.
PESOS_POR_PERFIL: dict[str, dict[str, float]] = {
    "conservador": {
        "dy_atual": 0.10,
        "dy_12m": 0.15,
        "p_vp": 0.10,
        "vacancia_fisica": 0.15,
        "vacancia_financeira": 0.15,
        "liquidez_diaria": 0.10,
        "volatilidade_12m": 0.15,
        "patrimonio_liquido": 0.05,
        "num_cotistas": 0.05,
        "segmento": 0.00,
    },
    "moderado": PESOS_DEFAULT,
    "arrojado": {
        "dy_atual": 0.25,
        "dy_12m": 0.05,
        "p_vp": 0.20,
        "vacancia_fisica": 0.10,
        "vacancia_financeira": 0.05,
        "liquidez_diaria": 0.10,
        "volatilidade_12m": 0.05,
        "patrimonio_liquido": 0.05,
        "num_cotistas": 0.05,
        "segmento": 0.10,
    },
}
```

- [ ] **Step 2: Escrever o teste que falha** (`backend/tests/test_ranking_service.py`)

```python
from datetime import date

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app import models  # noqa: F401
from app.database import Base
from app.models.fundo import Fundo
from app.models.indicador import Indicador
from app.services.ranking_service import RankingItem, montar_ranking
from app.services.scoring_service import PESOS_DEFAULT, PESOS_POR_PERFIL


def _session() -> Session:
    engine = create_engine(
        "sqlite:///:memory:", connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)()


def _semear(db: Session) -> None:
    # Valores em unidades CRUAS, como o coletor grava.
    fundos = [
        ("AAAA11", "Fundo A", "Logística", 0.10, 0.10, 0.92, 18_000_000.0, 0.085, 5_000_000_000.0, 300_000),
        ("BBBB11", "Fundo B", "Recebíveis", 0.13, 0.12, 0.83, 2_000_000.0, 0.13, 1_000_000_000.0, 80_000),
        ("CCCC11", "Fundo C", "Shopping", 0.07, 0.07, 1.05, 600_000.0, 0.16, 800_000_000.0, 120_000),
    ]
    for tk, nome, seg, dy, dy12, pvp, liq, vol, pl, cot in fundos:
        f = Fundo(ticker=tk, nome=nome, segmento=seg)
        db.add(f)
        db.flush()
        db.add(
            Indicador(
                fundo_id=f.id,
                data_referencia=date(2026, 5, 1),
                dy_atual=dy,
                dy_12m=dy12,
                p_vp=pvp,
                vacancia_fisica=None,
                vacancia_financeira=None,
                liquidez_diaria=liq,
                volatilidade_12m=vol,
                patrimonio_liquido=pl,
                num_cotistas=cot,
            )
        )
    db.commit()


def test_montar_ranking_retorna_um_item_por_fundo_ordenado_por_score():
    db = _session()
    _semear(db)
    itens = montar_ranking(db, PESOS_DEFAULT)
    assert len(itens) == 3
    assert all(isinstance(i, RankingItem) for i in itens)
    scores = [i.score for i in itens]
    assert scores == sorted(scores, reverse=True)


def test_montar_ranking_converte_para_unidades_de_display():
    db = _session()
    _semear(db)
    item = next(i for i in montar_ranking(db, PESOS_DEFAULT) if i.ticker == "AAAA11")
    assert item.dy_atual == 10.0            # 0.10 * 100
    assert item.volatilidade_12m == 8.5     # 0.085 * 100
    assert item.liquidez_diaria == 18.0     # 18_000_000 / 1e6
    assert item.patrimonio_liquido == 5.0   # 5e9 / 1e9
    assert item.num_cotistas == 300.0       # 300_000 / 1000
    assert item.p_vp == 0.92                # sem conversão


def test_montar_ranking_nao_persiste_scoring():
    db = _session()
    _semear(db)
    montar_ranking(db, PESOS_DEFAULT)
    from app.models.scoring import ScoringHistorico
    assert db.query(ScoringHistorico).count() == 0


def test_montar_ranking_aceita_pesos_de_preset():
    db = _session()
    _semear(db)
    itens = montar_ranking(db, PESOS_POR_PERFIL["conservador"])
    assert len(itens) == 3
    assert all(0 <= i.score <= 100 for i in itens)
```

- [ ] **Step 3: Rodar o teste e confirmar que falha**

Run: `cd backend && pytest tests/test_ranking_service.py -v`
Expected: FAIL com `ModuleNotFoundError: app.services.ranking_service`.

- [ ] **Step 4: Implementar `ranking_service.py`**

```python
from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.models.indicador import Indicador
from app.repositories.indicador_repository import IndicadorRepository
from app.services.scoring_service import (
    _calcular_pontuacoes,
    calcular_score_com_pesos,
    classificar_score,
)


@dataclass
class RankingItem:
    ticker: str
    nome: str | None
    segmento: str | None
    score: float
    classificacao: str
    # Indicadores em unidade de display:
    dy_atual: float | None
    dy_12m: float | None
    p_vp: float | None
    vacancia_fisica: float | None
    vacancia_financeira: float | None
    liquidez_diaria: float | None
    volatilidade_12m: float | None
    patrimonio_liquido: float | None
    num_cotistas: float | None


def _pct(valor: float | None) -> float | None:
    """Fração -> percentual (0.10 -> 10.0)."""
    return round(valor * 100, 2) if valor is not None else None


def _converter_display(ind: Indicador) -> dict[str, float | None]:
    """Converte os valores crus do banco para unidades de exibição."""
    return {
        "dy_atual": _pct(ind.dy_atual),
        "dy_12m": _pct(ind.dy_12m),
        "p_vp": round(ind.p_vp, 2) if ind.p_vp is not None else None,
        "vacancia_fisica": _pct(ind.vacancia_fisica),
        "vacancia_financeira": _pct(ind.vacancia_financeira),
        "liquidez_diaria": round(ind.liquidez_diaria / 1e6, 2)
        if ind.liquidez_diaria is not None
        else None,
        "volatilidade_12m": _pct(ind.volatilidade_12m),
        "patrimonio_liquido": round(ind.patrimonio_liquido / 1e9, 2)
        if ind.patrimonio_liquido is not None
        else None,
        "num_cotistas": round(ind.num_cotistas / 1000, 1)
        if ind.num_cotistas is not None
        else None,
    }


def montar_ranking(db: Session, pesos: dict[str, float]) -> list[RankingItem]:
    """Pontua a coorte inteira com os pesos dados e devolve em memória, sem persistir.

    O scoring de PL e nº de cotistas usa percentil sobre toda a coorte, por isso
    o cálculo precisa enxergar todos os fundos de uma vez.
    """
    indicadores = IndicadorRepository(db).buscar_todos_mais_recentes()
    todos_pl = [i.patrimonio_liquido for i in indicadores if i.patrimonio_liquido is not None]
    todos_cotistas = [float(i.num_cotistas) for i in indicadores if i.num_cotistas is not None]

    itens: list[RankingItem] = []
    for ind in indicadores:
        fundo = ind.fundo
        pontuacoes = _calcular_pontuacoes(ind, fundo, todos_pl, todos_cotistas)
        score = calcular_score_com_pesos(pontuacoes, pesos)
        itens.append(
            RankingItem(
                ticker=fundo.ticker,
                nome=fundo.nome,
                segmento=fundo.segmento,
                score=score,
                classificacao=classificar_score(score),
                **_converter_display(ind),
            )
        )

    itens.sort(key=lambda i: i.score, reverse=True)
    return itens
```

- [ ] **Step 5: Rodar o teste e confirmar que passa**

Run: `cd backend && pytest tests/test_ranking_service.py -v`
Expected: PASS (4 testes).

- [ ] **Step 6: Lint/type-check e commit**

Run: `cd backend && ruff check app/services/ranking_service.py --fix && black app/services/ranking_service.py && mypy app/services/ranking_service.py`
Propor a Hiago (esperar ok):

```bash
git add backend/app/services/ranking_service.py backend/app/services/scoring_service.py backend/tests/test_ranking_service.py
git commit -m "feat(ranking): serviço de ranking sob demanda com presets e unidades de display"
```

---

## Task 2: Endpoint `GET /ranking?perfil=` + fixture de teste semeado

**Files:**
- Modify: `backend/app/routers/ranking.py`
- Modify: `backend/tests/conftest.py`
- Test: `backend/tests/test_ranking_router.py`

- [ ] **Step 1: Adicionar fixture `client_seeded` em `conftest.py`**

Acrescentar ao final de `backend/tests/conftest.py`:

```python
from datetime import date

from app.database import get_db
from app.models.fundo import Fundo
from app.models.indicador import Indicador


@pytest.fixture
def client_seeded() -> Generator[TestClient, None, None]:
    """TestClient com banco in-memory semeado e get_db sobrescrito."""
    engine = create_engine(
        "sqlite:///:memory:", connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(engine)
    SessionTest = sessionmaker(bind=engine)

    seed = [
        ("AAAA11", "Fundo A", "Logística", 0.10, 0.10, 0.92, 18_000_000.0, 0.085, 5_000_000_000.0, 300_000),
        ("BBBB11", "Fundo B", "Recebíveis", 0.13, 0.12, 0.83, 2_000_000.0, 0.13, 1_000_000_000.0, 80_000),
        ("CCCC11", "Fundo C", "Shopping", 0.07, 0.07, 1.05, 600_000.0, 0.16, 800_000_000.0, 120_000),
    ]
    with SessionTest() as db:
        for tk, nome, seg, dy, dy12, pvp, liq, vol, pl, cot in seed:
            f = Fundo(ticker=tk, nome=nome, segmento=seg)
            db.add(f)
            db.flush()
            db.add(
                Indicador(
                    fundo_id=f.id, data_referencia=date(2026, 5, 1),
                    dy_atual=dy, dy_12m=dy12, p_vp=pvp,
                    vacancia_fisica=None, vacancia_financeira=None,
                    liquidez_diaria=liq, volatilidade_12m=vol,
                    patrimonio_liquido=pl, num_cotistas=cot,
                )
            )
        db.commit()

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

- [ ] **Step 2: Escrever o teste que falha** (`backend/tests/test_ranking_router.py`)

```python
from fastapi.testclient import TestClient


def test_ranking_perfil_moderado_retorna_lista_ordenada(client_seeded: TestClient):
    r = client_seeded.get("/api/v1/ranking?perfil=moderado")
    assert r.status_code == 200
    dados = r.json()
    assert len(dados) == 3
    scores = [d["score"] for d in dados]
    assert scores == sorted(scores, reverse=True)


def test_ranking_inclui_indicadores_em_display(client_seeded: TestClient):
    r = client_seeded.get("/api/v1/ranking?perfil=moderado")
    item = next(d for d in r.json() if d["ticker"] == "AAAA11")
    assert item["dy_atual"] == 10.0
    assert item["liquidez_diaria"] == 18.0
    assert item["patrimonio_liquido"] == 5.0
    assert "classificacao" in item


def test_ranking_default_perfil_moderado(client_seeded: TestClient):
    r = client_seeded.get("/api/v1/ranking")
    assert r.status_code == 200
    assert len(r.json()) == 3


def test_ranking_perfil_invalido_retorna_422(client_seeded: TestClient):
    r = client_seeded.get("/api/v1/ranking?perfil=inexistente")
    assert r.status_code == 422
```

- [ ] **Step 3: Rodar e confirmar que falha**

Run: `cd backend && pytest tests/test_ranking_router.py -v`
Expected: FAIL (resposta atual não tem indicadores / perfil inválido não dá 422).

- [ ] **Step 4: Reescrever `backend/app/routers/ranking.py`**

```python
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.ranking_service import montar_ranking
from app.services.scoring_service import PESOS_POR_PERFIL

router = APIRouter(tags=["ranking"])


class RankingItemOut(BaseModel):
    ticker: str
    nome: str | None
    segmento: str | None
    score: float
    classificacao: str
    dy_atual: float | None
    dy_12m: float | None
    p_vp: float | None
    vacancia_fisica: float | None
    vacancia_financeira: float | None
    liquidez_diaria: float | None
    volatilidade_12m: float | None
    patrimonio_liquido: float | None
    num_cotistas: float | None

    model_config = {"from_attributes": True}


@router.get("/ranking", response_model=list[RankingItemOut])
def listar_ranking(
    perfil: str = Query("moderado", description="conservador | moderado | arrojado"),
    db: Session = Depends(get_db),
) -> list[RankingItemOut]:
    """Ranking calculado sob demanda com os pesos canônicos do perfil."""
    pesos = PESOS_POR_PERFIL.get(perfil)
    if pesos is None:
        raise HTTPException(status_code=422, detail=f"Perfil inválido: {perfil}")
    return [RankingItemOut.model_validate(i) for i in montar_ranking(db, pesos)]
```

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `cd backend && pytest tests/test_ranking_router.py -v`
Expected: PASS (4 testes).

- [ ] **Step 6: Garantir que a suíte inteira ainda passa**

Run: `cd backend && pytest -q`
Expected: todos verdes (nenhum teste dependia do `/ranking` antigo).

- [ ] **Step 7: Lint e commit**

Run: `cd backend && ruff check app/routers/ranking.py tests/ --fix && black app/routers/ranking.py tests/conftest.py tests/test_ranking_router.py`
Propor a Hiago:

```bash
git add backend/app/routers/ranking.py backend/tests/conftest.py backend/tests/test_ranking_router.py
git commit -m "feat(ranking): GET /ranking?perfil calcula ranking sob demanda com indicadores"
```

---

## Task 3: Endpoint `POST /ranking/simular` (pesos customizados)

**Files:**
- Modify: `backend/app/routers/ranking.py`
- Test: `backend/tests/test_ranking_router.py`

- [ ] **Step 1: Escrever os testes que falham** (acrescentar a `test_ranking_router.py`)

```python
PESOS_OK = {
    "dy_atual": 0.20, "dy_12m": 0.10, "p_vp": 0.15,
    "vacancia_fisica": 0.10, "vacancia_financeira": 0.10,
    "liquidez_diaria": 0.10, "volatilidade_12m": 0.10,
    "patrimonio_liquido": 0.05, "num_cotistas": 0.05, "segmento": 0.05,
}


def test_simular_com_pesos_validos(client_seeded: TestClient):
    r = client_seeded.post("/api/v1/ranking/simular", json={"pesos": PESOS_OK})
    assert r.status_code == 200
    assert len(r.json()) == 3


def test_simular_soma_diferente_de_um_retorna_422(client_seeded: TestClient):
    ruins = {**PESOS_OK, "dy_atual": 0.50}  # soma = 1.30
    r = client_seeded.post("/api/v1/ranking/simular", json={"pesos": ruins})
    assert r.status_code == 422
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd backend && pytest tests/test_ranking_router.py -k simular -v`
Expected: FAIL com 404 (rota inexistente).

- [ ] **Step 3: Adicionar o modelo de entrada e a rota em `ranking.py`**

Adicionar os imports `from pydantic import model_validator` e implementar:

```python
class PesosIn(BaseModel):
    dy_atual: float
    dy_12m: float
    p_vp: float
    vacancia_fisica: float
    vacancia_financeira: float
    liquidez_diaria: float
    volatilidade_12m: float
    patrimonio_liquido: float
    num_cotistas: float
    segmento: float

    @model_validator(mode="after")
    def _soma_um(self) -> "PesosIn":
        soma = (
            self.dy_atual + self.dy_12m + self.p_vp + self.vacancia_fisica
            + self.vacancia_financeira + self.liquidez_diaria + self.volatilidade_12m
            + self.patrimonio_liquido + self.num_cotistas + self.segmento
        )
        if abs(soma - 1.0) > 0.01:
            raise ValueError(f"A soma dos pesos deve ser 1.0 (atual: {soma:.2f})")
        return self


class SimularIn(BaseModel):
    pesos: PesosIn


@router.post("/ranking/simular", response_model=list[RankingItemOut])
def simular_ranking(
    body: SimularIn, db: Session = Depends(get_db)
) -> list[RankingItemOut]:
    """Ranking calculado sob demanda com pesos customizados (soma = 1.0)."""
    return [
        RankingItemOut.model_validate(i)
        for i in montar_ranking(db, body.pesos.model_dump())
    ]
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd backend && pytest tests/test_ranking_router.py -v`
Expected: PASS (6 testes).

- [ ] **Step 5: Lint e commit**

Run: `cd backend && ruff check app/routers/ranking.py --fix && black app/routers/ranking.py`
Propor a Hiago:

```bash
git add backend/app/routers/ranking.py backend/tests/test_ranking_router.py
git commit -m "feat(ranking): POST /ranking/simular com validação de soma dos pesos"
```

---

## Task 4: Correções de schema (volatilidade)

**Files:**
- Modify: `backend/app/routers/fundos.py`
- Modify: `backend/app/routers/clustering.py`
- Test: `backend/tests/test_ranking_router.py`

- [ ] **Step 1: Escrever os testes que falham** (acrescentar)

```python
def test_detalhe_fundo_inclui_volatilidade(client_seeded: TestClient):
    r = client_seeded.get("/api/v1/fundos/AAAA11")
    assert r.status_code == 200
    assert r.json()["indicador"]["volatilidade_12m"] == 0.085  # cru (este endpoint não converte)
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd backend && pytest tests/test_ranking_router.py -k volatilidade -v`
Expected: FAIL — `volatilidade_12m` ausente em `IndicadorOut`.

- [ ] **Step 3: Adicionar campo em `fundos.py`**

Em `IndicadorOut`, após `liquidez_diaria: float | None`, adicionar:

```python
    volatilidade_12m: float | None
```

- [ ] **Step 4: Adicionar `volatilidade_media` em `ClusterItemOut` (`clustering.py`)**

Em `ClusterItemOut`, após `dy_medio: float | None`, adicionar:

```python
    volatilidade_media: float | None
```

E, na construção do `ClusterItemOut` dentro de `listar_clusters`, após `dy_medio=cluster.dy_medio,` adicionar:

```python
                volatilidade_media=cluster.volatilidade_media,
```

- [ ] **Step 5: Rodar a suíte inteira**

Run: `cd backend && pytest -q`
Expected: todos verdes.

- [ ] **Step 6: Lint e commit**

Run: `cd backend && ruff check app/routers/ --fix && black app/routers/`
Propor a Hiago:

```bash
git add backend/app/routers/fundos.py backend/app/routers/clustering.py backend/tests/test_ranking_router.py
git commit -m "fix(api): expõe volatilidade em /fundos/{ticker} e /clusters"
```

---

# FASE 2 — Frontend: infraestrutura e camada de API

## Task 5: Configurar Vitest + jsdom

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/vite.config.ts`
- Create: `frontend/src/test/setup.ts`

- [ ] **Step 1: Instalar jsdom**

Run: `cd frontend && npm install -D jsdom`
Expected: `jsdom` aparece em devDependencies.

- [ ] **Step 2: Criar `frontend/src/test/setup.ts`**

```typescript
import "@testing-library/jest-dom";
```

- [ ] **Step 3: Adicionar bloco de teste em `vite.config.ts`**

Substituir o conteúdo por:

```typescript
/// <reference types="vitest/config" />
import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
  },
})
```

- [ ] **Step 4: Adicionar scripts de teste em `package.json`**

No bloco `"scripts"`, adicionar:

```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 5: Confirmar que o teste existente roda**

Run: `cd frontend && npm test`
Expected: `src/lib/scoring.test.ts` PASS (ambiente configurado). _(Este arquivo será removido na Task 10.)_

- [ ] **Step 6: Commit**

Propor a Hiago:

```bash
git add frontend/package.json frontend/package-lock.json frontend/vite.config.ts frontend/src/test/setup.ts
git commit -m "test(frontend): configura Vitest com jsdom e setup do jest-dom"
```

---

## Task 6: Gerar tipos do OpenAPI + camada `api/endpoints`

**Files:**
- Create: `frontend/src/types/api.ts` (gerado)
- Create: `frontend/src/types/ranking.ts`
- Create: `frontend/src/api/endpoints/ranking.ts`
- Create: `frontend/src/api/endpoints/clusters.ts`

- [ ] **Step 1: Subir o backend e gerar os tipos**

Run (em dois passos):
```bash
cd backend && uvicorn app.main:app --port 8000 &   # subir
sleep 2
cd ../frontend && npx openapi-typescript http://localhost:8000/openapi.json -o src/types/api.ts
```
Depois encerrar o uvicorn (`kill %1` no shell do backend).
Expected: `src/types/api.ts` criado com `components["schemas"]["RankingItemOut"]` etc.

- [ ] **Step 2: Criar aliases limpos em `frontend/src/types/ranking.ts`**

```typescript
import type { components } from "@/types/api";

export type RankingItem = components["schemas"]["RankingItemOut"];
export type ClusterItem = components["schemas"]["ClusterItemOut"];
export type PesosPayload = components["schemas"]["PesosIn"];
```

- [ ] **Step 3: Criar `frontend/src/api/endpoints/ranking.ts`**

```typescript
import { apiClient } from "@/api/client";
import type { TipoPerfil } from "@/types/domain";
import type { RankingItem, PesosPayload } from "@/types/ranking";

export async function getRanking(perfil: TipoPerfil): Promise<RankingItem[]> {
  const { data } = await apiClient.get<RankingItem[]>("/api/v1/ranking", {
    params: { perfil },
  });
  return data;
}

export async function simularRanking(pesos: PesosPayload): Promise<RankingItem[]> {
  const { data } = await apiClient.post<RankingItem[]>("/api/v1/ranking/simular", {
    pesos,
  });
  return data;
}
```

- [ ] **Step 4: Criar `frontend/src/api/endpoints/clusters.ts`**

```typescript
import { apiClient } from "@/api/client";
import type { ClusterItem } from "@/types/ranking";

export async function getClusters(): Promise<ClusterItem[]> {
  const { data } = await apiClient.get<ClusterItem[]>("/api/v1/clusters");
  return data;
}
```

- [ ] **Step 5: Type-check**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: sem erros.

- [ ] **Step 6: Commit**

Propor a Hiago:

```bash
git add frontend/src/types/api.ts frontend/src/types/ranking.ts frontend/src/api/endpoints/ranking.ts frontend/src/api/endpoints/clusters.ts
git commit -m "feat(api): tipos gerados do OpenAPI e camada de endpoints (ranking, clusters)"
```

---

# FASE 3 — Frontend: telas

## Task 7: `useRanking` via TanStack Query + RankingPage

**Files:**
- Modify: `frontend/src/hooks/useRanking.ts`
- Modify: `frontend/src/pages/RankingPage.tsx`
- Create: `frontend/src/hooks/useRanking.test.tsx`

- [ ] **Step 1: Escrever o teste que falha** (`frontend/src/hooks/useRanking.test.tsx`)

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useRanking } from "./useRanking";
import * as rankingApi from "@/api/endpoints/ranking";

vi.mock("@/api/endpoints/ranking");

const ITEM = {
  ticker: "AAAA11", nome: "Fundo A", segmento: "Logística",
  score: 82.5, classificacao: "Excelente",
  dy_atual: 10, dy_12m: 10, p_vp: 0.92,
  vacancia_fisica: null, vacancia_financeira: null,
  liquidez_diaria: 18, volatilidade_12m: 8.5,
  patrimonio_liquido: 5, num_cotistas: 300,
};

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => vi.resetAllMocks());

describe("useRanking", () => {
  it("carrega o ranking do backend", async () => {
    vi.mocked(rankingApi.getRanking).mockResolvedValue([ITEM]);
    const { result } = renderHook(() => useRanking(), { wrapper });
    await waitFor(() => expect(result.current.fundos).toHaveLength(1));
    expect(result.current.fundos[0].ticker).toBe("AAAA11");
  });

  it("filtra por busca sem quebrar quando nome é null", async () => {
    vi.mocked(rankingApi.getRanking).mockResolvedValue([{ ...ITEM, nome: null }]);
    const { result } = renderHook(() => useRanking(), { wrapper });
    await waitFor(() => expect(result.current.fundos).toHaveLength(1));
    result.current.setBusca("zzz");
    await waitFor(() => expect(result.current.fundos).toHaveLength(0));
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd frontend && npx vitest run src/hooks/useRanking.test.tsx`
Expected: FAIL (hook ainda usa mock/lib local).

- [ ] **Step 3: Reescrever `frontend/src/hooks/useRanking.ts`**

```typescript
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getRanking, simularRanking } from "@/api/endpoints/ranking";
import { usePerfilStore } from "@/stores/perfilStore";
import type { RankingItem } from "@/types/ranking";
import type { Classificacao } from "@/types/domain";

interface UseRankingResult {
  fundos: RankingItem[];
  isLoading: boolean;
  isError: boolean;
  filtro: Classificacao | "Todas";
  setFiltro: (f: Classificacao | "Todas") => void;
  busca: string;
  setBusca: (b: string) => void;
}

export function useRanking(): UseRankingResult {
  const tipo = usePerfilStore((s) => s.tipo);
  const pesosCustom = usePerfilStore((s) => s.pesosCustom);
  const [filtro, setFiltro] = useState<Classificacao | "Todas">("Todas");
  const [busca, setBusca] = useState("");

  const query = useQuery({
    queryKey: ["ranking", pesosCustom ?? tipo],
    queryFn: () =>
      pesosCustom ? simularRanking(pesosCustom) : getRanking(tipo),
  });

  const fundos = useMemo(() => {
    const lista = query.data ?? [];
    return lista.filter((f) => {
      const passaFiltro = filtro === "Todas" || f.classificacao === filtro;
      const termo = busca.toLowerCase();
      const passaBusca =
        busca === "" ||
        f.ticker.toLowerCase().includes(termo) ||
        (f.nome ?? "").toLowerCase().includes(termo);
      return passaFiltro && passaBusca;
    });
  }, [query.data, filtro, busca]);

  return {
    fundos,
    isLoading: query.isLoading,
    isError: query.isError,
    filtro,
    setFiltro,
    busca,
    setBusca,
  };
}
```

> Nota: `classificacao` vem como `string` do tipo gerado; o cast para `Classificacao` no filtro é seguro porque o backend só emite os 4 valores. Se o `tsc` reclamar, comparar via `f.classificacao === (filtro as string)`.

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd frontend && npx vitest run src/hooks/useRanking.test.tsx`
Expected: PASS.

- [ ] **Step 5: Ligar loading/erro na `RankingPage`**

Em `RankingPage.tsx`: trocar a desestruturação para incluir `isLoading, isError`; e logo após `const { ... } = useRanking();` adicionar, antes do `return` principal, o tratamento (importar `Skeleton` de `@/components/ui/skeleton` e `ErrorState` de `@/components/ui/ErrorState`):

```tsx
  if (isError) {
    return <ErrorState message="Não foi possível carregar o ranking." />;
  }
```

E, dentro do container da tabela, quando `isLoading`, renderizar linhas de `Skeleton` no lugar do corpo. Implementação mínima: acima do `<Table>`, se `isLoading`, retornar um bloco de skeleton:

```tsx
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }
```

(Colocar esses dois blocos logo após obter o hook, antes de montar a `table`. Confirmar a assinatura do `ErrorState` em `src/components/ui/ErrorState.tsx` e ajustar o nome da prop se necessário.)

- [ ] **Step 6: Verificação manual ponta a ponta**

Run (dois terminais): `cd backend && uvicorn app.main:app --reload` e `cd frontend && npm run dev`.
Abrir `http://localhost:5173/ranking`: a tabela mostra dados reais; trocar de perfil em `/perfil` re-ordena; busca/filtro/paginação funcionam.

- [ ] **Step 7: Lint, type-check e commit**

Run: `cd frontend && npm run lint && npx tsc -b --noEmit`
Propor a Hiago:

```bash
git add frontend/src/hooks/useRanking.ts frontend/src/hooks/useRanking.test.tsx frontend/src/pages/RankingPage.tsx
git commit -m "feat(ranking): RankingPage consome API real via TanStack Query"
```

---

## Task 8: `useDashboard` derivado + DashboardPage

**Files:**
- Modify: `frontend/src/hooks/useDashboard.ts`
- Modify: `frontend/src/pages/DashboardPage.tsx`
- Create: `frontend/src/hooks/useDashboard.test.tsx`

- [ ] **Step 1: Escrever o teste que falha** (`frontend/src/hooks/useDashboard.test.tsx`)

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useDashboard } from "./useDashboard";
import * as rankingApi from "@/api/endpoints/ranking";

vi.mock("@/api/endpoints/ranking");

const mk = (ticker: string, score: number, cls: string) => ({
  ticker, nome: ticker, segmento: "Logística", score, classificacao: cls,
  dy_atual: 10, dy_12m: 10, p_vp: 0.9,
  vacancia_fisica: null, vacancia_financeira: null,
  liquidez_diaria: 10, volatilidade_12m: 9,
  patrimonio_liquido: 3, num_cotistas: 200,
});

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => vi.resetAllMocks());

describe("useDashboard", () => {
  it("deriva média, distribuição e top 6", async () => {
    vi.mocked(rankingApi.getRanking).mockResolvedValue([
      mk("A", 90, "Excelente"), mk("B", 50, "Regular"),
    ]);
    const { result } = renderHook(() => useDashboard(), { wrapper });
    await waitFor(() => expect(result.current.totalFiis).toBe(2));
    expect(result.current.scoreMedio).toBe(70);
    expect(result.current.distribuicao.Excelente).toBe(1);
    expect(result.current.distribuicao.Regular).toBe(1);
    expect(result.current.topFiis[0].ticker).toBe("A");
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd frontend && npx vitest run src/hooks/useDashboard.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Reescrever `frontend/src/hooks/useDashboard.ts`**

```typescript
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getRanking, simularRanking } from "@/api/endpoints/ranking";
import { usePerfilStore } from "@/stores/perfilStore";
import type { RankingItem } from "@/types/ranking";
import type { Classificacao } from "@/types/domain";

interface DashboardData {
  scoreMedio: number;
  totalFiis: number;
  topFiis: RankingItem[];
  distribuicao: Record<Classificacao, number>;
  isLoading: boolean;
  isError: boolean;
}

export function useDashboard(): DashboardData {
  const tipo = usePerfilStore((s) => s.tipo);
  const pesosCustom = usePerfilStore((s) => s.pesosCustom);

  const query = useQuery({
    queryKey: ["ranking", pesosCustom ?? tipo],
    queryFn: () => (pesosCustom ? simularRanking(pesosCustom) : getRanking(tipo)),
  });

  return useMemo(() => {
    const lista = query.data ?? [];
    const distribuicao: Record<Classificacao, number> = {
      Excelente: 0, Bom: 0, Regular: 0, Evitar: 0,
    };
    lista.forEach((f) => {
      distribuicao[f.classificacao as Classificacao]++;
    });
    const scoreMedio =
      lista.length > 0
        ? Math.round((lista.reduce((a, f) => a + f.score, 0) / lista.length) * 10) / 10
        : 0;
    return {
      scoreMedio,
      totalFiis: lista.length,
      topFiis: lista.slice(0, 6),
      distribuicao,
      isLoading: query.isLoading,
      isError: query.isError,
    };
  }, [query.data, query.isLoading, query.isError]);
}
```

> A queryKey é idêntica à do `useRanking`, então as duas telas compartilham o cache da mesma requisição.

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd frontend && npx vitest run src/hooks/useDashboard.test.tsx`
Expected: PASS.

- [ ] **Step 5: Ajustar `DashboardPage.tsx`**

- Trocar `const { scoreMedio, totalFiis, topFiis, distribuicao } = useDashboard();` para incluir `isLoading, isError`.
- Remover a linha `const isLoading = false; // preparado para TanStack Query`.
- Antes do `return`, adicionar `if (isError) return <ErrorState message="Não foi possível carregar o dashboard." />;` (importar `ErrorState`).
- O `FiiCard` recebe `nome={fii.nome}` — como `nome` pode ser `null`, passar `nome={fii.nome ?? fii.ticker}`.
- `FiiCard.classificacao` espera o union `Classificacao`, mas a API entrega `string` → passar `classificacao={fii.classificacao as Classificacao}` (importar `Classificacao` de `@/types/domain`, já importado na página).

- [ ] **Step 6: Verificação manual**

Abrir `http://localhost:5173/`: cards com dados reais; skeleton aparece no carregamento; trocar perfil muda os números.

- [ ] **Step 7: Lint, type-check e commit**

Run: `cd frontend && npm run lint && npx tsc -b --noEmit`
Propor a Hiago:

```bash
git add frontend/src/hooks/useDashboard.ts frontend/src/hooks/useDashboard.test.tsx frontend/src/pages/DashboardPage.tsx
git commit -m "feat(dashboard): DashboardPage deriva métricas da query de ranking"
```

---

## Task 9: `useClusters` + ClustersPage com dados reais

**Files:**
- Create: `frontend/src/hooks/useClusters.ts`
- Modify: `frontend/src/pages/ClustersPage.tsx`
- Create: `frontend/src/hooks/useClusters.test.tsx`

- [ ] **Step 1: Escrever o teste que falha** (`frontend/src/hooks/useClusters.test.tsx`)

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useClusters } from "./useClusters";
import * as clustersApi from "@/api/endpoints/clusters";

vi.mock("@/api/endpoints/clusters");

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => vi.resetAllMocks());

it("carrega clusters do backend", async () => {
  vi.mocked(clustersApi.getClusters).mockResolvedValue([
    {
      id: 1, nome_interpretado: "Tijolo Conservador", perfil_risco: "conservador",
      descricao: "desc", dy_medio: 0.08, volatilidade_media: 0.09,
      p_vp_medio: 0.9, num_fiis: 12, tickers: ["AAAA11", "BBBB11"],
    },
  ]);
  const { result } = renderHook(() => useClusters(), { wrapper });
  await waitFor(() => expect(result.current.clusters).toHaveLength(1));
  expect(result.current.clusters[0].nome_interpretado).toBe("Tijolo Conservador");
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd frontend && npx vitest run src/hooks/useClusters.test.tsx`
Expected: FAIL (hook inexistente).

- [ ] **Step 3: Criar `frontend/src/hooks/useClusters.ts`**

```typescript
import { useQuery } from "@tanstack/react-query";
import { getClusters } from "@/api/endpoints/clusters";
import type { ClusterItem } from "@/types/ranking";

export function useClusters() {
  const query = useQuery({ queryKey: ["clusters"], queryFn: getClusters });
  return {
    clusters: (query.data ?? []) as ClusterItem[],
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd frontend && npx vitest run src/hooks/useClusters.test.tsx`
Expected: PASS.

- [ ] **Step 5: Reescrever a grade de cards da `ClustersPage.tsx`**

Remover `CLUSTERS_PLACEHOLDER` e o card de aviso "Aguardando dados do backend". Manter o cabeçalho e o card "Algoritmo K-Means". Substituir a seção de cards por dados reais. Mapa de cores por `perfil_risco`:

```tsx
import { useClusters } from "@/hooks/useClusters";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
// ...

const CORES_PERFIL: Record<string, { card: string; dot: string }> = {
  conservador: { card: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20", dot: "bg-emerald-500" },
  moderado:    { card: "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20", dot: "bg-blue-500" },
  arrojado:    { card: "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20", dot: "bg-amber-500" },
};

function fmtPct(v: number | null): string {
  return v !== null ? `${(v * 100).toFixed(1)}%` : "—";
}
```

Dentro do componente:

```tsx
  const { clusters, isLoading, isError } = useClusters();

  if (isError) return <ErrorState message="Não foi possível carregar os clusters." />;
```

E a grade (no lugar do `.map(CLUSTERS_PLACEHOLDER)`):

```tsx
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full rounded-lg" />
            ))
          : clusters.map((c) => {
              const cor = CORES_PERFIL[c.perfil_risco] ?? CORES_PERFIL.moderado;
              return (
                <div key={c.id} className={cn("relative w-full rounded-lg border p-6 shadow-sm", cor.card)}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn("size-2 rounded-full", cor.dot)} />
                    <p className="font-semibold text-gray-900 dark:text-gray-50">{c.nome_interpretado}</p>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    Perfil {c.perfil_risco} · {c.num_fiis} FIIs
                  </span>
                  {c.descricao && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 my-3">{c.descricao}</p>
                  )}
                  <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                    <div><p className="text-gray-400 text-xs">DY médio</p><p className="font-medium">{fmtPct(c.dy_medio)}</p></div>
                    <div><p className="text-gray-400 text-xs">Volatilidade</p><p className="font-medium">{fmtPct(c.volatilidade_media)}</p></div>
                    <div><p className="text-gray-400 text-xs">P/VP médio</p><p className="font-medium">{c.p_vp_medio !== null ? c.p_vp_medio.toFixed(2) : "—"}</p></div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {c.tickers.map((t) => (
                      <span key={t} className="font-mono text-xs bg-white/60 dark:bg-gray-800/60 border border-current/10 rounded px-1.5 py-0.5">{t}</span>
                    ))}
                  </div>
                </div>
              );
            })}
      </div>
```

Atualizar o subtítulo de "Clusters esperados (pré-visualização heurística)" para "Clusters identificados".

- [ ] **Step 6: Verificação manual**

Abrir `http://localhost:5173/clusters`: 4 cards reais com tickers; skeleton no load.

- [ ] **Step 7: Lint, type-check e commit**

Run: `cd frontend && npm run lint && npx tsc -b --noEmit`
Propor a Hiago:

```bash
git add frontend/src/hooks/useClusters.ts frontend/src/hooks/useClusters.test.tsx frontend/src/pages/ClustersPage.tsx
git commit -m "feat(clusters): ClustersPage consome /clusters real e remove placeholder"
```

---

## Task 10: PerfilPage via `/ranking/simular`, alinhar chaves de pesos e remover scoring/mocks

**Files:**
- Modify: `frontend/src/types/domain.ts`
- Modify: `frontend/src/lib/pesosSchema.ts`
- Modify: `frontend/src/stores/perfilStore.ts`
- Modify: `frontend/src/pages/PerfilPage.tsx`
- Delete: `frontend/src/lib/scoring.ts`, `frontend/src/lib/scoring.test.ts`, `frontend/src/mocks/`

- [ ] **Step 1: Definir o tipo de pesos com chaves do backend em `types/domain.ts`**

Adicionar ao final:

```typescript
// Pesos do modelo (frações que somam 1.0). Chaves iguais às do backend.
export interface PesosIndicadores {
  dy_atual: number;
  dy_12m: number;
  p_vp: number;
  vacancia_fisica: number;
  vacancia_financeira: number;
  liquidez_diaria: number;
  volatilidade_12m: number;
  patrimonio_liquido: number;
  num_cotistas: number;
  segmento: number;
}
```

- [ ] **Step 2: Apontar `perfilStore.ts` para o novo tipo**

Trocar `import type { PesosIndicadores } from "@/lib/scoring";` por `import type { PesosIndicadores } from "@/types/domain";`. O resto do store fica igual.

- [ ] **Step 3: Alinhar `pesosSchema.ts` às chaves do backend**

Substituir as chaves do `basePesos`:

```typescript
const basePesos = z.object({
  dy_atual:            campoSchema,
  dy_12m:              campoSchema,
  p_vp:                campoSchema,
  vacancia_fisica:     campoSchema,
  vacancia_financeira: campoSchema,
  liquidez_diaria:     campoSchema,
  volatilidade_12m:    campoSchema,
  patrimonio_liquido:  campoSchema,
  num_cotistas:        campoSchema,
  segmento:            campoSchema,
});
```

- [ ] **Step 4: Escrever o teste que falha do preview** (`frontend/src/pages/PerfilPage.test.tsx`)

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PerfilPage } from "./PerfilPage";
import * as rankingApi from "@/api/endpoints/ranking";

vi.mock("@/api/endpoints/ranking");

beforeEach(() => vi.resetAllMocks());

it("renderiza os 3 cards de perfil", () => {
  const qc = new QueryClient();
  vi.mocked(rankingApi.simularRanking).mockResolvedValue([]);
  render(
    <QueryClientProvider client={qc}>
      <PerfilPage />
    </QueryClientProvider>
  );
  expect(screen.getByText("Conservador")).toBeInTheDocument();
  expect(screen.getByText("Moderado")).toBeInTheDocument();
  expect(screen.getByText("Arrojado")).toBeInTheDocument();
});
```

- [ ] **Step 5: Rodar e confirmar que falha**

Run: `cd frontend && npx vitest run src/pages/PerfilPage.test.tsx`
Expected: FAIL (PerfilPage importa de `@/lib/scoring` e `@/mocks`, que serão removidos — o teste guia a refatoração).

- [ ] **Step 6: Refatorar `PerfilPage.tsx` para usar o backend no preview**

Mudanças em `PerfilPage.tsx`:
- Remover `import { calcularScoreComPesos, classificar, type PesosIndicadores } from "@/lib/scoring";` e `import { FUNDOS_MOCK } from "@/mocks";`.
- Adicionar `import type { PesosIndicadores } from "@/types/domain";`, `import { useQuery } from "@tanstack/react-query";` e `import { simularRanking } from "@/api/endpoints/ranking";`.
- As chaves dos `defaultValues`, `INDICADORES`, `PESOS_PADRAO_MODERADO`, e o objeto `pesos` montado no `onSubmit`/preview passam a usar `liquidez_diaria`, `volatilidade_12m`, `patrimonio_liquido`, `num_cotistas` (em vez de `liquidez`, `volatilidade`, `pl`, `cotistas`).
- Substituir o cálculo client-side do `previewTop3` por uma query que chama `simularRanking` quando a soma é 100:

```tsx
  const pesosFracao: PesosIndicadores | null =
    Math.abs(soma - 100) < 0.01
      ? {
          dy_atual: valores.dy_atual / 100,
          dy_12m: valores.dy_12m / 100,
          p_vp: valores.p_vp / 100,
          vacancia_fisica: valores.vacancia_fisica / 100,
          vacancia_financeira: valores.vacancia_financeira / 100,
          liquidez_diaria: valores.liquidez_diaria / 100,
          volatilidade_12m: valores.volatilidade_12m / 100,
          patrimonio_liquido: valores.patrimonio_liquido / 100,
          num_cotistas: valores.num_cotistas / 100,
          segmento: valores.segmento / 100,
        }
      : null;

  const previewQuery = useQuery({
    queryKey: ["preview", pesosFracao],
    queryFn: () => simularRanking(pesosFracao!),
    enabled: pesosFracao !== null,
  });
  const previewTop3 = (previewQuery.data ?? []).slice(0, 3);
```

- No JSX do preview, usar `f.score` e `f.classificacao` direto dos itens (já vêm do backend). Remover o uso de `classificar`.
- No `onSubmit`, montar o `PesosIndicadores` com as mesmas chaves do backend e chamar `setPesosCustom`.

- [ ] **Step 7: Deletar scoring e mocks**

Run:
```bash
cd frontend && rm src/lib/scoring.ts src/lib/scoring.test.ts && rm -r src/mocks
```

- [ ] **Step 8: Garantir que nada mais importa o que foi removido**

Run: `cd frontend && grep -rn "lib/scoring\|@/mocks\|FUNDOS_MOCK" src/`
Expected: nenhum resultado.

- [ ] **Step 9: Rodar a suíte e o type-check**

Run: `cd frontend && npm test && npx tsc -b --noEmit`
Expected: todos os testes PASS, sem erros de tipo.

- [ ] **Step 10: Verificação manual**

Abrir `http://localhost:5173/perfil`: ajustar pesos (soma 100) atualiza o "Top 3" via backend; "Aplicar pesos" passa a refletir em `/ranking` e `/`.

- [ ] **Step 11: Lint e commit**

Run: `cd frontend && npm run lint`
Propor a Hiago:

```bash
git add -A frontend/src
git commit -m "feat(perfil): preview e pesos custom via /ranking/simular; remove scoring/mocks do front"
```

---

# Verificação final (após todas as tasks)

- [ ] `cd backend && pytest -q` → tudo verde.
- [ ] `cd frontend && npm test` → tudo verde.
- [ ] `cd frontend && npx tsc -b --noEmit && npm run lint` → sem erros.
- [ ] Backend + frontend rodando: as 4 telas (Dashboard, Ranking, Clusters, Perfil) exibem dados reais; trocar de perfil/pesos repercute em Dashboard e Ranking; estados de loading e erro aparecem corretamente.

---

## Notas de design carregadas do spec
- Fonte única do score = backend; front é consumidor puro.
- `GET /ranking?perfil=` (presets) + `POST /ranking/simular` (custom).
- Unidades convertidas para display no backend (`montar_ranking`): DY/volatilidade ×100, liquidez ÷1e6, PL ÷1e9, cotistas ÷1000, p/vp sem conversão. _Verificado contra o DB em 2026-05-31._
- Perfil permanece no Zustand+localStorage; `GET/PUT /perfil` do backend fica como trabalho futuro.
- Vacância está 100% nula no banco → colunas/labels mostram "—"; a redistribuição da dimensão Risco já trata isso no backend.
