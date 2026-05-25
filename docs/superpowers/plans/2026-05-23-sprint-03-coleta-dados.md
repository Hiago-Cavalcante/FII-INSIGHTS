# Sprint 03 — Coleta de Dados (Status Invest) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o coletor de dados que busca 9 indicadores financeiros dos 50 FIIs no Status Invest, com retry exponencial, delay de 300ms entre requisições e upsert por `(fundo_id, data_referencia)`.

**Architecture:** `StatusInvestParser` extrai campos de HTML via BeautifulSoup. `ColetaService` orquestra 50 requests sequenciais com delay e retry. `IndicadorRepository.upsert` persiste sem duplicatas. CLI `scripts/coletar_dados.py` é o entry point. Scraping de backup como stub documentado.

**Tech Stack:** Python 3.11, httpx (sync), BeautifulSoup4/lxml, respx (mock de testes), SQLAlchemy 2.0, pytest

---

## Mapa de Arquivos

### Criados nesta sprint
```
backend/
├── app/
│   ├── utils/
│   │   ├── http_client.py                   ← fetch_com_retry + criar_cliente_http
│   │   └── parsers/
│   │       ├── __init__.py                  ← package vazio
│   │       ├── status_invest.py             ← StatusInvestParser
│   │       └── backup_scraper.py            ← BackupScraper stub
│   └── services/
│       └── coleta_service.py                ← ColetaService + ColetaResultado
├── scripts/
│   └── coletar_dados.py                     ← CLI entry point
└── tests/
    ├── fixtures/
    │   ├── __init__.py
    │   └── hglg11_page.html                 ← HTML mínimo para testes offline
    ├── test_http_client.py
    ├── test_status_invest_parser.py
    └── test_coleta_service.py
```

### Modificados nesta sprint
```
backend/
├── pyproject.toml                           ← adicionar respx em dev
├── app/repositories/indicador_repository.py ← adicionar método upsert
└── tests/test_indicador_repository.py      ← adicionar testes de upsert
```

---

## Task 1: Adicionar respx às dev dependencies

**Files:**
- Modify: `backend/pyproject.toml`

- [ ] **Passo 1: Adicionar respx ao pyproject.toml**

Localizar a seção `[project.optional-dependencies]` e substituí-la por:

```toml
[project.optional-dependencies]
dev = [
    "pytest>=8.3,<9.0",
    "pytest-asyncio>=0.25,<1.0",
    "ruff>=0.9,<1.0",
    "mypy>=1.14,<2.0",
    "respx>=0.22,<1.0",
]
```

- [ ] **Passo 2: Instalar**

```bash
cd /home/hiago/projetos/fii-insights/backend
source .venv/bin/activate
uv pip install "respx>=0.22,<1.0"
```

Esperado: linha de instalação sem erros.

- [ ] **Passo 3: Verificar instalação**

```bash
python -c "import respx; print(respx.__version__)"
```

Esperado: número de versão impresso.

- [ ] **Passo 4: Commit**

```bash
git add backend/pyproject.toml
git commit -m "chore: adiciona respx como dependência de teste"
```

---

## Task 2: Fixture HTML e upsert no IndicadorRepository

**Files:**
- Create: `backend/tests/fixtures/__init__.py`
- Create: `backend/tests/fixtures/hglg11_page.html`
- Modify: `backend/app/repositories/indicador_repository.py`
- Modify: `backend/tests/test_indicador_repository.py`

- [ ] **Passo 1: Criar diretório de fixtures**

```bash
mkdir -p /home/hiago/projetos/fii-insights/backend/tests/fixtures
touch /home/hiago/projetos/fii-insights/backend/tests/fixtures/__init__.py
```

- [ ] **Passo 2: Criar `backend/tests/fixtures/hglg11_page.html`**

Conteúdo — HTML mínimo que espelha a estrutura real do Status Invest (valores fixos para testes determinísticos):

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

- [ ] **Passo 3: Escrever testes de upsert em `test_indicador_repository.py`**

Adicionar ao final de `backend/tests/test_indicador_repository.py`:

```python
def test_upsert_cria_novo_indicador(db_session):
    fundo = _fundo(db_session, "UPSRT11")
    repo = IndicadorRepository(db_session)

    ind = repo.upsert(
        fundo_id=fundo.id,
        data_referencia=date(2026, 5, 23),
        dy_12m=0.085,
        p_vp=0.93,
    )

    assert ind.id is not None
    assert ind.dy_12m == pytest.approx(0.085)
    assert ind.p_vp == pytest.approx(0.93)


def test_upsert_atualiza_indicador_existente_mesma_data(db_session):
    fundo = _fundo(db_session, "UPDT11")
    repo = IndicadorRepository(db_session)

    repo.criar(fundo_id=fundo.id, data_referencia=date(2026, 5, 23), dy_12m=0.08)
    ind = repo.upsert(
        fundo_id=fundo.id,
        data_referencia=date(2026, 5, 23),
        dy_12m=0.09,
    )

    todos = repo.listar_por_fundo(fundo.id)
    assert len(todos) == 1
    assert ind.dy_12m == pytest.approx(0.09)
```

Adicionar `import pytest` no topo do arquivo se ainda não estiver presente.

- [ ] **Passo 4: Rodar e confirmar FALHA**

```bash
cd /home/hiago/projetos/fii-insights/backend
source .venv/bin/activate
pytest tests/test_indicador_repository.py::test_upsert_cria_novo_indicador -v
```

Esperado: `AttributeError: 'IndicadorRepository' object has no attribute 'upsert'`

- [ ] **Passo 5: Implementar `upsert` em `backend/app/repositories/indicador_repository.py`**

Adicionar após o método `listar_por_fundo`:

```python
def upsert(self, fundo_id: int, data_referencia: date, **campos: object) -> Indicador:
    """Atualiza indicador existente ou cria novo para (fundo_id, data_referencia)."""
    stmt = select(Indicador).where(
        Indicador.fundo_id == fundo_id,
        Indicador.data_referencia == data_referencia,
    )
    indicador = self.db.scalar(stmt)
    if indicador is None:
        indicador = Indicador(fundo_id=fundo_id, data_referencia=data_referencia)
        self.db.add(indicador)
    for campo, valor in campos.items():
        setattr(indicador, campo, valor)
    self.db.commit()
    self.db.refresh(indicador)
    return indicador
```

- [ ] **Passo 6: Rodar e confirmar PASSA**

```bash
pytest tests/test_indicador_repository.py -v
```

Esperado: 7 passed (5 anteriores + 2 novos)

- [ ] **Passo 7: Commit**

```bash
git add backend/tests/fixtures/ backend/app/repositories/indicador_repository.py backend/tests/test_indicador_repository.py
git commit -m "feat: adiciona upsert ao IndicadorRepository e fixture HTML para testes"
```

---

## Task 3: Criar http_client.py com retry exponencial

**Files:**
- Create: `backend/app/utils/http_client.py`
- Create: `backend/tests/test_http_client.py`

- [ ] **Passo 1: Criar `backend/tests/test_http_client.py`**

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
    mock_sleep.assert_called_once_with(1)  # backoff tentativa 0: 2^0 = 1s


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

- [ ] **Passo 2: Rodar e confirmar FALHA**

```bash
pytest tests/test_http_client.py -v
```

Esperado: `ModuleNotFoundError: No module named 'app.utils.http_client'`

- [ ] **Passo 3: Criar `backend/app/utils/http_client.py`**

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


def fetch_com_retry(
    client: httpx.Client,
    url: str,
    max_tentativas: int = 3,
) -> str:
    """Faz GET com retry exponencial (1s, 2s, 4s). Retorna o HTML da resposta."""
    ultimo_erro: Exception | None = None
    for tentativa in range(max_tentativas):
        try:
            resp = client.get(url)
            if resp.status_code in _STATUS_NAO_RETRIABLE:
                resp.raise_for_status()
            if resp.status_code in _STATUS_RETRIABLE:
                raise httpx.HTTPStatusError(
                    f"HTTP {resp.status_code}",
                    request=resp.request,
                    response=resp,
                )
            resp.raise_for_status()
            return resp.text
        except httpx.HTTPStatusError as e:
            if e.response.status_code in _STATUS_NAO_RETRIABLE:
                raise
            ultimo_erro = e
            if tentativa < max_tentativas - 1:
                wait = 2**tentativa
                logger.warning(
                    "Tentativa %d/%d falhou para %s: %s. Aguardando %ds",
                    tentativa + 1,
                    max_tentativas,
                    url,
                    e,
                    wait,
                )
                time.sleep(wait)
        except (httpx.TimeoutException, httpx.NetworkError) as e:
            ultimo_erro = e
            if tentativa < max_tentativas - 1:
                wait = 2**tentativa
                logger.warning(
                    "Tentativa %d/%d falhou para %s: %s. Aguardando %ds",
                    tentativa + 1,
                    max_tentativas,
                    url,
                    e,
                    wait,
                )
                time.sleep(wait)
    raise ultimo_erro  # type: ignore[misc]


def criar_cliente_http() -> httpx.Client:
    """Retorna httpx.Client configurado com headers de browser."""
    return httpx.Client(headers=_HEADERS, timeout=15.0, follow_redirects=True)
```

- [ ] **Passo 4: Rodar e confirmar PASSA**

```bash
pytest tests/test_http_client.py -v
```

Esperado: 4 passed

- [ ] **Passo 5: Commit**

```bash
git add backend/app/utils/http_client.py backend/tests/test_http_client.py
git commit -m "feat: implementa http_client com retry exponencial e headers de browser"
```

---

## Task 4: Criar StatusInvestParser (TDD)

**Files:**
- Create: `backend/app/utils/parsers/__init__.py`
- Create: `backend/app/utils/parsers/status_invest.py`
- Create: `backend/tests/test_status_invest_parser.py`

- [ ] **Passo 1: Criar `backend/tests/test_status_invest_parser.py`**

```python
import pytest
from pathlib import Path

from app.utils.parsers.status_invest import StatusInvestParser

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "hglg11_page.html"


@pytest.fixture
def html_hglg11() -> str:
    return FIXTURE_PATH.read_text(encoding="utf-8")


@pytest.fixture
def parser() -> StatusInvestParser:
    return StatusInvestParser()


def test_extrair_p_vp(parser, html_hglg11):
    dados = parser.extrair(html_hglg11)
    assert dados["p_vp"] == pytest.approx(0.93, abs=0.01)


def test_extrair_dy_12m(parser, html_hglg11):
    dados = parser.extrair(html_hglg11)
    assert dados["dy_12m"] == pytest.approx(0.085, abs=0.001)


def test_extrair_dy_atual(parser, html_hglg11):
    dados = parser.extrair(html_hglg11)
    assert dados["dy_atual"] == pytest.approx(0.0072, abs=0.0001)


def test_extrair_liquidez_diaria(parser, html_hglg11):
    dados = parser.extrair(html_hglg11)
    assert dados["liquidez_diaria"] == pytest.approx(9_863_300.65, rel=0.01)


def test_extrair_patrimonio_liquido(parser, html_hglg11):
    dados = parser.extrair(html_hglg11)
    assert dados["patrimonio_liquido"] == pytest.approx(7_234_911_198.0, rel=0.01)


def test_extrair_num_cotistas(parser, html_hglg11):
    dados = parser.extrair(html_hglg11)
    assert dados["num_cotistas"] == 565_330


def test_extrair_vacancia_fisica(parser, html_hglg11):
    dados = parser.extrair(html_hglg11)
    assert dados["vacancia_fisica"] == pytest.approx(0.025, abs=0.001)


def test_extrair_vacancia_financeira(parser, html_hglg11):
    dados = parser.extrair(html_hglg11)
    assert dados["vacancia_financeira"] == pytest.approx(0.031, abs=0.001)


def test_campo_ausente_retorna_none(parser):
    dados = parser.extrair("<html><body><p>Nada aqui</p></body></html>")
    assert dados["p_vp"] is None
    assert dados["dy_12m"] is None
    assert dados["num_cotistas"] is None
    assert dados["volatilidade_12m"] is None


def test_retorna_dict_com_todas_as_chaves(parser, html_hglg11):
    dados = parser.extrair(html_hglg11)
    assert set(dados.keys()) == {
        "dy_atual", "dy_12m", "p_vp", "vacancia_fisica", "vacancia_financeira",
        "liquidez_diaria", "volatilidade_12m", "patrimonio_liquido", "num_cotistas",
    }
```

- [ ] **Passo 2: Rodar e confirmar FALHA**

```bash
pytest tests/test_status_invest_parser.py -v
```

Esperado: `ModuleNotFoundError: No module named 'app.utils.parsers'`

- [ ] **Passo 3: Criar `backend/app/utils/parsers/__init__.py`**

Arquivo vazio:
```python
```

- [ ] **Passo 4: Criar `backend/app/utils/parsers/status_invest.py`**

```python
from __future__ import annotations

import re
from typing import Any

from bs4 import BeautifulSoup, Tag


class StatusInvestParser:
    """Extrai indicadores financeiros de FII da página do Status Invest."""

    def extrair(self, html: str) -> dict[str, Any]:
        """Recebe HTML da página de um FII e retorna dict com os 9 indicadores."""
        soup = BeautifulSoup(html, "lxml")
        return {
            "dy_atual": self._extrair_dy_atual(soup),
            "dy_12m": self._extrair_dy_12m(soup),
            "p_vp": self._extrair_p_vp(soup),
            "vacancia_fisica": self._extrair_vacancia_fisica(soup),
            "vacancia_financeira": self._extrair_vacancia_financeira(soup),
            "liquidez_diaria": self._extrair_liquidez(soup),
            "volatilidade_12m": None,  # indisponível no HTML do Status Invest
            "patrimonio_liquido": self._extrair_patrimonio(soup),
            "num_cotistas": self._extrair_cotistas(soup),
        }

    # ── helpers de busca ──────────────────────────────────────────────

    def _h3_por_label(self, soup: BeautifulSoup, label: str) -> Tag | None:
        """Retorna o primeiro <h3> cujo texto bate com o regex `label`."""
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
        """Encontra texto por regex em qualquer tag e retorna o <strong> seguinte."""
        for node in soup.find_all(string=re.compile(label, re.IGNORECASE)):
            parent = node.parent
            if not isinstance(parent, Tag):
                continue
            strong = parent.find_next("strong")
            if isinstance(strong, Tag):
                return strong.get_text(strip=True).replace("%", "").strip()
        return None

    # ── conversores de formato brasileiro ────────────────────────────

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
        """Converte '8,50' (ou '8,50%') → 0.085."""
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

    # ── extratores por campo ──────────────────────────────────────────

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

- [ ] **Passo 5: Rodar e confirmar PASSA**

```bash
pytest tests/test_status_invest_parser.py -v
```

Esperado: 11 passed

- [ ] **Passo 6: Commit**

```bash
git add backend/app/utils/parsers/ backend/tests/test_status_invest_parser.py
git commit -m "feat: implementa StatusInvestParser com extração dos 9 indicadores"
```

---

## Task 5: Criar BackupScraper stub

**Files:**
- Create: `backend/app/utils/parsers/backup_scraper.py`

- [ ] **Passo 1: Criar `backend/app/utils/parsers/backup_scraper.py`**

```python
from __future__ import annotations


class BackupScraper:
    """
    Scraping de backup para coleta de indicadores de FIIs.

    Status: NÃO IMPLEMENTADO — trabalho futuro.
    Quando implementar: scraping de FundsExplorer como fallback ao Status Invest.
    Referência: docs/superpowers/specs/2026-05-23-sprint-03-coleta-dados-design.md
    """

    def extrair(self, ticker: str) -> dict:
        raise NotImplementedError(
            f"Scraping de backup não implementado para {ticker}. "
            "Use StatusInvestParser como fonte primária."
        )
```

- [ ] **Passo 2: Verificar importação**

```bash
cd /home/hiago/projetos/fii-insights/backend
source .venv/bin/activate
python -c "from app.utils.parsers.backup_scraper import BackupScraper; print('OK')"
```

Esperado: `OK`

- [ ] **Passo 3: Commit**

```bash
git add backend/app/utils/parsers/backup_scraper.py
git commit -m "feat: adiciona BackupScraper stub documentado como trabalho futuro"
```

---

## Task 6: Criar ColetaService (TDD)

**Files:**
- Create: `backend/app/services/coleta_service.py`
- Create: `backend/tests/test_coleta_service.py`

- [ ] **Passo 1: Criar `backend/tests/test_coleta_service.py`**

```python
import httpx
import pytest
import respx
from pathlib import Path
from unittest.mock import patch

from app.repositories.fundo_repository import FundoRepository
from app.repositories.indicador_repository import IndicadorRepository
from app.services.coleta_service import ColetaService

_FIXTURE_HTML = (Path(__file__).parent / "fixtures" / "hglg11_page.html").read_text()
_SI_BASE = "https://statusinvest.com.br/fundos-imobiliarios"


def test_coletar_todos_salva_indicadores(db_session):
    fundo_repo = FundoRepository(db_session)
    fundo_repo.criar(ticker="HGLG11")
    fundo_repo.criar(ticker="MXRF11")

    with respx.mock:
        respx.get(f"{_SI_BASE}/HGLG11").mock(
            return_value=httpx.Response(200, text=_FIXTURE_HTML)
        )
        respx.get(f"{_SI_BASE}/MXRF11").mock(
            return_value=httpx.Response(200, text=_FIXTURE_HTML)
        )
        with patch("app.services.coleta_service.time.sleep"):
            resultado = ColetaService(db_session).coletar_todos()

    assert resultado.coletados == 2
    assert resultado.falhas == 0

    ind_repo = IndicadorRepository(db_session)
    for fundo in fundo_repo.listar_todos():
        ind = ind_repo.buscar_mais_recente(fundo.id)
        assert ind is not None
        assert ind.p_vp == pytest.approx(0.93, abs=0.01)


def test_coletar_continua_apos_falha_de_um_ticker(db_session):
    fundo_repo = FundoRepository(db_session)
    fundo_repo.criar(ticker="HGLG11")
    fundo_repo.criar(ticker="ERRO11")

    with respx.mock:
        respx.get(f"{_SI_BASE}/HGLG11").mock(
            return_value=httpx.Response(200, text=_FIXTURE_HTML)
        )
        respx.get(f"{_SI_BASE}/ERRO11").mock(
            return_value=httpx.Response(404, text="Not Found")
        )
        with patch("app.services.coleta_service.time.sleep"):
            resultado = ColetaService(db_session).coletar_todos()

    assert resultado.coletados == 1
    assert resultado.falhas == 1
    assert resultado.erros[0][0] == "ERRO11"


def test_coletar_faz_upsert_sem_duplicar(db_session):
    fundo_repo = FundoRepository(db_session)
    fundo_repo.criar(ticker="HGLG11")

    with respx.mock:
        respx.get(f"{_SI_BASE}/HGLG11").mock(
            return_value=httpx.Response(200, text=_FIXTURE_HTML)
        )
        with patch("app.services.coleta_service.time.sleep"):
            ColetaService(db_session).coletar_todos()

    with respx.mock:
        respx.get(f"{_SI_BASE}/HGLG11").mock(
            return_value=httpx.Response(200, text=_FIXTURE_HTML)
        )
        with patch("app.services.coleta_service.time.sleep"):
            ColetaService(db_session).coletar_todos()

    ind_repo = IndicadorRepository(db_session)
    fundo = fundo_repo.buscar_por_ticker("HGLG11")
    assert fundo is not None
    todos = ind_repo.listar_por_fundo(fundo.id)
    assert len(todos) == 1  # upsert: sem duplicata na mesma data


def test_delay_aplicado_entre_requisicoes(db_session):
    fundo_repo = FundoRepository(db_session)
    fundo_repo.criar(ticker="HGLG11")
    fundo_repo.criar(ticker="MXRF11")

    with respx.mock:
        respx.get(f"{_SI_BASE}/HGLG11").mock(
            return_value=httpx.Response(200, text=_FIXTURE_HTML)
        )
        respx.get(f"{_SI_BASE}/MXRF11").mock(
            return_value=httpx.Response(200, text=_FIXTURE_HTML)
        )
        with patch("app.services.coleta_service.time.sleep") as mock_sleep:
            ColetaService(db_session).coletar_todos()

    # 2 fundos → 1 delay (antes do segundo request, não antes do primeiro)
    assert mock_sleep.call_count == 1
    mock_sleep.assert_called_with(0.3)
```

- [ ] **Passo 2: Rodar e confirmar FALHA**

```bash
pytest tests/test_coleta_service.py -v
```

Esperado: `ModuleNotFoundError: No module named 'app.services.coleta_service'`

- [ ] **Passo 3: Criar `backend/app/services/coleta_service.py`**

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

_STATUS_INVEST_BASE = "https://statusinvest.com.br/fundos-imobiliarios"
_DELAY_ENTRE_REQUESTS = 0.3


@dataclass
class ColetaResultado:
    coletados: int = 0
    falhas: int = 0
    erros: list[tuple[str, str]] = field(default_factory=list)


class ColetaService:
    def __init__(self, db: Session) -> None:
        self._db = db
        self._fundo_repo = FundoRepository(db)
        self._indicador_repo = IndicadorRepository(db)
        self._parser = StatusInvestParser()

    def coletar_todos(self) -> ColetaResultado:
        """Coleta indicadores de todos os FIIs no banco. Upsert por (fundo_id, data_hoje)."""
        fundos = self._fundo_repo.listar_todos()
        resultado = ColetaResultado()
        hoje = date.today()

        with criar_cliente_http() as client:
            for i, fundo in enumerate(fundos):
                if i > 0:
                    time.sleep(_DELAY_ENTRE_REQUESTS)

                url = f"{_STATUS_INVEST_BASE}/{fundo.ticker}"
                try:
                    html = fetch_com_retry(client, url)
                    campos = self._parser.extrair(html)
                    self._indicador_repo.upsert(
                        fundo_id=fundo.id,
                        data_referencia=hoje,
                        **campos,
                    )
                    resultado.coletados += 1
                    logger.info("Coletado: %s", fundo.ticker)
                except Exception as e:
                    resultado.falhas += 1
                    resultado.erros.append((fundo.ticker, str(e)))
                    logger.warning("Falha ao coletar %s: %s", fundo.ticker, e)

        return resultado
```

- [ ] **Passo 4: Rodar e confirmar PASSA**

```bash
pytest tests/test_coleta_service.py -v
```

Esperado: 4 passed

- [ ] **Passo 5: Commit**

```bash
git add backend/app/services/coleta_service.py backend/tests/test_coleta_service.py
git commit -m "feat: implementa ColetaService com retry, delay de 300ms e upsert por data"
```

---

## Task 7: Criar scripts/coletar_dados.py

**Files:**
- Create: `backend/scripts/coletar_dados.py`

- [ ] **Passo 1: Criar `backend/scripts/coletar_dados.py`**

```python
"""Coleta indicadores dos 50 FIIs via Status Invest e persiste no banco.

Uso:
    cd backend
    source .venv/bin/activate
    python -m scripts.coletar_dados
"""
from __future__ import annotations

import logging
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app import models  # noqa: F401 — registra models no Base
from app.database import SessionLocal
from app.services.coleta_service import ColetaService

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


def main() -> None:
    logger.info("Iniciando coleta de dados dos FIIs...")
    with SessionLocal() as db:
        resultado = ColetaService(db).coletar_todos()

    logger.info(
        "Coleta concluída: %d coletados, %d falhas",
        resultado.coletados,
        resultado.falhas,
    )
    if resultado.erros:
        logger.warning("Tickers com erro:")
        for ticker, msg in resultado.erros:
            logger.warning("  %s: %s", ticker, msg)

    sys.exit(0 if resultado.falhas == 0 else 1)


if __name__ == "__main__":
    main()
```

- [ ] **Passo 2: Verificar importação sem erros**

```bash
cd /home/hiago/projetos/fii-insights/backend
source .venv/bin/activate
python -c "import scripts.coletar_dados; print('OK')"
```

Esperado: `OK`

- [ ] **Passo 3: Commit**

```bash
git add backend/scripts/coletar_dados.py
git commit -m "feat: adiciona CLI coletar_dados.py"
```

---

## Task 8: Verificação final da Sprint 03

- [ ] **Passo 1: Suite completa de testes**

```bash
cd /home/hiago/projetos/fii-insights/backend
source .venv/bin/activate
pytest tests/ -v
```

Esperado: ≥ 48 passed (27 anteriores + 2 upsert + 4 http_client + 11 parser + 4 coleta_service)

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

- [ ] **Passo 4: Executar coleta real**

```bash
python -m scripts.coletar_dados
```

Esperado: logs de coleta para 50 FIIs. Alguns podem falhar com 403/429 se o Status Invest bloquear o IP — o script não deve crashar, deve reportar as falhas e continuar.

- [ ] **Passo 5: Verificar banco**

```bash
python -c "
from app.database import engine
from sqlalchemy import text
with engine.connect() as c:
    n = c.execute(text('SELECT COUNT(*) FROM indicadores')).scalar()
    print(f'Indicadores no banco: {n}')
    p_vp_count = c.execute(text('SELECT COUNT(*) FROM indicadores WHERE p_vp IS NOT NULL')).scalar()
    print(f'  com P/VP: {p_vp_count}')
    dy_count = c.execute(text('SELECT COUNT(*) FROM indicadores WHERE dy_12m IS NOT NULL')).scalar()
    print(f'  com DY 12M: {dy_count}')
"
```

Esperado: `Indicadores no banco: N` onde N > 0.

---

## Definição de Pronto — Sprint 03

| Critério | Verificado |
|---|---|
| ≥ 48 testes passando | [ ] |
| `ruff check .` limpo | [ ] |
| `mypy app/` limpo | [ ] |
| `python -m scripts.coletar_dados` executa sem crash | [ ] |
| Tabela `indicadores` populada com dados reais | [ ] |
