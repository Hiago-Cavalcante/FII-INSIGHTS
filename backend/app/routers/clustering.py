from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.cluster import Cluster, FundoCluster
from app.models.fundo import Fundo
from app.services.clustering_service import ClusteringService

router = APIRouter(tags=["clustering"])


class ClusterItemOut(BaseModel):
    id: int
    nome_interpretado: str
    perfil_risco: str
    descricao: str | None
    dy_medio: float | None
    p_vp_medio: float | None
    num_fiis: int
    tickers: list[str]


class ClusteringResultadoOut(BaseModel):
    clusters_criados: int
    fundos_clusterizados: int


@router.get("/clusters", response_model=list[ClusterItemOut])
def listar_clusters(db: Session = Depends(get_db)):
    """Lista os clusters com os tickers de cada um."""
    clusters = db.scalars(select(Cluster)).all()
    resultado = []
    for cluster in clusters:
        tickers = db.scalars(
            select(Fundo.ticker)
            .join(FundoCluster, Fundo.id == FundoCluster.fundo_id)
            .where(FundoCluster.cluster_id == cluster.id)
            .order_by(Fundo.ticker)
        ).all()
        resultado.append(
            ClusterItemOut(
                id=cluster.id,
                nome_interpretado=cluster.nome_interpretado,
                perfil_risco=cluster.perfil_risco,
                descricao=cluster.descricao,
                dy_medio=cluster.dy_medio,
                p_vp_medio=cluster.p_vp_medio,
                num_fiis=cluster.num_fiis,
                tickers=list(tickers),
            )
        )
    return resultado


@router.post("/clustering/executar", response_model=ClusteringResultadoOut)
def executar_clustering(db: Session = Depends(get_db)):
    """Executa K-Means clustering nos FIIs com dados coletados."""
    resultado = ClusteringService(db).executar()
    return ClusteringResultadoOut(**resultado)
