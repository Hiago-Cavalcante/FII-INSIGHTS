# RF-14 — Scoring por classe (FII × FIAGRO) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer o motor de scoring diferenciar FII de FIAGRO — pesos, dimensões aplicáveis e faixa de DY próprios por classe — e popular uma amostra real de FIAGROs.

**Architecture:** A `classe` do fundo resolve, por fundo, um par `(pesos, dimensoes)` e a faixa de DY. FII mantém os perfis de risco atuais; FIAGRO usa um perfil base único (sem vacância/segmento, DY com curva própria). Funções de scoring permanecem puras; `ScoringService` e `ranking_service` passam a resolver o perfil por fundo. Dados de FIAGRO vêm do Status Invest (spike confirma) ou de seed curado (fallback).

**Tech Stack:** Python 3.11, FastAPI, SQLAlchemy 2.0, Alembic, pytest. Testes via `wsl.exe bash -lc "cd /home/hiago/projetos/fii-insights/backend && .venv/bin/python -m pytest ..."`.

---

## Convenção de comandos (WSL)

- **pytest:** `wsl.exe bash -lc "cd /home/hiago/projetos/fii-insights/backend && .venv/bin/python -m pytest <args>"`
- **alembic:** `wsl.exe bash -lc "cd /home/hiago/projetos/fii-insights/backend && .venv/bin/alembic <args>"`
- **ruff:** `wsl.exe bash -lc "cd /home/hiago/projetos/fii-insights/backend && .venv/bin/ruff check . --fix && .venv/bin/ruff format ."`

---

## Mapa de arquivos

- Modificar: `backend/app/services/scoring_service.py` — faixa DY FIAGRO, dimensões/pesos por classe, `resolver_perfil`, `calcular_pontuacoes` por classe, `executar()` grava `classe_aplicada`.
- Modificar: `backend/app/models/scoring.py` — coluna `classe_aplicada`.
- Criar: `backend/migrations/versions/<rev>_classe_aplicada.py` — migração Alembic (autogen).
- Modificar: `backend/app/services/ranking_service.py` — resolução por classe + `RankingItem.classe`.
- Modificar (talvez): `backend/app/schemas/ranking.py` (ou onde o item do ranking é serializado) — expor `classe`.
- Modificar: `backend/scripts/seed_fundos.py` — +FIAGROs.
- Modificar: `backend/app/utils/status_invest_client.py` e `backend/app/services/coleta_service.py` — categoria FIAGRO (conforme spike).
- Criar (throwaway): `backend/scripts/spike_fiagro_screener.py` — investigação da fonte.
- Testes: `backend/tests/test_scoring_service.py` (ou arquivo existente equivalente), `backend/tests/test_ranking_service.py`.
- Front: `frontend/src/types/api.ts` — regen openapi-typescript.

---

## Task 1: Spike — coleta de FIAGRO no Status Invest

Investigação exploratória (sem TDD). Determina se seguimos pelo screener (caminho feliz) ou pelo seed curado (fallback). As Tasks 2–6 (lógica pura + migração) **não dependem** deste resultado e podem rodar em paralelo.

**Files:**
- Create: `backend/scripts/spike_fiagro_screener.py`

- [ ] **Step 1: Escrever o script de spike**

```python
"""Spike: descobrir como o Status Invest expõe FIAGROs. Throwaway (não comitar)."""

from __future__ import annotations

import json

from app.utils.http_client import criar_cliente_status_invest, fetch_json_com_retry

SEARCH = '{"Segment":"","my_range":"-20;100","dy":{"Item1":null,"Item2":null},"p_vp":{"Item1":null,"Item2":null}}'
URL = "https://statusinvest.com.br/category/advancedsearchresultpaginated"
TICKERS_FIAGRO = {"KNCA11", "RZAG11", "VGIA11", "CPTR11", "RURA11", "SNAG11", "SPAF11"}


def main() -> None:
    client = criar_cliente_status_invest()
    # CategoryType: 2 = FII. Testar outros valores para FIAGRO.
    for cat in ("2", "16", "9", "3"):
        params = {"search": SEARCH, "CategoryType": cat, "page": "1", "size": "100"}
        try:
            data = fetch_json_com_retry(client, URL, params=params)
            lista = data.get("list", []) if isinstance(data, dict) else data
            tickers = {i.get("ticker") for i in (lista or [])}
            achados = TICKERS_FIAGRO & tickers
            print(f"CategoryType={cat}: {len(lista or [])} itens, FIAGROs achados: {sorted(achados)}")
            if achados:
                amostra = next(i for i in lista if i.get("ticker") in achados)
                print("  campos:", json.dumps({k: amostra.get(k) for k in
                      ("ticker", "dy", "p_vp", "liquidezmediadiaria", "patrimonio",
                       "numerocotistas", "lastdividend", "price")}, ensure_ascii=False))
        except Exception as e:  # noqa: BLE001
            print(f"CategoryType={cat}: erro {e}")
    client.close()


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Rodar o spike**

Run: `wsl.exe bash -lc "cd /home/hiago/projetos/fii-insights/backend && .venv/bin/python -m scripts.spike_fiagro_screener"`
Expected: imprime, para algum `CategoryType`, FIAGROs achados e que os campos (`dy`, `p_vp`, `liquidezmediadiaria`, `patrimonio`, `numerocotistas`, `lastdividend`, `price`) vêm preenchidos.

- [ ] **Step 3: Decisão**

- Se algum CategoryType retorna FIAGROs com os campos → **caminho feliz**: anotar o valor e seguir a Task 7 (extensão do client/coleta).
- Se nenhum retorna (ou rede indisponível no ambiente) → **fallback**: Task 7 usa seed curado de indicadores, marcado como dado curado (RNF-04).

Não comitar o script de spike (é throwaway). `rm backend/scripts/spike_fiagro_screener.py` ao final da task.

---

## Task 2: Faixa de DY FIAGRO

**Files:**
- Modify: `backend/app/services/scoring_service.py`
- Test: `backend/tests/test_scoring_service.py`

- [ ] **Step 1: Teste falhando**

```python
from app.services.scoring_service import pontuar_dy_fiagro


def test_pontuar_dy_fiagro_faixas():
    assert pontuar_dy_fiagro(0.07) == 1   # <=8%
    assert pontuar_dy_fiagro(0.08) == 1
    assert pontuar_dy_fiagro(0.09) == 3   # 8-10%
    assert pontuar_dy_fiagro(0.12) == 5   # 10-13%
    assert pontuar_dy_fiagro(0.13) == 5
    assert pontuar_dy_fiagro(0.15) == 4   # 13-16%
    assert pontuar_dy_fiagro(0.16) == 4
    assert pontuar_dy_fiagro(0.18) == 2   # >16%
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `... -m pytest tests/test_scoring_service.py::test_pontuar_dy_fiagro_faixas -v`
Expected: FAIL (`ImportError`/`cannot import name 'pontuar_dy_fiagro'`).

- [ ] **Step 3: Implementar**

Em `scoring_service.py`, após `pontuar_dy`:

```python
def pontuar_dy_fiagro(valor: float) -> int:
    if valor <= 0.08:
        return 1
    if valor <= 0.10:
        return 3
    if valor <= 0.13:
        return 5
    if valor <= 0.16:
        return 4
    return 2
```

E o dispatch (após as funções de faixa):

```python
FAIXA_DY: dict[str, Callable[[float], int]] = {
    "FII": pontuar_dy,
    "FIAGRO": pontuar_dy_fiagro,
}
```

Adicionar `from collections.abc import Callable` no topo.

- [ ] **Step 4: Rodar e ver passar**

Run: `... -m pytest tests/test_scoring_service.py::test_pontuar_dy_fiagro_faixas -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/scoring_service.py backend/tests/test_scoring_service.py
git commit -m "feat(scoring): faixa de DY própria para FIAGRO (RF-14)"
```

---

## Task 3: Dimensões e pesos FIAGRO

**Files:**
- Modify: `backend/app/services/scoring_service.py`
- Test: `backend/tests/test_scoring_service.py`

- [ ] **Step 1: Teste falhando**

```python
from app.services.scoring_service import (
    DIMENSOES_FIAGRO,
    PESOS_FIAGRO,
    calcular_score_com_pesos,
)


def test_pesos_fiagro_somam_um():
    assert abs(sum(PESOS_FIAGRO.values()) - 1.0) < 1e-9


def test_dimensoes_fiagro_sem_vacancia_nem_segmento():
    todos = [i for ind in DIMENSOES_FIAGRO.values() for i in ind]
    assert "vacancia_fisica" not in todos
    assert "vacancia_financeira" not in todos
    assert "segmento" not in todos


def test_score_fiagro_ignora_vacancia_e_segmento():
    # pontuações máximas só nos indicadores FIAGRO -> score 100;
    # vacância/segmento presentes não devem alterar nada.
    pont = {
        "dy_atual": 5.0, "dy_12m": 5.0, "p_vp": 5.0,
        "liquidez_diaria": 5.0, "volatilidade_12m": 5.0,
        "patrimonio_liquido": 5.0, "num_cotistas": 5.0,
        "vacancia_fisica": 1.0, "vacancia_financeira": 1.0, "segmento": 1.0,
    }
    assert calcular_score_com_pesos(pont, PESOS_FIAGRO, DIMENSOES_FIAGRO) == 100.0
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `... -m pytest tests/test_scoring_service.py -k fiagro -v`
Expected: FAIL (ImportError / `calcular_score_com_pesos` não aceita `dimensoes`).

- [ ] **Step 3: Implementar**

Renomear o `DIMENSOES` atual para `DIMENSOES_FII` e manter um alias; adicionar `DIMENSOES_FIAGRO` e `PESOS_FIAGRO`; dar a `calcular_score_com_pesos` o parâmetro `dimensoes`.

```python
DIMENSOES_FII: dict[str, list[str]] = {
    "Rentabilidade": ["dy_atual", "dy_12m"],
    "Valuation": ["p_vp"],
    "Risco": ["vacancia_fisica", "vacancia_financeira", "liquidez_diaria", "volatilidade_12m"],
    "Estrutura": ["patrimonio_liquido", "num_cotistas", "segmento"],
}
DIMENSOES = DIMENSOES_FII  # compat

DIMENSOES_FIAGRO: dict[str, list[str]] = {
    "Rentabilidade": ["dy_atual", "dy_12m"],
    "Valuation": ["p_vp"],
    "Risco": ["liquidez_diaria", "volatilidade_12m"],
    "Estrutura": ["patrimonio_liquido", "num_cotistas"],
}

PESOS_FIAGRO: dict[str, float] = {
    "dy_atual": 0.25,
    "dy_12m": 0.15,
    "p_vp": 0.15,
    "liquidez_diaria": 0.15,
    "volatilidade_12m": 0.15,
    "patrimonio_liquido": 0.075,
    "num_cotistas": 0.075,
}
```

Assinatura nova (default preserva chamadas existentes):

```python
def calcular_score_com_pesos(
    pontuacoes: dict[str, float | None],
    pesos: dict[str, float],
    dimensoes: dict[str, list[str]] = DIMENSOES_FII,
) -> float:
    pesos_efetivos: dict[str, float] = {}
    for indicadores_dim in dimensoes.values():
        presentes = [k for k in indicadores_dim if pontuacoes.get(k) is not None]
        if not presentes:
            continue
        peso_dim = sum(pesos[k] for k in indicadores_dim)
        peso_presente = sum(pesos[k] for k in presentes)
        if peso_presente == 0:
            continue
        for k in presentes:
            pesos_efetivos[k] = pesos[k] * (peso_dim / peso_presente)
    if not pesos_efetivos:
        return 0.0
    peso_total = sum(pesos_efetivos.values())
    total = 0.0
    for k in pesos_efetivos:
        pts = pontuacoes[k]
        assert pts is not None
        total += (pesos_efetivos[k] / peso_total) * (pts / 5.0) * 100
    return round(total, 2)
```

- [ ] **Step 4: Rodar e ver passar** — `... -m pytest tests/test_scoring_service.py -k fiagro -v` → PASS.

- [ ] **Step 5: Rodar a suíte inteira de scoring** (garantir que o alias não quebrou nada):
Run: `... -m pytest tests/test_scoring_service.py -v` → PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/scoring_service.py backend/tests/test_scoring_service.py
git commit -m "feat(scoring): dimensoes e pesos do perfil FIAGRO (RF-14)"
```

---

## Task 4: Resolução por classe + `calcular_pontuacoes` por classe

**Files:**
- Modify: `backend/app/services/scoring_service.py`
- Test: `backend/tests/test_scoring_service.py`

- [ ] **Step 1: Teste falhando (inclui o teste discriminante)**

```python
from types import SimpleNamespace

from app.services.scoring_service import (
    DIMENSOES_FIAGRO,
    DIMENSOES_FII,
    PESOS_DEFAULT,
    PESOS_FIAGRO,
    calcular_pontuacoes,
    calcular_score_com_pesos,
    resolver_perfil,
)


def test_resolver_perfil_fiagro():
    pesos, dims = resolver_perfil("FIAGRO", PESOS_DEFAULT)
    assert pesos is PESOS_FIAGRO
    assert dims is DIMENSOES_FIAGRO


def test_resolver_perfil_fii_usa_pesos_recebidos():
    pesos, dims = resolver_perfil("FII", PESOS_DEFAULT)
    assert pesos is PESOS_DEFAULT
    assert dims is DIMENSOES_FII


def _ind(**kw):
    base = dict(dy_atual=None, dy_12m=None, p_vp=None, vacancia_fisica=None,
               vacancia_financeira=None, liquidez_diaria=None, volatilidade_12m=None,
               patrimonio_liquido=None, num_cotistas=None)
    base.update(kw)
    return SimpleNamespace(**base)


def test_dy_pontua_por_classe():
    # DY 13% -> FII pune (curva satura em 8-10% e cai depois), FIAGRO premia (5).
    ind = _ind(dy_atual=0.13)
    fundo_fii = SimpleNamespace(classe="FII", segmento=None)
    fundo_fiagro = SimpleNamespace(classe="FIAGRO", segmento=None)
    p_fii = calcular_pontuacoes(ind, fundo_fii, [], [])
    p_fiagro = calcular_pontuacoes(ind, fundo_fiagro, [], [])
    assert p_fii["dy_atual"] == 2.0     # >12% na curva FII
    assert p_fiagro["dy_atual"] == 5.0  # 10-13% na curva FIAGRO


def test_score_discriminante_fiagro_vs_fii():
    # Mesmo FIAGRO com DY alto pontua melhor sob o perfil FIAGRO do que sob FII.
    ind = _ind(dy_atual=0.13, dy_12m=0.13, p_vp=0.9, liquidez_diaria=2_000_000,
               volatilidade_12m=0.08, patrimonio_liquido=1e9, num_cotistas=50_000)
    fundo = SimpleNamespace(classe="FIAGRO", segmento="Recebíveis")
    pont = calcular_pontuacoes(ind, fundo, [1e9], [50_000.0])
    pesos_f, dims_f = resolver_perfil("FIAGRO", PESOS_DEFAULT)
    score_fiagro = calcular_score_com_pesos(pont, pesos_f, dims_f)
    score_fii = calcular_score_com_pesos(pont, PESOS_DEFAULT, DIMENSOES_FII)
    assert score_fiagro > score_fii
```

- [ ] **Step 2: Rodar e ver falhar** — `... -m pytest tests/test_scoring_service.py -k "resolver or classe or discriminante" -v` → FAIL.

- [ ] **Step 3: Implementar**

Em `calcular_pontuacoes`, escolher a faixa de DY por classe:

```python
def calcular_pontuacoes(ind, fundo, todos_pl, todos_cotistas):
    faixa_dy = FAIXA_DY.get(fundo.classe, pontuar_dy)
    p: dict[str, float | None] = {}
    p["dy_atual"] = float(faixa_dy(ind.dy_atual)) if ind.dy_atual is not None else None
    p["dy_12m"] = float(faixa_dy(ind.dy_12m)) if ind.dy_12m is not None else None
    # ... (restante igual ao atual)
```

E a função de resolução (após as constantes):

```python
def resolver_perfil(
    classe: str, pesos_fii: dict[str, float]
) -> tuple[dict[str, float], dict[str, list[str]]]:
    """Devolve (pesos, dimensoes) conforme a classe do fundo."""
    if classe == "FIAGRO":
        return PESOS_FIAGRO, DIMENSOES_FIAGRO
    return pesos_fii, DIMENSOES_FII
```

- [ ] **Step 4: Rodar e ver passar** — mesmo comando do Step 2 → PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/scoring_service.py backend/tests/test_scoring_service.py
git commit -m "feat(scoring): resolve perfil por classe e pontua DY por classe (RF-14)"
```

---

## Task 5: Migração `classe_aplicada` + `ScoringService.executar`

**Files:**
- Modify: `backend/app/models/scoring.py`
- Create: `backend/migrations/versions/<rev>_classe_aplicada.py`
- Modify: `backend/app/services/scoring_service.py`
- Test: `backend/tests/test_scoring_service.py`

- [ ] **Step 1: Adicionar a coluna no modelo**

Em `scoring.py`, após `classificacao`:

```python
    classe_aplicada: Mapped[str] = mapped_column(String(6), nullable=False, server_default="FII")
```

- [ ] **Step 2: Gerar a migração**

Run: `wsl.exe bash -lc "cd /home/hiago/projetos/fii-insights/backend && .venv/bin/alembic revision --autogenerate -m 'classe_aplicada em scoring_historico (RF-14)'"`
Expected: cria `migrations/versions/<rev>_classe_aplicada_em_scoring_historico_rf_14.py` com `add_column('scoring_historico', ... 'classe_aplicada' ...)`. Revisar o arquivo gerado.

- [ ] **Step 3: Aplicar a migração**

Run: `wsl.exe bash -lc "cd /home/hiago/projetos/fii-insights/backend && .venv/bin/alembic upgrade head"`
Expected: OK, sem erro.

- [ ] **Step 4: Teste falhando para `executar()`**

```python
def test_executar_grava_classe_aplicada(db_session):  # usar a fixture de sessão existente
    from app.models.fundo import Fundo
    from app.models.indicador import Indicador
    from app.models.scoring import ScoringHistorico
    from app.services.scoring_service import ScoringService
    from datetime import date

    fii = Fundo(ticker="HGLG11", classe="FII", segmento="Logística")
    fiagro = Fundo(ticker="RZAG11", classe="FIAGRO", segmento="Recebíveis")
    db_session.add_all([fii, fiagro])
    db_session.flush()
    db_session.add_all([
        Indicador(fundo_id=fii.id, data_referencia=date.today(), dy_atual=0.09, p_vp=0.95,
                  liquidez_diaria=2e6, volatilidade_12m=0.1),
        Indicador(fundo_id=fiagro.id, data_referencia=date.today(), dy_atual=0.13, p_vp=0.98,
                  liquidez_diaria=1e6, volatilidade_12m=0.08),
    ])
    db_session.commit()

    ScoringService(db_session).executar()
    classes = {s.fundo.ticker: s.classe_aplicada for s in db_session.query(ScoringHistorico).all()}
    assert classes["HGLG11"] == "FII"
    assert classes["RZAG11"] == "FIAGRO"
```

(Se a fixture de sessão tiver outro nome, usar o do `conftest.py`.)

- [ ] **Step 5: Rodar e ver falhar** — `... -m pytest tests/test_scoring_service.py::test_executar_grava_classe_aplicada -v` → FAIL.

- [ ] **Step 6: Implementar em `executar()`**

```python
for fundo in fundos:
    ind = ind_por_fundo.get(fundo.id)
    if ind is None:
        sem_dados += 1
        continue
    try:
        pesos, dimensoes = resolver_perfil(fundo.classe, self._pesos)
        pontuacoes = calcular_pontuacoes(ind, fundo, todos_pl, todos_cotistas)
        score = calcular_score_com_pesos(pontuacoes, pesos, dimensoes)
        classificacao = classificar_score(score)
        sh = ScoringHistorico(
            fundo_id=fundo.id,
            data_execucao=agora,
            score=score,
            classificacao=classificacao,
            classe_aplicada=fundo.classe,
        )
        self._db.add(sh)
        calculados += 1
    except Exception as e:
        erros += 1
        logger.error("Erro no scoring de %s: %s", fundo.ticker, e)
```

- [ ] **Step 7: Rodar e ver passar** — mesmo comando → PASS.

- [ ] **Step 8: Commit**

```bash
git add backend/app/models/scoring.py backend/migrations/versions/ backend/app/services/scoring_service.py backend/tests/test_scoring_service.py
git commit -m "feat(scoring): grava classe_aplicada no historico por fundo (RF-14, RNF-04)"
```

---

## Task 6: Ranking por classe + `RankingItem.classe`

**Files:**
- Modify: `backend/app/services/ranking_service.py`
- Modify (se necessário): schema/serialização do ranking que expõe os campos ao cliente.
- Test: `backend/tests/test_ranking_service.py`

- [ ] **Step 1: Teste falhando**

```python
def test_ranking_pontua_por_classe_e_expoe_classe(db_session):
    from app.models.fundo import Fundo
    from app.models.indicador import Indicador
    from app.services.ranking_service import montar_ranking
    from app.services.scoring_service import PESOS_DEFAULT
    from datetime import date

    fiagro = Fundo(ticker="RZAG11", classe="FIAGRO", segmento="Recebíveis")
    db_session.add(fiagro)
    db_session.flush()
    db_session.add(Indicador(fundo_id=fiagro.id, data_referencia=date.today(),
                             dy_atual=0.13, dy_12m=0.13, p_vp=0.95,
                             liquidez_diaria=2e6, volatilidade_12m=0.08,
                             patrimonio_liquido=1e9, num_cotistas=40_000))
    db_session.commit()

    itens = montar_ranking(db_session, PESOS_DEFAULT)
    item = next(i for i in itens if i.ticker == "RZAG11")
    assert item.classe == "FIAGRO"
    # DY 13% sob perfil FIAGRO não deve ser punido como seria sob FII:
    assert item.score >= 60
```

- [ ] **Step 2: Rodar e ver falhar** — `... -m pytest tests/test_ranking_service.py::test_ranking_pontua_por_classe_e_expoe_classe -v` → FAIL (`RankingItem` sem `classe`).

- [ ] **Step 3: Implementar**

Em `RankingItem`, adicionar `classe: str` (após `segmento`). Em `montar_ranking`, resolver por fundo:

```python
from app.services.scoring_service import (
    Classificacao, calcular_pontuacoes, calcular_score_com_pesos,
    classificar_score, resolver_perfil,
)

# dentro do loop:
for ind in indicadores:
    fundo = ind.fundo
    pesos_fundo, dimensoes = resolver_perfil(fundo.classe, pesos)
    pontuacoes = calcular_pontuacoes(ind, fundo, todos_pl, todos_cotistas)
    score = calcular_score_com_pesos(pontuacoes, pesos_fundo, dimensoes)
    itens.append(
        RankingItem(
            ticker=fundo.ticker,
            nome=fundo.nome,
            segmento=fundo.segmento,
            classe=fundo.classe,
            score=score,
            classificacao=classificar_score(score),
            **_converter_display(ind),
        )
    )
```

- [ ] **Step 4: Garantir que a API expõe `classe`** — verificar o schema/serializer do endpoint de ranking (`app/schemas/` ou o router). Se for um Pydantic model espelhando `RankingItem`, adicionar `classe: str`. Rodar os testes do router se existirem.

- [ ] **Step 5: Rodar e ver passar** — `... -m pytest tests/test_ranking_service.py -v` → PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/ranking_service.py backend/app/schemas/ backend/tests/test_ranking_service.py
git commit -m "feat(ranking): pontua por classe e expoe classe no item (RF-14)"
```

---

## Task 7: Seed de FIAGROs + coleta

**Files:**
- Modify: `backend/scripts/seed_fundos.py`
- Modify (caminho feliz): `backend/app/utils/status_invest_client.py`, `backend/app/services/coleta_service.py`
- Test: `backend/tests/` (teste do seed / coleta conforme padrão existente)

- [ ] **Step 1: Adicionar FIAGROs ao seed**

Acrescentar ao `FUNDOS_SEED` (lista final ajustada pela liquidez do spike), todos com `"classe": "FIAGRO"`:

```python
    {"ticker": "KNCA11", "nome": "Kinea Crédito Agro", "segmento": "Agro - Recebíveis", "gestora": "Kinea", "classe": "FIAGRO"},
    {"ticker": "RZAG11", "nome": "Riza Agro", "segmento": "Agro - Recebíveis", "gestora": "Riza Asset", "classe": "FIAGRO"},
    {"ticker": "VGIA11", "nome": "Valora CRA", "segmento": "Agro - Recebíveis", "gestora": "Valora", "classe": "FIAGRO"},
    {"ticker": "CPTR11", "nome": "Capitânia Reit Agro", "segmento": "Agro - Recebíveis", "gestora": "Capitânia", "classe": "FIAGRO"},
    {"ticker": "RURA11", "nome": "Itaú Asset Rural", "segmento": "Agro - Recebíveis", "gestora": "Itaú Asset", "classe": "FIAGRO"},
    {"ticker": "SNAG11", "nome": "Suno Agro", "segmento": "Agro - Recebíveis", "gestora": "Suno Asset", "classe": "FIAGRO"},
    {"ticker": "NCRA11", "nome": "Sparta Agro", "segmento": "Agro - Recebíveis", "gestora": "Sparta", "classe": "FIAGRO"},
    {"ticker": "JGPX11", "nome": "JGP Crédito Agro", "segmento": "Agro - Recebíveis", "gestora": "JGP", "classe": "FIAGRO"},
    {"ticker": "CRAA11", "nome": "BTG Crédito Agro", "segmento": "Agro - Recebíveis", "gestora": "BTG Pactual", "classe": "FIAGRO"},
    {"ticker": "RZTR11", "nome": "Riza Terrax", "segmento": "Agro - Terras", "gestora": "Riza Asset", "classe": "FIAGRO"},
    {"ticker": "VCRA11", "nome": "Vinci Crédito Agro", "segmento": "Agro - Recebíveis", "gestora": "Vinci", "classe": "FIAGRO"},
    {"ticker": "GCRA11", "nome": "Galapagos Recebíveis Agro", "segmento": "Agro - Recebíveis", "gestora": "Galapagos", "classe": "FIAGRO"},
```

(Confirmar nomes/gestoras; ajustar a lista aos tickers que o spike confirmou como líquidos e disponíveis.)

- [ ] **Step 2: Rodar o seed**

Run: `wsl.exe bash -lc "cd /home/hiago/projetos/fii-insights/backend && .venv/bin/python -m scripts.seed_fundos"`
Expected: "Seed: N criados, ...". Os FIAGROs aparecem com `classe="FIAGRO"`.

- [ ] **Step 3a: Caminho feliz (spike OK) — estender a coleta**

Em `StatusInvestClient`, parametrizar a categoria (default mantém FII) e adicionar busca da categoria FIAGRO descoberta no spike; mesclar no mapa do screener em `ColetaService.coletar_todos` (os tickers FIAGRO entram no mesmo fluxo). Ex.:

```python
def buscar_screener(self, category_type: str = "2") -> list[dict[str, Any]]:
    # ... usa category_type em vez de fixo "2"
```

E na coleta, unir `parse_screener(client.buscar_screener("2"))` com `parse_screener(client.buscar_screener("<cat_fiagro>"))`.

- [ ] **Step 3b: Fallback (spike falhou) — seed curado**

Popular indicadores de FIAGRO manualmente num script `scripts/seed_indicadores_fiagro_curado.py`, com docstring marcando a origem (dado curado de fonte pública, RNF-04), e `data_referencia` real.

- [ ] **Step 4: Rodar a coleta e conferir FIAGROs**

Run: `wsl.exe bash -lc "cd /home/hiago/projetos/fii-insights/backend && .venv/bin/python -m scripts.coletar_dados"` (ou o script de seed curado no fallback).
Expected: FIAGROs com indicadores preenchidos no banco.

- [ ] **Step 5: Rodar o scoring e verificar ranking misto**

Run: `... -m scripts.rodar_scoring` e conferir que FIAGROs recebem `classe_aplicada="FIAGRO"` e aparecem no ranking com score coerente.

- [ ] **Step 6: Commit**

```bash
git add backend/scripts/seed_fundos.py backend/app/utils/status_invest_client.py backend/app/services/coleta_service.py
git commit -m "feat(coleta): amostra de FIAGROs no seed e coleta por categoria (RF-14)"
```

---

## Task 8: Regenerar tipos OpenAPI no frontend

**Files:**
- Modify: `frontend/src/types/api.ts`

- [ ] **Step 1: Subir o backend e regenerar**

Run (com backend no ar): `wsl.exe bash -lc 'export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:$PATH"; cd /home/hiago/projetos/fii-insights/frontend && npx openapi-typescript http://localhost:8000/openapi.json -o src/types/api.ts'`
Expected: `api.ts` regenerado, com `classe` no item de ranking.

- [ ] **Step 2: Typecheck/lint do front**

Run: `wsl.exe bash -lc 'export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:$PATH"; cd /home/hiago/projetos/fii-insights/frontend && npx tsc --noEmit'`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/api.ts
git commit -m "chore(front): regenera tipos OpenAPI com classe no ranking (RF-14)"
```

---

## Verificação final (antes de finalizar a branch)

- [ ] Suíte backend inteira verde: `... -m pytest -q`
- [ ] `ruff check . && ruff format --check .` e `mypy app/` limpos.
- [ ] Ranking real mostra FII e FIAGRO com perfis distintos (um FIAGRO de DY ~13% não é punido como FII seria).
- [ ] `requesting-code-review` antes do merge.

---

## Self-review (cobertura do spec)

- §3.1 pesos FIAGRO → Task 3. §3.2 faixa DY → Task 2. §3.3 faixas compartilhadas → não mudam (ok).
- §4 refator do motor → Tasks 2–4. §5 dados → Tasks 1 e 7. §6 migração+API → Tasks 5, 6, 8. §7 testes → embutidos em cada task (inclui discriminante na Task 4).
- Sem placeholders de código; assinaturas (`resolver_perfil`, `calcular_score_com_pesos(dimensoes=)`, `RankingItem.classe`, `classe_aplicada`) consistentes entre tasks.
