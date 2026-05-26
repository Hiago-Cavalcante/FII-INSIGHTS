from __future__ import annotations

import logging
import math
from datetime import date
from pathlib import Path

import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sqlalchemy.orm import Session

from app.models.cluster import Cluster, FundoCluster
from app.models.fundo import Fundo
from app.models.indicador import Indicador
from app.repositories.fundo_repository import FundoRepository
from app.repositories.indicador_repository import IndicadorRepository

logger = logging.getLogger(__name__)

_FIGURES_DIR = Path(__file__).parent.parent.parent / "data" / "figures"


def preparar_features(
    indicadores: list[Indicador],
    fundos: dict[int, Fundo],
) -> tuple[np.ndarray, list[int]]:
    """
    Extrai 4 features: [dy_12m, p_vp, vacancia_media, log10(liquidez_diaria)]
    Exclui fundos sem dy_12m, p_vp ou liquidez_diaria.
    Imputa vacancia_media nula com mediana dos presentes.
    """
    candidatos = [
        ind for ind in indicadores
        if ind.dy_12m is not None and ind.p_vp is not None
        and ind.liquidez_diaria is not None and ind.liquidez_diaria > 0
    ]

    vacancias = []
    for ind in candidatos:
        v_f = ind.vacancia_fisica or 0.0
        v_fin = ind.vacancia_financeira or 0.0
        if ind.vacancia_fisica is not None or ind.vacancia_financeira is not None:
            vacancias.append((v_f + v_fin) / 2)
    vacancia_mediana = float(np.median(vacancias)) if vacancias else 0.0

    rows: list[list[float]] = []
    fundo_ids: list[int] = []

    for ind in candidatos:
        v_f = ind.vacancia_fisica or 0.0
        v_fin = ind.vacancia_financeira or 0.0
        if ind.vacancia_fisica is not None or ind.vacancia_financeira is not None:
            vacancia_media = (v_f + v_fin) / 2
        else:
            vacancia_media = vacancia_mediana

        rows.append([
            ind.dy_12m,
            ind.p_vp,
            vacancia_media,
            math.log10(ind.liquidez_diaria),
        ])
        fundo_ids.append(ind.fundo_id)

    if not rows:
        return np.empty((0, 4)), []

    return np.array(rows, dtype=float), fundo_ids


def interpretar_cluster(
    dy_medio: float,
    p_vp_medio: float,
    vacancia_media: float,
    log_liq_medio: float,
) -> tuple[str, str]:
    """Heurística para nomear e classificar perfil de risco de um cluster."""
    if dy_medio > 0.11 or (dy_medio > 0.09 and vacancia_media > 0.10):
        return "Papel Agressivo", "arrojado"
    if dy_medio < 0.08 and vacancia_media < 0.08:
        return "Tijolo Conservador", "conservador"
    if p_vp_medio < 0.95 and dy_medio >= 0.08:
        return "Tijolo Balanceado", "moderado"
    return "Híbrido Diversificado", "moderado"


class ClusteringService:
    def __init__(self, db: Session, k: int = 4) -> None:
        self._db = db
        self._k = k
        self._fundos_repo = FundoRepository(db)
        self._ind_repo = IndicadorRepository(db)

    def executar(self) -> dict[str, int]:
        indicadores = self._ind_repo.listar_mais_recentes_todos()
        fundos = {f.id: f for f in self._fundos_repo.listar_todos()}

        X, fundo_ids = preparar_features(indicadores, fundos)

        if len(fundo_ids) < self._k:
            logger.warning(
                "Fundos insuficientes para %d clusters (%d disponíveis)", self._k, len(fundo_ids)
            )
            return {"clusters_criados": 0, "fundos_clusterizados": 0}

        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        kmeans = KMeans(n_clusters=self._k, random_state=42, n_init=10)
        labels = kmeans.fit_predict(X_scaled)

        centroids_orig = scaler.inverse_transform(kmeans.cluster_centers_)

        self._db.query(FundoCluster).delete()
        self._db.query(Cluster).delete()
        self._db.flush()

        hoje = date.today()

        for k_idx in range(self._k):
            mask = labels == k_idx
            membros_idx = [i for i, m in enumerate(mask) if m]

            dy_medio = float(centroids_orig[k_idx, 0])
            p_vp_medio = float(centroids_orig[k_idx, 1])
            vacancia_media = float(centroids_orig[k_idx, 2])
            log_liq = float(centroids_orig[k_idx, 3])

            nome, perfil = interpretar_cluster(dy_medio, p_vp_medio, vacancia_media, log_liq)

            cluster = Cluster(
                nome_interpretado=nome,
                perfil_risco=perfil,
                descricao=(
                    f"DY médio: {dy_medio:.1%}, P/VP médio: {p_vp_medio:.2f}, "
                    f"Vacância média: {vacancia_media:.1%}"
                ),
                dy_medio=dy_medio,
                volatilidade_media=None,
                p_vp_medio=p_vp_medio,
                num_fiis=len(membros_idx),
            )
            self._db.add(cluster)
            self._db.flush()

            for idx in membros_idx:
                fc = FundoCluster(
                    fundo_id=fundo_ids[idx],
                    cluster_id=cluster.id,
                    data_atribuicao=hoje,
                )
                self._db.add(fc)
                ticker = fundos.get(fundo_ids[idx])
                logger.info("  %s → %s", ticker.ticker if ticker else fundo_ids[idx], nome)

        self._db.commit()
        logger.info("Clustering: %d clusters, %d fundos", self._k, len(fundo_ids))

        self._salvar_figuras(X_scaled, labels, kmeans)

        return {"clusters_criados": self._k, "fundos_clusterizados": len(fundo_ids)}

    def _salvar_figuras(self, X_scaled: np.ndarray, labels: np.ndarray, kmeans: KMeans) -> None:
        try:
            import matplotlib
            matplotlib.use("Agg")
            import matplotlib.pyplot as plt

            _FIGURES_DIR.mkdir(parents=True, exist_ok=True)

            ks = range(2, 9)
            inercias = [
                KMeans(n_clusters=k, random_state=42, n_init=10).fit(X_scaled).inertia_
                for k in ks
            ]
            fig, ax = plt.subplots()
            ax.plot(list(ks), inercias, "o-")
            ax.set_xlabel("k")
            ax.set_ylabel("Inércia")
            ax.set_title("Método do Cotovelo")
            ax.axvline(x=self._k, color="red", linestyle="--", label=f"k={self._k} escolhido")
            ax.legend()
            fig.savefig(_FIGURES_DIR / "cotovelo.png", dpi=100, bbox_inches="tight")
            plt.close(fig)

            fig, ax = plt.subplots()
            for k_idx in range(self._k):
                mask = labels == k_idx
                ax.scatter(X_scaled[mask, 0], X_scaled[mask, 1], label=f"Cluster {k_idx}", alpha=0.7)
            ax.set_xlabel("DY 12M (padronizado)")
            ax.set_ylabel("P/VP (padronizado)")
            ax.set_title("Clusters FII — DY vs P/VP")
            ax.legend()
            fig.savefig(_FIGURES_DIR / "clusters_scatter.png", dpi=100, bbox_inches="tight")
            plt.close(fig)

            logger.info("Figuras salvas em %s", _FIGURES_DIR)
        except Exception as e:
            logger.warning("Falha ao salvar figuras: %s", e)
