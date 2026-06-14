from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from datetime import date

from sqlalchemy.orm import Session

from app.repositories.fundo_repository import FundoRepository
from app.repositories.indicador_repository import IndicadorRepository
from app.services.volatilidade import calcular_volatilidade_anualizada
from app.utils.parsers.status_invest import StatusInvestParser
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
    """Coleta híbrida: screener JSON (fundamentais) + série de preços (volatilidade)
    + página HTML como fallback dos tickers que faltam no screener.

    Vacância não é coletada (limitação documentada: o Status Invest não expõe um
    agregado confiável no HTML). Os campos de vacância ficam nulos e o scoring
    redistribui o peso da dimensão Risco.
    """

    def __init__(self, db: Session, client: StatusInvestClient | None = None) -> None:
        self._db = db
        self._fundos = FundoRepository(db)
        self._indicadores = IndicadorRepository(db)
        self._client = client or StatusInvestClient()
        self._parser = StatusInvestParser()

    def coletar_todos(self) -> ColetaResultado:
        fundos = self._fundos.listar_todos()
        resultado = ColetaResultado()
        hoje = date.today()

        screener = parse_screener(self._client.buscar_screener())

        for i, fundo in enumerate(fundos):
            if i > 0:
                time.sleep(_DELAY)
            try:
                campos = dict(screener.get(fundo.ticker, {}))
                screener_miss = fundo.ticker not in screener

                # Volatilidade (sempre, calculada da série de preços).
                try:
                    precos = self._client.buscar_serie_precos(fundo.ticker)
                    campos["volatilidade_12m"] = calcular_volatilidade_anualizada(precos)
                except Exception as e:
                    campos.setdefault("volatilidade_12m", None)
                    logger.warning("Volatilidade indisponível p/ %s: %s", fundo.ticker, e)

                # Fallback pela página HTML só quando o screener não trouxe o ticker.
                # FIAGRO não está no screener de FII: a página fica em /fiagros/<ticker>.
                if screener_miss:
                    try:
                        html = self._client.buscar_pagina_html(fundo.ticker, fundo.classe)
                        for chave, valor in self._parser.extrair_fundamentais(html).items():
                            campos.setdefault(chave, valor)
                    except Exception as e:
                        logger.warning("Página HTML indisponível p/ %s: %s", fundo.ticker, e)

                if not any(valor is not None for valor in campos.values()):
                    resultado.falhas += 1
                    resultado.erros.append((fundo.ticker, "sem dados"))
                    logger.warning("Sem dados para %s", fundo.ticker)
                    continue

                self._indicadores.upsert(fundo_id=fundo.id, data_referencia=hoje, **campos)
                resultado.coletados += 1
                logger.info("Coletado: %s", fundo.ticker)
            except Exception as e:
                resultado.falhas += 1
                resultado.erros.append((fundo.ticker, str(e)))
                logger.warning("Falha em %s: %s", fundo.ticker, e)

        return resultado
