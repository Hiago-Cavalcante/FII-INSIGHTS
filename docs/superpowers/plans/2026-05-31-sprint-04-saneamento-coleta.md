# Sprint 04 — Saneamento da Coleta (JSON-first no Status Invest) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **⚠️ Regras do usuário (não negociáveis):**
> - **NÃO executar `git` sem autorização explícita.** Os passos "Commit" abaixo só rodam depois que o Hiago autorizar cada um (ou autorizar em lote).
> - **A coleta real (Task 7) acessa a internet** (Status Invest) e também exige autorização explícita antes de rodar.

**Goal:** Substituir o scraping HTML frágil por coleta JSON-first no Status Invest, preenchendo os 10 indicadores no banco (incluindo `volatilidade_12m` calculada localmente) e re-executando o scoring.

**Architecture:** Cliente JSON (`StatusInvestClient`) consome 3 endpoints do Status Invest (`advancedsearchresult` para os indicadores fundamentais de todos os FIIs numa chamada; `tickerprice` para a série de preços; `companytickerprovents`/`lastdividend` para `dy_atual`). Parsers puros normalizam para frações; `calcular_volatilidade_anualizada` usa numpy. `ColetaService` orquestra. Vacância continua via HTML (resíduo, só onde existe).

**Tech Stack:** Python 3.12, httpx, numpy, BeautifulSoup4/lxml, pytest, respx (todos já instalados no `.venv`).

---

## Contexto crítico para todos os tasks

- **Working dir:** sempre `backend/`. Ative o venv: `source .venv/bin/activate` (ou use `.venv/bin/python` diretamente).
- **Banco real:** `backend/data/fii_insights.db` já tem 50 fundos e schema completo. NÃO rodar `alembic upgrade head`.
- **Modelo guarda frações** (dy/vacância/volatilidade em 0–1) e valores monetários brutos (liquidez/patrimônio em R$). `num_cotistas` é int.
- **Endpoints validados (HTTP 200, JSON, sem token)** com headers de browser (`User-Agent`, `Accept: application/json`, `X-Requested-With: XMLHttpRequest`, `Referer` do Status Invest):
  - Screener: `GET https://statusinvest.com.br/category/advancedsearchresult?search=<json>&CategoryType=2` → lista de FIIs. Campos por item: `ticker, price, dy, p_vp, liquidezmediadiaria, patrimonio, numerocotistas, numerocotas, valorpatrimonialcota, lastdividend, segment, sectorname, gestao_f, ...`
  - Série de preços: `GET https://statusinvest.com.br/fii/tickerprice?ticker={T}&type=6` → `[{"prices":[{"price":float,"date":"dd/mm/yy 00:00"}, ...]}]` (~2 anos diários).
  - Proventos: `GET https://statusinvest.com.br/fii/companytickerprovents?ticker={T}&chartProventsType=2`.
- **Suite atual:** 57 testes verdes. Cada task mantém a suite verde ao commitar.

---

## Mapa de arquivos

### Criados
```
backend/app/utils/status_invest_client.py        ← StatusInvestClient (HTTP dos 3 endpoints)
backend/app/utils/parsers/status_invest_json.py  ← normalização do screener + série + dy_atual
backend/app/services/volatilidade.py             ← calcular_volatilidade_anualizada (numpy)
backend/tests/test_status_invest_json.py
backend/tests/test_volatilidade.py
backend/tests/test_status_invest_client.py
backend/tests/fixtures/si_screener_real.json     ← captura real (Task 2)
backend/tests/fixtures/hglg11_real.html          ← captura real p/ vacância (Task 5)
```

### Modificados
```
backend/app/utils/http_client.py                 ← extrai core de retry + fetch_json_com_retry + criar_cliente_status_invest
backend/app/utils/parsers/status_invest.py       ← reduz para extrair_vacancia(html) (HTML residual)
backend/app/services/coleta_service.py           ← orquestração JSON-first
backend/tests/test_http_client.py                ← + teste de fetch_json_com_retry
backend/tests/test_status_invest_parser.py       ← reduz para testes de vacância
backend/tests/test_coleta_service.py             ← mocka screener + tickerprice (respx)
```

---

## Task 1: Refatorar `http_client.py` (core de retry + suporte a JSON)

**Files:**
- Modify: `backend/app/utils/http_client.py`
- Modify: `backend/tests/test_http_client.py`

- [ ] **Passo 1: Escrever o teste que falha** (append em `backend/tests/test_http_client.py`)

```python
from app.utils.http_client import fetch_json_com_retry, criar_cliente_status_invest


def test_fetch_json_retorna_dict_em_sucesso():
    with respx.mock:
        respx.get("https://exemplo.com/api").mock(
            return_value=httpx.Response(200, json={"a": 1, "b": [2, 3]})
        )
        with criar_cliente_status_invest() as client:
            resultado = fetch_json_com_retry(client, "https://exemplo.com/api")
    assert resultado == {"a": 1, "b": [2, 3]}


def test_fetch_json_retry_em_503():
    with respx.mock:
        respx.get("https://exemplo.com/api").mock(
            side_effect=[
                httpx.Response(503, text="Service Unavailable"),
                httpx.Response(200, json=[{"ticker": "XPLG11"}]),
            ]
        )
        with patch("app.utils.http_client.time.sleep") as mock_sleep:
            with criar_cliente_status_invest() as client:
                resultado = fetch_json_com_retry(client, "https://exemplo.com/api")
    assert resultado == [{"ticker": "XPLG11"}]
    mock_sleep.assert_called_once_with(1)
```

- [ ] **Passo 2: Rodar e confirmar FALHA**

Run: `.venv/bin/python -m pytest tests/test_http_client.py -v`
Expected: `ImportError: cannot import name 'fetch_json_com_retry'`

- [ ] **Passo 3: Reescrever `backend/app/utils/http_client.py`** (preserva o comportamento de `fetch_com_retry`)

```python
from __future__ import annotations

import logging
import time
from typing import Any

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

_JSON_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "pt-BR,pt;q=0.9",
    "Accept": "application/json, text/plain, */*",
    "X-Requested-With": "XMLHttpRequest",
    "Referer": "https://statusinvest.com.br/fundos-imobiliarios/busca-avancada",
}

_STATUS_RETRIABLE = {429, 500, 502, 503, 504}
_STATUS_NAO_RETRIABLE = {400, 401, 403, 404}


def criar_cliente_http() -> httpx.Client:
    return httpx.Client(headers=_HEADERS, timeout=15.0, follow_redirects=True)


def criar_cliente_status_invest() -> httpx.Client:
    """Cliente com headers de browser + cabeçalhos AJAX exigidos pelos endpoints JSON."""
    return httpx.Client(headers=_JSON_HEADERS, timeout=20.0, follow_redirects=True)


def _request_com_retry(
    client: httpx.Client,
    url: str,
    params: dict[str, str] | None = None,
    max_tentativas: int = 3,
) -> httpx.Response:
    """GET com retry exponencial (1s, 2s). Retorna a resposta crua."""
    ultimo_erro: Exception | None = None
    for tentativa in range(max_tentativas):
        try:
            resp = client.get(url, params=params)
            if resp.status_code in _STATUS_NAO_RETRIABLE:
                resp.raise_for_status()
            if resp.status_code in _STATUS_RETRIABLE:
                raise httpx.HTTPStatusError(
                    f"HTTP {resp.status_code}", request=resp.request, response=resp
                )
            resp.raise_for_status()
            return resp
        except httpx.HTTPStatusError as e:
            if e.response.status_code in _STATUS_NAO_RETRIABLE:
                raise
            ultimo_erro = e
            if tentativa < max_tentativas - 1:
                wait = 2**tentativa
                logger.warning(
                    "Tentativa %d falhou: %s. Aguardando %ds", tentativa + 1, e, wait
                )
                time.sleep(wait)
        except (httpx.TimeoutException, httpx.NetworkError) as e:
            ultimo_erro = e
            if tentativa < max_tentativas - 1:
                wait = 2**tentativa
                time.sleep(wait)
    raise ultimo_erro  # type: ignore[misc]


def fetch_com_retry(client: httpx.Client, url: str, max_tentativas: int = 3) -> str:
    return _request_com_retry(client, url, max_tentativas=max_tentativas).text


def fetch_json_com_retry(
    client: httpx.Client,
    url: str,
    params: dict[str, str] | None = None,
    max_tentativas: int = 3,
) -> Any:
    return _request_com_retry(
        client, url, params=params, max_tentativas=max_tentativas
    ).json()
```

- [ ] **Passo 4: Rodar e confirmar PASSA** (testes antigos + novos)

Run: `.venv/bin/python -m pytest tests/test_http_client.py -v`
Expected: 6 passed (4 antigos de `fetch_com_retry` + 2 novos de `fetch_json_com_retry`)

- [ ] **Passo 5: ruff + mypy**

Run: `.venv/bin/python -m ruff check app/ tests/ && .venv/bin/python -m mypy app/`
Expected: limpos.

- [ ] **Passo 6: Commit** *(só após autorização do usuário)*

```bash
git add backend/app/utils/http_client.py backend/tests/test_http_client.py
git commit -m "refactor(coleta): extrai core de retry e adiciona fetch_json_com_retry"
```

---

## Task 2: `StatusInvestClient` (HTTP dos 3 endpoints) + fixture real

**Files:**
- Create: `backend/app/utils/status_invest_client.py`
- Create: `backend/tests/test_status_invest_client.py`
- Create: `backend/tests/fixtures/si_screener_real.json`

> Depende do parser de série (`parse_serie_precos`, Task 3) apenas em runtime; para o teste deste task mockamos o JSON cru. Se executar fora de ordem, implemente `parse_serie_precos` antes do Passo 3.

- [ ] **Passo 1: Capturar uma resposta REAL do screener como fixture** *(acessa a internet — requer autorização)*

```bash
cd /home/hiago/projetos/fii-insights/backend
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
SEARCH='{"Segment":"","my_range":"-20;100","dy":{"Item1":null,"Item2":null},"p_vp":{"Item1":null,"Item2":null}}'
curl -s -G "https://statusinvest.com.br/category/advancedsearchresult" \
  --data-urlencode "search=$SEARCH" --data-urlencode "CategoryType=2" \
  -H "User-Agent: $UA" -H "Accept: application/json, text/plain, */*" \
  -H "X-Requested-With: XMLHttpRequest" \
  -H "Referer: https://statusinvest.com.br/fundos-imobiliarios/busca-avancada" \
  -o tests/fixtures/si_screener_real.json
.venv/bin/python -c "import json;d=json.load(open('tests/fixtures/si_screener_real.json'));print('itens:',len(d));print('chaves:',sorted(d[0].keys()))"
```
Expected: `itens: N` (N≥50 desejável) e as chaves incluem `ticker, dy, p_vp, liquidezmediadiaria, patrimonio, numerocotistas, price, lastdividend`.

- [ ] **Passo 2: Escrever o teste que falha** (`backend/tests/test_status_invest_client.py`)

```python
import json
from pathlib import Path

import httpx
import respx

from app.utils.status_invest_client import StatusInvestClient

_SCREENER_REAL = json.loads(
    (Path(__file__).parent / "fixtures" / "si_screener_real.json").read_text()
)


def test_buscar_screener_retorna_lista_de_dicts():
    with respx.mock:
        respx.get(url__startswith="https://statusinvest.com.br/category/advancedsearchresult").mock(
            return_value=httpx.Response(200, json=_SCREENER_REAL)
        )
        itens = StatusInvestClient().buscar_screener()
    assert isinstance(itens, list)
    assert len(itens) > 0
    assert "ticker" in itens[0]
    assert "dy" in itens[0]


def test_buscar_serie_precos_extrai_lista_de_floats():
    payload = [{"prices": [{"price": 100.0, "date": "01/01/25 00:00"},
                           {"price": 101.5, "date": "02/01/25 00:00"}]}]
    with respx.mock:
        respx.get(url__startswith="https://statusinvest.com.br/fii/tickerprice").mock(
            return_value=httpx.Response(200, json=payload)
        )
        precos = StatusInvestClient().buscar_serie_precos("XPLG11")
    assert precos == [100.0, 101.5]
```

- [ ] **Passo 3: Rodar e confirmar FALHA**

Run: `.venv/bin/python -m pytest tests/test_status_invest_client.py -v`
Expected: `ModuleNotFoundError: No module named 'app.utils.status_invest_client'`

- [ ] **Passo 4: Criar `backend/app/utils/status_invest_client.py`**

```python
from __future__ import annotations

from typing import Any

import httpx

from app.utils.http_client import criar_cliente_status_invest, fetch_json_com_retry
from app.utils.parsers.status_invest_json import parse_serie_precos


class StatusInvestClient:
    """Acesso aos endpoints JSON internos do Status Invest para FIIs."""

    SCREENER_URL = "https://statusinvest.com.br/category/advancedsearchresult"
    TICKERPRICE_URL = "https://statusinvest.com.br/fii/tickerprice"
    PROVENTS_URL = "https://statusinvest.com.br/fii/companytickerprovents"

    # Filtro amplo para trazer o máximo de FIIs numa chamada.
    SCREENER_SEARCH = (
        '{"Segment":"","my_range":"-20;100",'
        '"dy":{"Item1":null,"Item2":null},'
        '"p_vp":{"Item1":null,"Item2":null}}'
    )

    def __init__(self, client: httpx.Client | None = None) -> None:
        self._client = client or criar_cliente_status_invest()

    def buscar_screener(self) -> list[dict[str, Any]]:
        """Retorna a lista bruta de FIIs do screener (1 chamada)."""
        params = {"search": self.SCREENER_SEARCH, "CategoryType": "2"}
        data = fetch_json_com_retry(self._client, self.SCREENER_URL, params=params)
        if isinstance(data, list):
            return data
        return list(data.get("list", []))

    def buscar_serie_precos(self, ticker: str) -> list[float]:
        params = {"ticker": ticker, "type": "6"}
        data = fetch_json_com_retry(self._client, self.TICKERPRICE_URL, params=params)
        return parse_serie_precos(data)

    def buscar_proventos(self, ticker: str) -> Any:
        params = {"ticker": ticker, "chartProventsType": "2"}
        return fetch_json_com_retry(self._client, self.PROVENTS_URL, params=params)
```

- [ ] **Passo 5: Rodar e confirmar PASSA** (após a Task 3 criar `parse_serie_precos`)

Run: `.venv/bin/python -m pytest tests/test_status_invest_client.py -v`
Expected: 2 passed.

- [ ] **Passo 6: Commit** *(só após autorização)*

```bash
git add backend/app/utils/status_invest_client.py backend/tests/test_status_invest_client.py backend/tests/fixtures/si_screener_real.json
git commit -m "feat(coleta): StatusInvestClient para endpoints JSON (screener, tickerprice, proventos)"
```

---

## Task 3: Parsers JSON — normalização do screener, série e `dy_atual`

**Files:**
- Create: `backend/app/utils/parsers/status_invest_json.py`
- Create: `backend/tests/test_status_invest_json.py`

- [ ] **Passo 1: Escrever os testes que falham** (`backend/tests/test_status_invest_json.py`)

```python
import pytest

from app.utils.parsers.status_invest_json import (
    calcular_dy_atual,
    normalizar_screener_item,
    parse_screener,
    parse_serie_precos,
)


def test_normalizar_screener_item_converte_unidades():
    item = {
        "ticker": "XPLG11",
        "dy": 9.85,                 # % -> fração
        "p_vp": 0.70,               # razão (sem conversão)
        "liquidezmediadiaria": 75824.52,
        "patrimonio": 2_000_000_000.0,
        "numerocotistas": 180000,
        "price": 100.0,
        "lastdividend": 0.80,       # R$ -> dy_atual = 0.80*12/100 = 0.096
    }
    out = normalizar_screener_item(item)
    assert out["dy_12m"] == pytest.approx(0.0985)
    assert out["p_vp"] == pytest.approx(0.70)
    assert out["liquidez_diaria"] == pytest.approx(75824.52)
    assert out["patrimonio_liquido"] == pytest.approx(2_000_000_000.0)
    assert out["num_cotistas"] == 180000
    assert out["dy_atual"] == pytest.approx(0.096)


def test_normalizar_screener_item_campos_nulos():
    out = normalizar_screener_item({"ticker": "X11"})
    assert out["dy_12m"] is None
    assert out["p_vp"] is None
    assert out["dy_atual"] is None
    assert out["num_cotistas"] is None


def test_calcular_dy_atual():
    assert calcular_dy_atual(0.80, 100.0) == pytest.approx(0.096)
    assert calcular_dy_atual(None, 100.0) is None
    assert calcular_dy_atual(0.80, 0.0) is None
    assert calcular_dy_atual(0.0, 100.0) is None


def test_parse_screener_indexa_por_ticker():
    payload = [
        {"ticker": "XPLG11", "dy": 9.85, "p_vp": 0.70, "price": 100.0, "lastdividend": 0.80},
        {"ticker": "HGLG11", "dy": 8.50, "p_vp": 0.93, "price": 160.0, "lastdividend": 1.10},
    ]
    mapa = parse_screener(payload)
    assert set(mapa.keys()) == {"XPLG11", "HGLG11"}
    assert mapa["HGLG11"]["dy_12m"] == pytest.approx(0.085)


def test_parse_serie_precos_lista_envelopada():
    payload = [{"prices": [{"price": 10.0, "date": "01/01/25 00:00"},
                           {"price": 11.0, "date": "02/01/25 00:00"},
                           {"price": None, "date": "03/01/25 00:00"}]}]
    assert parse_serie_precos(payload) == [10.0, 11.0]


def test_parse_serie_precos_vazia():
    assert parse_serie_precos([{"prices": []}]) == []
    assert parse_serie_precos([]) == []
```

- [ ] **Passo 2: Rodar e confirmar FALHA**

Run: `.venv/bin/python -m pytest tests/test_status_invest_json.py -v`
Expected: `ModuleNotFoundError: No module named 'app.utils.parsers.status_invest_json'`

- [ ] **Passo 3: Criar `backend/app/utils/parsers/status_invest_json.py`**

```python
from __future__ import annotations

from typing import Any


def calcular_dy_atual(lastdividend: float | None, price: float | None) -> float | None:
    """DY anualizado corrente = último rendimento (R$) × 12 / preço (R$). Fração 0-1."""
    if not lastdividend or not price or price <= 0:
        return None
    return (float(lastdividend) * 12.0) / float(price)


def normalizar_screener_item(item: dict[str, Any]) -> dict[str, Any]:
    """Converte um item do screener para os campos/unidades do modelo Indicador."""

    def frac(v: Any) -> float | None:
        return float(v) / 100.0 if v is not None else None

    def fnum(v: Any) -> float | None:
        return float(v) if v is not None else None

    cot = item.get("numerocotistas")
    return {
        "dy_12m": frac(item.get("dy")),
        "p_vp": fnum(item.get("p_vp")),
        "liquidez_diaria": fnum(item.get("liquidezmediadiaria")),
        "patrimonio_liquido": fnum(item.get("patrimonio")),
        "num_cotistas": int(cot) if cot is not None else None,
        "dy_atual": calcular_dy_atual(item.get("lastdividend"), item.get("price")),
    }


def parse_screener(payload: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    """Mapa ticker -> indicadores normalizados."""
    mapa: dict[str, dict[str, Any]] = {}
    for item in payload:
        ticker = item.get("ticker")
        if ticker:
            mapa[ticker] = normalizar_screener_item(item)
    return mapa


def parse_serie_precos(payload: Any) -> list[float]:
    """Extrai a lista de preços (descarta nulos) do JSON do tickerprice."""
    obj = payload[0] if isinstance(payload, list) and payload else payload
    if not isinstance(obj, dict):
        return []
    pts = obj.get("prices") or []
    return [float(p["price"]) for p in pts if p.get("price") is not None]
```

- [ ] **Passo 4: Rodar e confirmar PASSA**

Run: `.venv/bin/python -m pytest tests/test_status_invest_json.py -v`
Expected: 6 passed.

- [ ] **Passo 5: Commit** *(só após autorização)*

```bash
git add backend/app/utils/parsers/status_invest_json.py backend/tests/test_status_invest_json.py
git commit -m "feat(coleta): parsers JSON do screener com normalização de unidades e dy_atual"
```

---

## Task 4: `calcular_volatilidade_anualizada` (numpy, função pura)

**Files:**
- Create: `backend/app/services/volatilidade.py`
- Create: `backend/tests/test_volatilidade.py`

- [ ] **Passo 1: Escrever os testes que falham** (`backend/tests/test_volatilidade.py`)

```python
import pytest

from app.services.volatilidade import calcular_volatilidade_anualizada


def test_serie_conhecida_valor_esperado():
    # ddof=1, anualizado * sqrt(252); valor pré-computado.
    serie = [100.0, 101.0, 99.0, 102.0, 98.0, 103.0]
    assert calcular_volatilidade_anualizada(serie) == pytest.approx(0.577411, abs=1e-5)


def test_serie_constante_volatilidade_zero():
    assert calcular_volatilidade_anualizada([50.0, 50.0, 50.0, 50.0]) == pytest.approx(0.0)


def test_serie_curta_demais_retorna_none():
    assert calcular_volatilidade_anualizada([100.0]) is None
    assert calcular_volatilidade_anualizada([100.0, 101.0]) is None
    assert calcular_volatilidade_anualizada([]) is None


def test_janela_limita_aos_ultimos_pontos():
    # 1000 pontos constantes => vol 0 mesmo com janela default 252.
    assert calcular_volatilidade_anualizada([10.0] * 1000) == pytest.approx(0.0)
```

- [ ] **Passo 2: Rodar e confirmar FALHA**

Run: `.venv/bin/python -m pytest tests/test_volatilidade.py -v`
Expected: `ModuleNotFoundError: No module named 'app.services.volatilidade'`

- [ ] **Passo 3: Criar `backend/app/services/volatilidade.py`**

```python
from __future__ import annotations

import numpy as np


def calcular_volatilidade_anualizada(
    precos: list[float],
    janela: int = 252,
    min_retornos: int = 2,
) -> float | None:
    """Volatilidade anualizada dos log-retornos diários (desvio amostral × √252).

    Usa as últimas ``janela``+1 cotações. Retorna ``None`` se houver poucos
    pontos válidos. Ignora preços não-positivos.
    """
    if not precos or len(precos) < min_retornos + 1:
        return None
    arr = np.asarray(precos[-(janela + 1):], dtype=float)
    arr = arr[arr > 0]
    if len(arr) < min_retornos + 1:
        return None
    log_ret = np.diff(np.log(arr))
    if len(log_ret) < min_retornos:
        return None
    return float(np.std(log_ret, ddof=1) * np.sqrt(252))
```

- [ ] **Passo 4: Rodar e confirmar PASSA**

Run: `.venv/bin/python -m pytest tests/test_volatilidade.py -v`
Expected: 4 passed.

- [ ] **Passo 5: Commit** *(só após autorização)*

```bash
git add backend/app/services/volatilidade.py backend/tests/test_volatilidade.py
git commit -m "feat(coleta): calcular_volatilidade_anualizada a partir de série de preços"
```

---

## Task 5: Vacância via HTML (resíduo) — capturar página real e corrigir o extrator

**Files:**
- Modify: `backend/app/utils/parsers/status_invest.py`
- Modify: `backend/tests/test_status_invest_parser.py`
- Create: `backend/tests/fixtures/hglg11_real.html`

> Único campo sem JSON. HGLG11 (logística) tem vacância; FIIs de papel/FoF legitimamente não têm (nulo é correto).

- [ ] **Passo 1: Capturar a página real do HGLG11** *(acessa a internet — requer autorização)*

```bash
cd /home/hiago/projetos/fii-insights/backend
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
curl -s "https://statusinvest.com.br/fundos-imobiliarios/HGLG11" \
  -H "User-Agent: $UA" -H "Accept-Language: pt-BR,pt;q=0.9" \
  -o tests/fixtures/hglg11_real.html
grep -io "vac[âa]ncia[^<]*" tests/fixtures/hglg11_real.html | head
```
Expected: arquivo salvo; o `grep` mostra as ocorrências de "Vacância" — inspecione o trecho de HTML ao redor para identificar a tag que carrega o valor (ex.: `<strong class="value">2,50</strong>`).

- [ ] **Passo 2: Escrever o teste de vacância usando a página real** (substitui o conteúdo de `backend/tests/test_status_invest_parser.py`)

```python
from pathlib import Path

import pytest

from app.utils.parsers.status_invest import StatusInvestParser

FIXTURE_REAL = (Path(__file__).parent / "fixtures" / "hglg11_real.html").read_text(encoding="utf-8")


@pytest.fixture
def parser():
    return StatusInvestParser()


def test_extrair_vacancia_fisica_de_pagina_real(parser):
    v = parser.extrair_vacancia(FIXTURE_REAL)["vacancia_fisica"]
    # Valor a confirmar pela inspeção do Passo 1; deve ser fração 0-1 plausível.
    assert v is not None
    assert 0.0 <= v <= 1.0


def test_extrair_vacancia_pagina_sem_vacancia_retorna_none(parser):
    dados = parser.extrair_vacancia("<html><body><p>sem vacância aqui</p></body></html>")
    assert dados["vacancia_fisica"] is None
    assert dados["vacancia_financeira"] is None
```

> Após o Passo 1, **fixe o valor real** (ex.: `assert v == pytest.approx(0.025, abs=0.005)`) no lugar do range, usando o número observado no HTML capturado.

- [ ] **Passo 3: Rodar e confirmar FALHA**

Run: `.venv/bin/python -m pytest tests/test_status_invest_parser.py -v`
Expected: FALHA — `AttributeError: 'StatusInvestParser' object has no attribute 'extrair_vacancia'` (ou valor errado se os seletores não casarem).

- [ ] **Passo 4: Reduzir `backend/app/utils/parsers/status_invest.py` a vacância**

Substituir o arquivo inteiro por (ajuste os seletores conforme o HTML capturado no Passo 1):

```python
from __future__ import annotations

import re
from typing import Any

from bs4 import BeautifulSoup, Tag


class StatusInvestParser:
    """Extrai a vacância (física/financeira) do HTML da página do FII.

    Demais indicadores vêm dos endpoints JSON (ver StatusInvestClient). A
    vacância é o único campo sem endpoint JSON conhecido.
    """

    def extrair_vacancia(self, html: str) -> dict[str, Any]:
        soup = BeautifulSoup(html, "lxml")
        return {
            "vacancia_fisica": self._vacancia(soup, r"vac[âa]ncia\s+f[íi]sica"),
            "vacancia_financeira": self._vacancia(soup, r"vac[âa]ncia\s+financeira"),
        }

    def _vacancia(self, soup: BeautifulSoup, label: str) -> float | None:
        for node in soup.find_all(string=re.compile(label, re.IGNORECASE)):
            tag: Tag | None = node.parent
            # Sobe até o container e procura o valor mais próximo.
            for _ in range(4):
                if not isinstance(tag, Tag):
                    break
                strong = tag.find("strong")
                if isinstance(strong, Tag):
                    return self._pct(strong.get_text(strip=True))
                tag = tag.parent
        return None

    @staticmethod
    def _pct(texto: str | None) -> float | None:
        if not texto:
            return None
        try:
            limpo = texto.replace("%", "").replace(".", "").replace(",", ".").strip()
            return float(limpo) / 100.0
        except ValueError:
            return None
```

- [ ] **Passo 5: Ajustar o seletor até o teste PASSAR**

Run: `.venv/bin/python -m pytest tests/test_status_invest_parser.py -v`
Expected: 2 passed. Se falhar, inspecione `tests/fixtures/hglg11_real.html` ao redor de "Vacância" e ajuste `_vacancia` (a estrutura real manda).

- [ ] **Passo 6: Commit** *(só após autorização)*

```bash
git add backend/app/utils/parsers/status_invest.py backend/tests/test_status_invest_parser.py backend/tests/fixtures/hglg11_real.html
git commit -m "refactor(coleta): parser HTML reduzido a vacância com fixture real"
```

---

## Task 6: Reescrever `ColetaService` (orquestração JSON-first)

**Files:**
- Modify: `backend/app/services/coleta_service.py`
- Modify: `backend/tests/test_coleta_service.py`

- [ ] **Passo 1: Reescrever o teste** (substitui `backend/tests/test_coleta_service.py`)

```python
from unittest.mock import patch

import httpx
import respx

from app.repositories.fundo_repository import FundoRepository
from app.repositories.indicador_repository import IndicadorRepository
from app.services.coleta_service import ColetaService

_SCREENER_URL = "https://statusinvest.com.br/category/advancedsearchresult"
_TICKERPRICE_URL = "https://statusinvest.com.br/fii/tickerprice"


def _screener(*tickers):
    return [
        {"ticker": t, "dy": 8.5, "p_vp": 0.93, "liquidezmediadiaria": 9_000_000.0,
         "patrimonio": 7_000_000_000.0, "numerocotistas": 565330,
         "price": 160.0, "lastdividend": 1.10}
        for t in tickers
    ]


def _serie():
    base = [100.0 + (i % 5) for i in range(60)]
    return [{"prices": [{"price": p, "date": "01/01/25 00:00"} for p in base]}]


def test_coletar_salva_indicadores_do_screener_e_volatilidade(db_session):
    FundoRepository(db_session).criar(ticker="HGLG11")
    with respx.mock:
        respx.get(url__startswith=_SCREENER_URL).mock(
            return_value=httpx.Response(200, json=_screener("HGLG11"))
        )
        respx.get(url__startswith=_TICKERPRICE_URL).mock(
            return_value=httpx.Response(200, json=_serie())
        )
        with patch("app.services.coleta_service.time.sleep"):
            resultado = ColetaService(db_session).coletar_todos()

    assert resultado.coletados == 1
    assert resultado.falhas == 0
    fundo = FundoRepository(db_session).buscar_por_ticker("HGLG11")
    ind = IndicadorRepository(db_session).buscar_mais_recente(fundo.id)
    assert ind is not None
    assert ind.dy_12m is not None
    assert ind.p_vp is not None
    assert ind.volatilidade_12m is not None  # calculada da série


def test_coletar_ticker_fora_do_screener_conta_falha(db_session):
    FundoRepository(db_session).criar(ticker="FORA11")
    with respx.mock:
        respx.get(url__startswith=_SCREENER_URL).mock(
            return_value=httpx.Response(200, json=_screener("OUTRO11"))
        )
        respx.get(url__startswith=_TICKERPRICE_URL).mock(
            return_value=httpx.Response(200, json=_serie())
        )
        with patch("app.services.coleta_service.time.sleep"):
            resultado = ColetaService(db_session).coletar_todos()
    assert resultado.coletados == 0
    assert resultado.falhas == 1
    assert resultado.erros[0][0] == "FORA11"


def test_delay_aplicado_entre_fundos(db_session):
    repo = FundoRepository(db_session)
    repo.criar(ticker="HGLG11")
    repo.criar(ticker="MXRF11")
    with respx.mock:
        respx.get(url__startswith=_SCREENER_URL).mock(
            return_value=httpx.Response(200, json=_screener("HGLG11", "MXRF11"))
        )
        respx.get(url__startswith=_TICKERPRICE_URL).mock(
            return_value=httpx.Response(200, json=_serie())
        )
        with patch("app.services.coleta_service.time.sleep") as mock_sleep:
            ColetaService(db_session).coletar_todos()
    assert mock_sleep.call_count == 1
    mock_sleep.assert_called_with(0.3)
```

- [ ] **Passo 2: Rodar e confirmar FALHA**

Run: `.venv/bin/python -m pytest tests/test_coleta_service.py -v`
Expected: FALHA (o `ColetaService` antigo busca HTML por ticker, não o screener).

- [ ] **Passo 3: Reescrever `backend/app/services/coleta_service.py`**

```python
from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from datetime import date

from sqlalchemy.orm import Session

from app.repositories.fundo_repository import FundoRepository
from app.repositories.indicador_repository import IndicadorRepository
from app.services.volatilidade import calcular_volatilidade_anualizada
from app.utils.parsers.status_invest_json import parse_screener
from app.utils.status_invest_client import StatusInvestClient

logger = logging.getLogger(__name__)

_DELAY = 0.3


@dataclass
class ColetaResultado:
    coletados: int = 0
    falhas: int = 0
    erros: list[tuple[str, str]] = field(default_factory=list)


class ColetaService:
    def __init__(self, db: Session, client: StatusInvestClient | None = None) -> None:
        self._db = db
        self._fundos = FundoRepository(db)
        self._indicadores = IndicadorRepository(db)
        self._client = client or StatusInvestClient()

    def coletar_todos(self) -> ColetaResultado:
        fundos = self._fundos.listar_todos()
        resultado = ColetaResultado()
        hoje = date.today()

        # 1 chamada ao screener (caminho crítico).
        screener = parse_screener(self._client.buscar_screener())

        for i, fundo in enumerate(fundos):
            if i > 0:
                time.sleep(_DELAY)
            try:
                campos = dict(screener.get(fundo.ticker, {}))
                if not campos:
                    resultado.falhas += 1
                    resultado.erros.append((fundo.ticker, "sem dados no screener"))
                    logger.warning("Sem dados no screener: %s", fundo.ticker)
                    continue

                try:
                    precos = self._client.buscar_serie_precos(fundo.ticker)
                    campos["volatilidade_12m"] = calcular_volatilidade_anualizada(precos)
                except Exception as e:  # série indisponível não invalida o resto
                    campos["volatilidade_12m"] = None
                    logger.warning("Volatilidade indisponível para %s: %s", fundo.ticker, e)

                self._indicadores.upsert(fundo_id=fundo.id, data_referencia=hoje, **campos)
                resultado.coletados += 1
                logger.info("Coletado: %s", fundo.ticker)
            except Exception as e:
                resultado.falhas += 1
                resultado.erros.append((fundo.ticker, str(e)))
                logger.warning("Falha em %s: %s", fundo.ticker, e)

        return resultado
```

> **Vacância (opcional nesta task):** para incluir vacância, injetar `StatusInvestParser` e, para FIIs de tijolo, buscar a página HTML (`criar_cliente_http` + `fetch_com_retry` em `https://statusinvest.com.br/fundos-imobiliarios/{ticker}`) e mesclar `extrair_vacancia(html)` em `campos`. Pode ficar para um passo extra desta task após o fluxo base estar verde — não bloqueia o DoD dos demais indicadores.

- [ ] **Passo 4: Rodar e confirmar PASSA**

Run: `.venv/bin/python -m pytest tests/test_coleta_service.py -v`
Expected: 3 passed.

- [ ] **Passo 5: Garantir que `scripts/coletar_dados.py` ainda funciona** (não deve precisar de mudança — chama `ColetaService(db).coletar_todos()`)

Run: `.venv/bin/python -c "import scripts.coletar_dados; print('import OK')"`
Expected: `import OK`

- [ ] **Passo 6: Suite completa + qualidade**

Run: `.venv/bin/python -m pytest -q && .venv/bin/python -m ruff check . && .venv/bin/python -m mypy app/`
Expected: tudo verde (≥ 60 testes; os antigos de parser HTML foram substituídos pelos novos JSON + vacância).

- [ ] **Passo 7: Commit** *(só após autorização)*

```bash
git add backend/app/services/coleta_service.py backend/tests/test_coleta_service.py
git commit -m "refactor(coleta): ColetaService JSON-first (screener + volatilidade)"
```

---

## Task 7: Coleta real, re-scoring e verificação do DoD

> **⚠️ Acessa a internet e altera o banco de produção. Requer autorização explícita do usuário antes de cada comando de rede.**

- [ ] **Passo 1: Rodar a coleta real**

Run: `cd /home/hiago/projetos/fii-insights/backend && .venv/bin/python -m scripts.coletar_dados`
Expected: logs de coleta; "coletados" próximo de 50 (algumas falhas toleráveis).

- [ ] **Passo 2: Verificar cobertura dos indicadores no banco**

```bash
.venv/bin/python -c "
import sqlite3
c = sqlite3.connect('data/fii_insights.db').cursor()
total = c.execute('SELECT COUNT(*) FROM fundos').fetchone()[0]
for col in ['dy_atual','dy_12m','p_vp','liquidez_diaria','patrimonio_liquido','num_cotistas','volatilidade_12m','vacancia_fisica','vacancia_financeira']:
    n = c.execute(f'SELECT COUNT(*) FROM indicadores WHERE {col} IS NOT NULL').fetchone()[0]
    print(f'{col:22s}: {n}/{total}')
"
```
Expected: `dy_atual, dy_12m, p_vp, liquidez_diaria, patrimonio_liquido, num_cotistas, volatilidade_12m` ≥ 45/50 (≥90%). `vacancia_*` presentes para os FIIs de tijolo.

> Se algum campo do screener ficar baixo: confirmar que o filtro `SCREENER_SEARCH` cobre os 50 tickers do seed (`buscar_screener()` deve retornar ≥50 itens contendo todos eles); ajustar o filtro/paginação se faltar.
> Sanity-check do `dy_atual`: deve ficar na faixa ~0.04–0.15. Se vier muito fora, revisar a premissa `lastdividend × 12 / price` (talvez `lastdividend` já seja anual) e ajustar `calcular_dy_atual` com novo teste.

- [ ] **Passo 3: Re-executar o scoring**

Run: `.venv/bin/python -m scripts.rodar_scoring`
Expected: logs com tickers, scores e classificações; sem erros.

- [ ] **Passo 4: Conferir que o scoring agora usa as 4 dimensões**

```bash
.venv/bin/python -c "
import sqlite3
c = sqlite3.connect('data/fii_insights.db').cursor()
print('scores recentes:', c.execute('SELECT classificacao, COUNT(*) FROM scoring_historico GROUP BY classificacao').fetchall())
"
```
Expected: distribuição plausível, agora refletindo dy_atual/vacância/volatilidade/patrimônio.

- [ ] **Passo 5: Verificação final (DoD)**

Run: `.venv/bin/python -m pytest -q && .venv/bin/python -m ruff check . && .venv/bin/python -m mypy app/`
Expected: tudo verde.

- [ ] **Passo 6: Commit** *(só após autorização)*

```bash
git add backend/
git commit -m "feat(coleta): saneamento completo — 10 indicadores reais e re-scoring"
```

---

## Definição de Pronto — Sprint 04

| Critério | Verificado |
|---|---|
| `fetch_json_com_retry` + `StatusInvestClient` + parsers JSON + `calcular_volatilidade_anualizada` implementados sob TDD | [ ] |
| Fixtures reais salvas (`si_screener_real.json`, `hglg11_real.html`) | [ ] |
| `pytest -q` (≥60), `ruff`, `mypy` limpos | [ ] |
| Após coleta real: dy_atual, dy_12m, p_vp, liquidez, patrimônio, cotistas, volatilidade ≥90% dos 50 | [ ] |
| Vacância presente no subconjunto de tijolo | [ ] |
| `rodar_scoring` re-executado, scores refletindo 4 dimensões | [ ] |

## Self-review do plano (cobertura do spec)

- Fonte única Status Invest JSON-first → Tasks 2, 3 (screener), 6 (orquestração). ✓
- Volatilidade calculada localmente → Task 4 (+ integração na Task 6). ✓
- Sem token / sem lib externa → usa httpx + numpy já instalados. ✓
- Normalização de unidades (frações) → Task 3 (`normalizar_screener_item`). ✓
- Bug de unidade do `dy_atual` corrigido → Task 3 (`calcular_dy_atual` anualizado) + sanity-check Task 7. ✓
- Vacância residual via HTML, nulo legítimo em papel/FoF → Task 5 + nota na Task 6. ✓
- TDD com fixtures reais → fixtures nas Tasks 2 e 5; unidades determinísticas nas Tasks 3 e 4. ✓
- Fora de escopo (K-Means 5 features, testes de scoring, frontend) → não há tasks para eles. ✓
- Consistência de tipos: `parse_serie_precos`/`parse_screener`/`normalizar_screener_item`/`calcular_dy_atual`/`calcular_volatilidade_anualizada`/`StatusInvestClient`/`extrair_vacancia` usados com as mesmas assinaturas em todas as tasks. ✓

---

## Revisão durante a execução (2026-05-31)

Descobertas que alteraram o plano original e como foram resolvidas:

1. **Screener não cobre os 50 numa chamada.** `advancedsearchresult` ignora filtros e devolve só os 100 primeiros alfabéticos. Solução (decisão do usuário: **híbrido**): `buscar_screener()` une o alfabético-100 com a paginação de `advancedsearchresultpaginated` (`totalResults: 602`, 20/página) deduplicando por ticker (~601 FIIs, cobre ~49/50). Para os tickers que ainda faltam, fallback per-ticker pela página HTML.
2. **Fallback + vacância via HTML.** Adicionado `StatusInvestClient.buscar_pagina_html(ticker)` e `StatusInvestParser.extrair_fundamentais()` (fallback) + `extrair_vacancia()`. **Patrimônio** vem do bloco **JSON-LD** embutido (`"Patrimônio líquido"…"value":N`); **dy_atual** = último rendimento × 12 / valor atual; **vacância** do `<small class="label">VACÂNCIA</small>` (ignora o widget `-%`).
3. **Context-manager** adicionado ao `StatusInvestClient` (fecha o pool httpx).
4. **`dy_atual` com rendimento R$0** → 0.0 (yield real 0%), não `None`.

### Resultado da coleta real (2026-05-31)
49/50 coletados. Cobertura no indicador mais recente: dy_atual 96%, dy_12m 98%, p_vp 96%, liquidez 94%, patrimônio 98%, cotistas 98%, volatilidade 94%, vacância física (tijolo) 22/24=92%. **DoD ≥90% atingido.**

### Limitações documentadas (trabalho futuro)
- **MALL11** (1/50): sem dados no Status Invest hoje (`tickerprice` vazio, página stub) — provável renomeação/fusão.
- **Vacância financeira** 0/50: a página do Status Invest expõe uma única "Vacância" (mapeada para física), sem split física/financeira no HTML estático.
- **Clustering degenerado** (3/4 clusters viram "Papel Agressivo"; sem `silhouette.png`): endereçado na **Sprint 06** (5ª feature = volatilidade + heurística + silhueta).
