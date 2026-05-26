"""Executa o motor de scoring para todos os FIIs.

Uso:
    cd backend && source .venv/bin/activate
    python -m scripts.rodar_scoring
"""
from __future__ import annotations

import logging
import sys

import app.models  # noqa: F401
from app.database import SessionLocal
from app.services.scoring_service import ScoringService

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s — %(message)s")
logger = logging.getLogger(__name__)


def main() -> None:
    logger.info("Iniciando scoring...")
    with SessionLocal() as db:
        resultado = ScoringService(db).executar()
    logger.info(
        "Scoring: %d calculados, %d sem dados, %d erros",
        resultado["calculados"], resultado["sem_dados"], resultado["erros"],
    )
    sys.exit(0 if resultado["erros"] == 0 else 1)


if __name__ == "__main__":
    main()
