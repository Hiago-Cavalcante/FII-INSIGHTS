from __future__ import annotations

import logging
import math
from datetime import date
from pathlib import Path

import numpy as np
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import StandardScaler
from sqlalchemy.orm import Session

from app.models.cluster import Cluster, FundoCluster
from app.models.fundo import Fundo
from app.models.indicador import Indicador
from app.repositories.fundo_repository import FundoRepository
from app.repositories.indicador_repository import IndicadorRepository

logger = logging.getLogger(__name__)

_FIGURES_DIR = Path(__file__).parent.parent.parent / "data" / "figures"

# Nomes/perfis atribuídos por rank de risco (volatilidade) crescente.
_NOMES_POR_RANK: list[tuple[str, str]] = [
    ("Tijolo Conservador", "conservador"),
    ("Tijolo Balanceado", "moderado"),
    ("Híbrido Diversificado", "moderado"),
    ("Papel Agressivo", "arrojado"),
]


def preparar_features(
    indicadores: list[Indicador],
    fundos: dict[int, Fundo],
) -> tuple[np.ndarray, list[int]]:
    """Extrai 4 features: [dy_12m, p_vp, log10(liquidez_diaria), volatilidade_12m].

    Obrigatórios: dy_12m, p_vp, liquidez_diaria > 0. Volatilidade ausente é
    imputada com a mediana dos presentes (mantém a cobertura de fundos).
    """
    candidatos = [
        ind
        for ind in indicadores
        if ind.dy_12m is not None
        and ind.p_vp is not None
        and ind.liquidez_diaria is not None
        and ind.liquidez_diaria > 0
    ]

    vols = [ind.volatilidade_12m for ind in candidatos if ind.volatilidade_12m is not None]
    vol_mediana = float(np.median(vols)) if vols else 0.0

    rows: list[list[float]] = []
    fundo_ids: list[int] = []
    for ind in candidatos:
        vol = ind.volatilidade_12m if ind.volatilidade_12m is not None else vol_mediana
        dy12m, pvp, liq = ind.dy_12m, ind.p_vp, ind.liquidez_diaria
        assert dy12m is not None and pvp is not None and liq is not None
        rows.append([dy12m, pvp, math.log10(liq), vol])
        fundo_ids.append(ind.fundo_id)

    if not rows:
        return np.empty((0, 4)), []

    return np.array(rows, dtype=float), fundo_ids


def nomear_clusters_por_risco(
    centroides: list[dict[str, float]],
) -> list[tuple[str, str]]:
    """Nomeia clusters ranqueando-os por risco (volatilidade asc, desempate DY asc).

    `centroides[i]` deve ter `volatilidade_media` e `dy_medio`. Retorna a lista
    alinhada ao índice do cluster com (nome, perfil_risco). Garante nomes
    distintos para k <= 4 (acima disso o último nome se repete).
    """
    ordem = sorted(
        range(len(centroides)),
        key=lambda i: (centroides[i]["volatilidade_media"], centroides[i]["dy_medio"]),
    )
    resultado: list[tuple[str, str]] = [("", "")] * len(centroides)
    for rank, k_idx in enumerate(ordem):
        resultado[k_idx] = _NOMES_POR_RANK[min(rank, len(_NOMES_POR_RANK) - 1)]
    return resultado


def calcular_silhuetas(
    x_scaled: np.ndarray,
    ks: range = range(2, 9),
) -> dict[int, float]:
    """silhouette_score médio para cada k válido (2 <= k <= n-1)."""
    n = len(x_scaled)
    scores: dict[int, float] = {}
    for k in ks:
        if k < 2 or k > n - 1:
            continue
        labels = KMeans(n_clusters=k, random_state=42, n_init=10).fit_predict(x_scaled)
        scores[k] = float(silhouette_score(x_scaled, labels))
    return scores


class ClusteringService:
    def __init__(self, db: Session, k: int = 4) -> None:
        self._db = db
        self._k = k
        self._fundos_repo = FundoRepository(db)
        self._ind_repo = IndicadorRepository(db)

    def executar(self) -> dict[str, int]:
        indicadores = self._ind_repo.listar_mais_recentes_todos()
        fundos = {f.id: f for f in self._fundos_repo.listar_todos()}

        x, fundo_ids = preparar_features(indicadores, fundos)

        if len(fundo_ids) < self._k:
            logger.warning(
                "Fundos insuficientes para %d clusters (%d disponíveis)",
                self._k,
                len(fundo_ids),
            )
            return {"clusters_criados": 0, "fundos_clusterizados": 0}

        scaler = StandardScaler()
        x_scaled = scaler.fit_transform(x)

        kmeans = KMeans(n_clusters=self._k, random_state=42, n_init=10)
        labels = kmeans.fit_predict(x_scaled)
        centroids_orig = scaler.inverse_transform(kmeans.cluster_centers_)

        centroides = [
            {
                "dy_medio": float(centroids_orig[i, 0]),
                "p_vp_medio": float(centroids_orig[i, 1]),
                "log_liq_medio": float(centroids_orig[i, 2]),
                "volatilidade_media": float(centroids_orig[i, 3]),
            }
            for i in range(self._k)
        ]
        nomes = nomear_clusters_por_risco(centroides)

        self._db.query(FundoCluster).delete()
        self._db.query(Cluster).delete()
        self._db.flush()

        hoje = date.today()
        for k_idx in range(self._k):
            c = centroides[k_idx]
            nome, perfil = nomes[k_idx]
            membros_idx = [i for i, m in enumerate(labels == k_idx) if m]

            cluster = Cluster(
                nome_interpretado=nome,
                perfil_risco=perfil,
                descricao=(
                    f"DY médio: {c['dy_medio']:.1%}, P/VP médio: {c['p_vp_medio']:.2f}, "
                    f"Volatilidade média: {c['volatilidade_media']:.1%}"
                ),
                dy_medio=c["dy_medio"],
                volatilidade_media=c["volatilidade_media"],
                p_vp_medio=c["p_vp_medio"],
                num_fiis=len(membros_idx),
            )
            self._db.add(cluster)
            self._db.flush()

            for idx in membros_idx:
                self._db.add(
                    FundoCluster(
                        fundo_id=fundo_ids[idx],
                        cluster_id=cluster.id,
                        data_atribuicao=hoje,
                    )
                )
            logger.info("Cluster '%s' (%s): %d FIIs", nome, perfil, len(membros_idx))

        self._db.commit()
        logger.info("Clustering: %d clusters, %d fundos", self._k, len(fundo_ids))

        self._salvar_figuras(x_scaled, labels)

        return {"clusters_criados": self._k, "fundos_clusterizados": len(fundo_ids)}

    def _salvar_figuras(self, x_scaled: np.ndarray, labels: np.ndarray) -> None:
        try:
            import matplotlib

            matplotlib.use("Agg")
            import matplotlib.pyplot as plt

            _FIGURES_DIR.mkdir(parents=True, exist_ok=True)
            ks_validos = [k for k in range(2, 9) if k <= len(x_scaled) - 1]

            # Cotovelo (inércia × k)
            inercias = [
                KMeans(n_clusters=k, random_state=42, n_init=10).fit(x_scaled).inertia_
                for k in ks_validos
            ]
            fig, ax = plt.subplots()
            ax.plot(ks_validos, inercias, "o-")
            ax.set_xlabel("k")
            ax.set_ylabel("Inércia")
            ax.set_title("Método do Cotovelo")
            ax.axvline(x=self._k, color="red", linestyle="--", label=f"k={self._k} escolhido")
            ax.legend()
            fig.savefig(_FIGURES_DIR / "cotovelo.png", dpi=100, bbox_inches="tight")
            plt.close(fig)

            # Silhueta (silhouette médio × k)
            sils = calcular_silhuetas(x_scaled, range(2, 9))
            if sils:
                fig, ax = plt.subplots()
                ax.plot(list(sils.keys()), list(sils.values()), "o-")
                ax.set_xlabel("k")
                ax.set_ylabel("Silhouette médio")
                ax.set_title("Análise de Silhueta")
                ax.axvline(
                    x=self._k, color="red", linestyle="--", label=f"k={self._k} escolhido"
                )
                ax.legend()
                fig.savefig(_FIGURES_DIR / "silhouette.png", dpi=100, bbox_inches="tight")
                plt.close(fig)

            # Dispersão DY × Volatilidade (padronizados) colorida por cluster
            fig, ax = plt.subplots()
            for k_idx in range(self._k):
                mask = labels == k_idx
                ax.scatter(x_scaled[mask, 0], x_scaled[mask, 3], label=f"Cluster {k_idx}", alpha=0.7)
            ax.set_xlabel("DY 12M (padronizado)")
            ax.set_ylabel("Volatilidade 12M (padronizada)")
            ax.set_title("Clusters FII — DY × Volatilidade")
            ax.legend()
            fig.savefig(_FIGURES_DIR / "clusters_scatter.png", dpi=100, bbox_inches="tight")
            plt.close(fig)

            logger.info("Figuras salvas em %s", _FIGURES_DIR)
        except Exception as e:
            logger.warning("Falha ao salvar figuras: %s", e)
