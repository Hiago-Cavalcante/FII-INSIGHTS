"""Coleta indicadores dos FIIs via Status Invest.

Uso:
    cd backend && source .venv/bin/activate
    python -m scripts.coletar_dados
"""
from __future__ import annotations

import logging
import sys

import app.models  # noqa: F401
from app.database import SessionLocal
from app.services.coleta_service import ColetaService

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s — %(message)s")
logger = logging.getLogger(__name__)


def main() -> None:
    logger.info("Iniciando coleta...")
    with SessionLocal() as db:
        resultado = ColetaService(db).coletar_todos()
    logger.info("Coleta: %d coletados, %d falhas", resultado.coletados, resultado.falhas)
    for ticker, msg in resultado.erros:
        logger.warning("  %s: %s", ticker, msg)
    sys.exit(0 if resultado.falhas == 0 else 1)


if __name__ == "__main__":
    main()
