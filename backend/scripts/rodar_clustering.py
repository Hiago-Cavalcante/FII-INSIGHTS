"""Executa K-Means clustering nos FIIs.

Uso:
    cd backend && source .venv/bin/activate
    python -m scripts.rodar_clustering
"""
from __future__ import annotations

import logging
import sys

import app.models  # noqa: F401
from app.database import SessionLocal
from app.services.clustering_service import ClusteringService

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s — %(message)s")
logger = logging.getLogger(__name__)


def main() -> None:
    logger.info("Iniciando clustering K-Means (k=4)...")
    with SessionLocal() as db:
        resultado = ClusteringService(db).executar()
    logger.info(
        "Clustering: %d clusters criados, %d fundos clusterizados",
        resultado["clusters_criados"],
        resultado["fundos_clusterizados"],
    )
    sys.exit(0)


if __name__ == "__main__":
    main()
