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
