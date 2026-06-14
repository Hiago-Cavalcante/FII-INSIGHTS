# RF-27/29 — Rebalanceamento + Preço-teto — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (inline) ou subagent-driven-development. Steps usam checkbox (`- [ ]`).

**Goal:** Sub-aba "Recomendações" na Carteira: preço-teto (Bazin, yield-alvo por classe) dos fundos da carteira + sugestão de rebalanceamento por alocação-alvo de classe (FII×FIAGRO).

**Architecture:** Serviços backend determinísticos (`recomendacao_service`) consumidos por `GET /carteira/recomendacoes`. Preço-teto = proventos 12m ÷ yield-alvo; precisa de `indicadores.preco_atual` (nova coluna, coletada do screener `price` e do HTML `Valor atual`). Rebalanceamento compara `resumo_carteira.por_classe` com um alvo editável.

**Tech Stack:** Python 3.11, FastAPI, SQLAlchemy, Alembic, pytest; React+TS, TanStack Query. Testes via `wsl.exe bash -lc "cd /home/hiago/projetos/fii-insights/backend && .venv/bin/python -m pytest ..."`.

---

## Comandos (WSL)
- pytest: `wsl.exe bash -lc "cd /home/hiago/projetos/fii-insights/backend && .venv/bin/python -m pytest <args>"`
- alembic: idem com `.venv/bin/alembic`
- front: `wsl.exe bash -lc 'export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:$PATH"; cd /home/hiago/projetos/fii-insights/frontend && <cmd>'`

## Mapa de arquivos
- Modificar: `backend/app/models/indicador.py` (+`preco_atual`)
- Criar: migração `indicadores.preco_atual`
- Modificar: `backend/app/utils/parsers/status_invest_json.py` (`normalizar_screener_item` +`preco_atual`)
- Modificar: `backend/app/utils/parsers/status_invest.py` (`extrair_fundamentais` retorna `preco_atual`)
- Criar: `backend/app/services/recomendacao_service.py`
- Modificar: `backend/app/routers/carteira.py` (endpoint `/carteira/recomendacoes`)
- Testes: `test_recomendacao_service.py`, ajustes em `test_status_invest_json.py`/`test_status_invest_parser.py`/`test_carteira_router.py`
- Front: `types/api.ts`, `hooks/useRecomendacoes.ts`, `components/carteira/RecomendacoesView.tsx`, `pages/CarteiraPage.tsx`

---

## Task 1: Coluna `preco_atual` no Indicador + migração

**Files:** `backend/app/models/indicador.py`, migração, `backend/tests/test_models.py` (opcional)

- [ ] **Step 1: Modelo** — em `indicador.py`, após `num_cotistas`:
```python
    preco_atual: Mapped[float | None] = mapped_column(Float)
```
- [ ] **Step 2: Migração** — `wsl.exe bash -lc "cd .../backend && .venv/bin/alembic revision --autogenerate -m 'preco_atual em indicadores (RF-29)'"`. Revisar: deve conter só `add_column('indicadores', sa.Column('preco_atual', sa.Float(), nullable=True))`.
- [ ] **Step 3: Aplicar** — `.venv/bin/alembic upgrade head`. Esperado: OK.
- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat(indicadores): coluna preco_atual (RF-29)"`

---

## Task 2: Coleta grava `preco_atual`

**Files:** `status_invest_json.py`, `status_invest.py`, `tests/test_status_invest_json.py`, `tests/test_status_invest_parser.py`

- [ ] **Step 1: Teste falhando (screener)** — em `test_status_invest_json.py`:
```python
def test_normalizar_screener_inclui_preco_atual():
    from app.utils.parsers.status_invest_json import normalizar_screener_item
    item = {"ticker": "X", "price": 100.5, "lastdividend": 1.0, "dy": 8.0}
    assert normalizar_screener_item(item)["preco_atual"] == 100.5
```
- [ ] **Step 2: RED** — `... -m pytest tests/test_status_invest_json.py::test_normalizar_screener_inclui_preco_atual -v` → KeyError/None.
- [ ] **Step 3: Implementar** — em `normalizar_screener_item`, adicionar ao dict retornado:
```python
        "preco_atual": fnum(item.get("price")),
```
- [ ] **Step 4: Teste falhando (HTML)** — em `test_status_invest_parser.py`, usar a fixture HGLG11 e afirmar que `extrair_fundamentais(html)["preco_atual"]` não é None (o HTML tem "Valor atual").
- [ ] **Step 5: Implementar HTML** — em `extrair_fundamentais`, adicionar `"preco_atual": preco,` ao dict (a variável `preco` já é lida para o `dy_atual`).
- [ ] **Step 6: GREEN** — rodar os dois arquivos de teste → PASS.
- [ ] **Step 7: Commit** — `feat(coleta): grava preco_atual do screener e do HTML (RF-29)`

---

## Task 3: `recomendacao_service` — Bazin + proventos 12m

**Files:** Criar `backend/app/services/recomendacao_service.py`, `backend/tests/test_recomendacao_service.py`

- [ ] **Step 1: Testes falhando**
```python
from datetime import date, timedelta
from decimal import Decimal

from app.models.fundo import Fundo
from app.models.provento import Provento
from app.services.recomendacao_service import calcular_preco_teto, proventos_ultimos_12m


def test_calcular_preco_teto_bazin():
    # 12 de R$1,00 = R$12 anuais; yield-alvo 8% -> teto 150,00
    assert calcular_preco_teto(Decimal("12.00"), 0.08) == Decimal("150.00")


def test_preco_teto_sem_proventos_eh_none():
    assert calcular_preco_teto(Decimal("0"), 0.08) is None
    assert calcular_preco_teto(None, 0.08) is None


def test_proventos_ultimos_12m_soma_janela(db_session):
    f = Fundo(ticker="AAAA11", classe="FII")
    db_session.add(f); db_session.flush()
    hoje = date(2026, 6, 1)
    db_session.add_all([
        Provento(fundo_id=f.id, data_com=hoje, tipo="rendimento",
                 data_pagamento=hoje - timedelta(days=30), valor_por_cota=Decimal("1.00")),
        Provento(fundo_id=f.id, data_com=hoje, tipo="rendimento",
                 data_pagamento=hoje - timedelta(days=400), valor_por_cota=Decimal("9.99")),  # fora da janela
    ])
    db_session.commit()
    assert proventos_ultimos_12m(db_session, f.id, hoje=hoje) == Decimal("1.00")
```
- [ ] **Step 2: RED** — `... -m pytest tests/test_recomendacao_service.py -v` → ImportError.
- [ ] **Step 3: Implementar**
```python
from __future__ import annotations

from datetime import date, timedelta
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.provento import Provento

_CENTAVO = Decimal("0.01")


def calcular_preco_teto(proventos_12m: Decimal | None, yield_alvo: float) -> Decimal | None:
    """Preço-teto de Bazin: proventos anuais ÷ yield-alvo. None se faltar dado."""
    if proventos_12m is None or proventos_12m <= 0 or yield_alvo <= 0:
        return None
    return (proventos_12m / Decimal(str(yield_alvo))).quantize(_CENTAVO, rounding=ROUND_HALF_UP)


def proventos_ultimos_12m(db: Session, fundo_id: int, hoje: date | None = None) -> Decimal:
    """Soma valor_por_cota dos rendimentos PAGOS nos últimos 12 meses."""
    hoje = hoje or date.today()
    inicio = hoje - timedelta(days=365)
    valores = db.scalars(
        select(Provento.valor_por_cota).where(
            Provento.fundo_id == fundo_id,
            Provento.tipo == "rendimento",
            Provento.data_pagamento.is_not(None),
            Provento.data_pagamento >= inicio,
            Provento.data_pagamento <= hoje,
        )
    )
    return sum(valores, Decimal("0"))
```
- [ ] **Step 4: GREEN** — PASS.
- [ ] **Step 5: Commit** — `feat(recomendacao): preco-teto Bazin e soma de proventos 12m (RF-29)`

---

## Task 4: `recomendacao_service` — análise por posição + rebalanceamento

**Files:** `recomendacao_service.py`, `test_recomendacao_service.py`

- [ ] **Step 1: Testes falhando**
```python
from app.services.recomendacao_service import analisar_precos_teto, sugerir_rebalanceamento


def test_rebalanceamento_aportar_mais_quando_abaixo_do_alvo():
    r = sugerir_rebalanceamento({"FII": Decimal("9000"), "FIAGRO": Decimal("1000")}, Decimal("10000"), alvo_fii=0.80)
    classes = {c["classe"]: c for c in r["classes"]}
    assert classes["FIAGRO"]["sugestao"] == "Aportar mais"   # 10% atual < 20% alvo - banda
    assert classes["FII"]["sugestao"] == "Reduzir ritmo"     # 90% > 80% + banda


def test_rebalanceamento_equilibrado_dentro_da_banda():
    r = sugerir_rebalanceamento({"FII": Decimal("8200"), "FIAGRO": Decimal("1800")}, Decimal("10000"), alvo_fii=0.80)
    assert all(c["sugestao"] == "Equilibrado" for c in r["classes"])  # 82/18 dentro de ±5pp


def test_rebalanceamento_carteira_vazia():
    r = sugerir_rebalanceamento({"FII": Decimal("0"), "FIAGRO": Decimal("0")}, Decimal("0"), alvo_fii=0.80)
    assert r["total_investido"] == Decimal("0")
    assert r["classes"] == []


def test_analisar_precos_teto_status_e_margem(db_session):
    from datetime import date, timedelta
    from app.models.fundo import Fundo
    from app.models.indicador import Indicador
    from app.models.posicao import Posicao
    from app.models.provento import Provento

    f = Fundo(ticker="KNCA11", classe="FIAGRO"); db_session.add(f); db_session.flush()
    hoje = date.today()
    # 12 proventos de 1,00 -> 12 anuais; yield FIAGRO 0.12 -> teto 100,00
    db_session.add_all([
        Provento(fundo_id=f.id, data_com=hoje - timedelta(days=15 * i), tipo="rendimento",
                 data_pagamento=hoje - timedelta(days=15 * i), valor_por_cota=Decimal("1.00"))
        for i in range(12)
    ])
    db_session.add(Indicador(fundo_id=f.id, data_referencia=hoje, preco_atual=90.0))
    db_session.add(Posicao(usuario_id=1, fundo_id=f.id, quantidade=10,
                           preco_medio=Decimal("95"), valor_investido=Decimal("950")))
    db_session.commit()

    itens = analisar_precos_teto(db_session, usuario_id=1, yield_fii=0.08, yield_fiagro=0.12)
    item = next(i for i in itens if i["ticker"] == "KNCA11")
    assert item["preco_teto"] == Decimal("100.00")
    assert item["status"] == "Abaixo do teto"           # 90 <= 100
    assert item["margem_seguranca"] > 0                  # desconto
```
- [ ] **Step 2: RED** — ImportError.
- [ ] **Step 3: Implementar** (acrescentar ao service):
```python
from typing import TypedDict

from app.repositories.indicador_repository import IndicadorRepository
from app.repositories.posicao_repository import PosicaoRepository

YIELD_FII_DEFAULT = 0.08
YIELD_FIAGRO_DEFAULT = 0.13
ALVO_FII_DEFAULT = 0.80
BANDA = 0.05


class PrecoTetoItem(TypedDict):
    ticker: str
    nome: str | None
    classe: str
    preco_medio: Decimal
    preco_atual: Decimal | None
    preco_teto: Decimal | None
    margem_seguranca: float | None
    status: str


class ClasseRebal(TypedDict):
    classe: str
    atual_pct: float
    alvo_pct: float
    desvio_pct: float
    sugestao: str


class Rebalanceamento(TypedDict):
    total_investido: Decimal
    alvo_fii: float
    classes: list[ClasseRebal]


def analisar_precos_teto(
    db: Session, usuario_id: int, yield_fii: float = YIELD_FII_DEFAULT,
    yield_fiagro: float = YIELD_FIAGRO_DEFAULT,
) -> list[PrecoTetoItem]:
    ind_repo = IndicadorRepository(db)
    itens: list[PrecoTetoItem] = []
    for p in PosicaoRepository(db).listar_por_usuario(usuario_id):
        classe = p.fundo.classe
        yield_alvo = yield_fiagro if classe == "FIAGRO" else yield_fii
        teto = calcular_preco_teto(proventos_ultimos_12m(db, p.fundo_id), yield_alvo)
        ind = ind_repo.buscar_mais_recente(p.fundo_id)
        preco_atual = (
            Decimal(str(ind.preco_atual)).quantize(_CENTAVO)
            if ind is not None and ind.preco_atual is not None
            else None
        )
        if teto is None or preco_atual is None:
            margem, status = None, "Sem dados"
        else:
            margem = round(float((teto - preco_atual) / preco_atual), 4)
            status = "Abaixo do teto" if preco_atual <= teto else "Acima do teto"
        itens.append({
            "ticker": p.fundo.ticker, "nome": p.fundo.nome, "classe": classe,
            "preco_medio": p.preco_medio, "preco_atual": preco_atual,
            "preco_teto": teto, "margem_seguranca": margem, "status": status,
        })
    return itens


def sugerir_rebalanceamento(
    por_classe: dict[str, Decimal], total: Decimal, alvo_fii: float = ALVO_FII_DEFAULT,
) -> Rebalanceamento:
    if total <= 0:
        return {"total_investido": Decimal("0"), "alvo_fii": alvo_fii, "classes": []}
    alvos = {"FII": alvo_fii, "FIAGRO": round(1.0 - alvo_fii, 4)}
    classes: list[ClasseRebal] = []
    for classe, alvo in alvos.items():
        atual = round(float(por_classe.get(classe, Decimal("0")) / total), 4)
        desvio = round(atual - alvo, 4)
        if desvio < -BANDA:
            sugestao = "Aportar mais"
        elif desvio > BANDA:
            sugestao = "Reduzir ritmo"
        else:
            sugestao = "Equilibrado"
        classes.append({"classe": classe, "atual_pct": atual, "alvo_pct": alvo,
                        "desvio_pct": desvio, "sugestao": sugestao})
    return {"total_investido": total, "alvo_fii": alvo_fii, "classes": classes}
```
- [ ] **Step 4: GREEN** — PASS. (Conferir `IndicadorRepository.buscar_mais_recente` existe — usado em test_coleta.)
- [ ] **Step 5: Commit** — `feat(recomendacao): analise de preco-teto por posicao e rebalanceamento por classe (RF-27, RF-29)`

---

## Task 5: Endpoint `GET /carteira/recomendacoes`

**Files:** `backend/app/routers/carteira.py`, `backend/tests/test_carteira_router.py`

- [ ] **Step 1: Teste falhando** — usar a fixture `client_carteira` (cliente + factory de usuário autenticado):
```python
def test_recomendacoes_exige_auth(client_carteira):
    client, _ = client_carteira
    assert client.get("/api/v1/carteira/recomendacoes").status_code == 401


def test_recomendacoes_retorna_estrutura(client_carteira):
    client, novo_usuario = client_carteira
    headers = novo_usuario("rec@b.com")
    client.post("/api/v1/carteira/posicoes", json={"ticker": "HGLG11", "quantidade": 10, "preco": 100}, headers=headers)
    r = client.get("/api/v1/carteira/recomendacoes", headers=headers)
    assert r.status_code == 200
    body = r.json()
    assert "precos_teto" in body and "rebalanceamento" in body
    assert body["rebalanceamento"]["alvo_fii"] == 0.8  # default
```
(Confirmar o prefixo real das rotas no `test_carteira_router.py` existente — usar o mesmo.)
- [ ] **Step 2: RED** — 404.
- [ ] **Step 3: Implementar** — em `carteira.py`, schemas Pydantic espelhando os TypedDicts + endpoint:
```python
from fastapi import Query
from app.services.recomendacao_service import analisar_precos_teto, sugerir_rebalanceamento


class PrecoTetoOut(BaseModel):
    ticker: str
    nome: str | None
    classe: str
    preco_medio: Decimal
    preco_atual: Decimal | None
    preco_teto: Decimal | None
    margem_seguranca: float | None
    status: str


class ClasseRebalOut(BaseModel):
    classe: str
    atual_pct: float
    alvo_pct: float
    desvio_pct: float
    sugestao: str


class RebalanceamentoOut(BaseModel):
    total_investido: Decimal
    alvo_fii: float
    classes: list[ClasseRebalOut]


class RecomendacoesOut(BaseModel):
    precos_teto: list[PrecoTetoOut]
    rebalanceamento: RebalanceamentoOut


@router.get("/recomendacoes", response_model=RecomendacoesOut)
def recomendacoes(
    yield_fii: float = Query(0.08, gt=0),
    yield_fiagro: float = Query(0.13, gt=0),
    alvo_fii: float = Query(0.80, ge=0, le=1),
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RecomendacoesOut:
    """Preço-teto (Bazin) dos fundos da carteira + rebalanceamento por classe (RF-27/29)."""
    precos = analisar_precos_teto(db, usuario.id, yield_fii, yield_fiagro)
    resumo = resumo_carteira(db, usuario.id)
    rebal = sugerir_rebalanceamento(resumo["por_classe"], resumo["total_investido"], alvo_fii)
    return RecomendacoesOut(
        precos_teto=[PrecoTetoOut(**p) for p in precos],
        rebalanceamento=RebalanceamentoOut(**rebal),
    )
```
- [ ] **Step 4: GREEN** — PASS. Rodar a suíte inteira do backend.
- [ ] **Step 5: Commit** — `feat(carteira): endpoint /recomendacoes (preco-teto + rebalanceamento) (RF-27, RF-29)`

---

## Task 6: Frontend — sub-aba Recomendações

**Files:** `types/api.ts` (regen), `hooks/useRecomendacoes.ts`, `components/carteira/RecomendacoesView.tsx`, `pages/CarteiraPage.tsx`

- [ ] **Step 1: Regen tipos** — gerar openapi.json do app e `npx openapi-typescript /tmp/openapi.json -o src/types/api.ts`. Confirmar `RecomendacoesOut` no arquivo.
- [ ] **Step 2: Endpoint client + hook** — criar `api/endpoints/recomendacoes.ts` (GET com query params) e `hooks/useRecomendacoes.ts` (TanStack Query, chave `["recomendacoes", yields, alvo]`), seguindo o padrão de `useDividendos`/`useCarteira`.
- [ ] **Step 3: RecomendacoesView** — componente mobile-first:
  - Bloco Preço-teto: lista de cards por fundo (ClasseBadge, preço atual, preço-teto, margem com cor, status). Inputs de yield-alvo FII/FIAGRO (defaults 8%/13%).
  - Bloco Rebalanceamento: barra atual×alvo por classe + frase de sugestão; input do alvo FII (default 80%).
  - Estados de loading/erro/carteira-vazia (reaproveitar Skeleton/ErrorState/EmptyState).
- [ ] **Step 4: 4ª sub-aba** — em `CarteiraPage.tsx`, adicionar `recomendacoes: "Recomendações"` ao mapa `SUB` e `{sub === "recomendacoes" && <RecomendacoesView />}`.
- [ ] **Step 5: Verificar** — `npx tsc --noEmit`, `npx eslint` nos arquivos novos, `npx vitest run`. Validar no viewport mobile (RNF-05).
- [ ] **Step 6: Commit** — `feat(carteira): sub-aba Recomendacoes (preco-teto + rebalanceamento) (RF-27, RF-29, RNF-05)`

---

## Verificação final
- [ ] Suíte backend verde + ruff + mypy nos arquivos tocados.
- [ ] Frontend tsc/lint/vitest verdes.
- [ ] Verificação end-to-end: subir/rodar e conferir recomendações reais para uma carteira com FII + FIAGRO.
- [ ] requesting-code-review antes do merge.

## Self-review (cobertura do spec)
- §2 preço-teto Bazin → Tasks 1-4. §3 rebalanceamento → Task 4. §4 backend → Tasks 1-5. §5 frontend → Task 6. §6 testes → embutidos. Sem placeholders; assinaturas (`calcular_preco_teto`, `analisar_precos_teto`, `sugerir_rebalanceamento`, `preco_atual`, `RecomendacoesOut`) consistentes entre tasks.
