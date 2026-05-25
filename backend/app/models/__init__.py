from app.models.cluster import Cluster, FundoCluster
from app.models.fundo import Fundo
from app.models.indicador import Indicador
from app.models.perfil import PerfilInvestidor
from app.models.scoring import ScoringHistorico

__all__ = [
    "Fundo",
    "Indicador",
    "ScoringHistorico",
    "Cluster",
    "FundoCluster",
    "PerfilInvestidor",
]
