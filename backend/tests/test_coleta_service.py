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
