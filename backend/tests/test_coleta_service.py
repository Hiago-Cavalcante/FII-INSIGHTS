from pathlib import Path
from unittest.mock import patch

from app.repositories.fundo_repository import FundoRepository
from app.repositories.indicador_repository import IndicadorRepository
from app.services.coleta_service import ColetaService

_FIXTURE = (Path(__file__).parent / "fixtures" / "hglg11_real.html").read_text(
    encoding="utf-8"
)


def _item(ticker: str) -> dict:
    return {
        "ticker": ticker, "dy": 8.5, "p_vp": 0.93,
        "liquidezmediadiaria": 9_000_000.0, "patrimonio": 7_000_000_000.0,
        "numerocotistas": 565330, "price": 160.0, "lastdividend": 1.10,
    }


_SERIE = [100.0, 101.0, 99.0, 102.0, 98.0, 103.0]  # vol calculável (>2 retornos)


class FakeClient:
    """Cliente fake que substitui o StatusInvestClient nos testes de orquestração."""

    def __init__(self, screener: list[dict], serie=None, html: str = ""):
        self._screener = screener
        self._serie = serie if serie is not None else _SERIE
        self._html = html
        self.paginas_buscadas: list[str] = []

    def buscar_screener(self) -> list[dict]:
        return self._screener

    def buscar_serie_precos(self, ticker: str) -> list[float]:
        return list(self._serie)

    def buscar_pagina_html(self, ticker: str) -> str:
        self.paginas_buscadas.append(ticker)
        return self._html


def _ind(db_session, fundo_id):
    return IndicadorRepository(db_session).buscar_mais_recente(fundo_id)


def test_coletar_salva_screener_e_volatilidade(db_session):
    fundo = FundoRepository(db_session).criar(ticker="KNCR11", segmento="Recebíveis")
    cliente = FakeClient(screener=[_item("KNCR11")])
    with patch("app.services.coleta_service.time.sleep"):
        resultado = ColetaService(db_session, client=cliente).coletar_todos()

    assert resultado.coletados == 1
    assert resultado.falhas == 0
    assert cliente.paginas_buscadas == []  # papel não busca HTML
    ind = _ind(db_session, fundo.id)
    assert ind.dy_12m is not None
    assert ind.p_vp is not None
    assert ind.volatilidade_12m is not None


def test_fallback_html_para_ticker_fora_do_screener(db_session):
    fundo = FundoRepository(db_session).criar(ticker="MALL11", segmento="Shopping")
    # screener NÃO contém MALL11 -> usa fallback da página HTML (fixture real HGLG11).
    cliente = FakeClient(screener=[_item("OUTRO11")], html=_FIXTURE)
    with patch("app.services.coleta_service.time.sleep"):
        resultado = ColetaService(db_session, client=cliente).coletar_todos()

    assert resultado.coletados == 1
    assert "MALL11" in cliente.paginas_buscadas
    ind = _ind(db_session, fundo.id)
    assert ind.dy_12m is not None  # veio do HTML
    assert ind.patrimonio_liquido is not None


def test_vacancia_coletada_para_tijolo(db_session):
    fundo = FundoRepository(db_session).criar(ticker="HGLG11", segmento="Logística")
    cliente = FakeClient(screener=[_item("HGLG11")], html=_FIXTURE)
    with patch("app.services.coleta_service.time.sleep"):
        ColetaService(db_session, client=cliente).coletar_todos()

    assert "HGLG11" in cliente.paginas_buscadas  # tijolo busca HTML p/ vacância
    ind = _ind(db_session, fundo.id)
    assert ind.vacancia_fisica == 0.0  # HGLG11 exibe VACÂNCIA 0,000%


def test_delay_aplicado_entre_fundos(db_session):
    repo = FundoRepository(db_session)
    repo.criar(ticker="KNCR11", segmento="Recebíveis")
    repo.criar(ticker="MXRF11", segmento="Recebíveis")
    cliente = FakeClient(screener=[_item("KNCR11"), _item("MXRF11")])
    with patch("app.services.coleta_service.time.sleep") as mock_sleep:
        ColetaService(db_session, client=cliente).coletar_todos()
    assert mock_sleep.call_count == 1
    mock_sleep.assert_called_with(0.3)


def test_ticker_sem_dados_conta_falha(db_session):
    FundoRepository(db_session).criar(ticker="VAZIO11", segmento="Recebíveis")
    # fora do screener, série vazia e HTML inútil -> nenhum dado.
    cliente = FakeClient(screener=[], serie=[], html="<html></html>")
    with patch("app.services.coleta_service.time.sleep"):
        resultado = ColetaService(db_session, client=cliente).coletar_todos()
    assert resultado.coletados == 0
    assert resultado.falhas == 1
    assert resultado.erros[0][0] == "VAZIO11"
