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
