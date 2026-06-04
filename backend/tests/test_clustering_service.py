from datetime import date

import numpy as np

from app.models.cluster import Cluster
from app.models.fundo import Fundo
from app.models.indicador import Indicador
from app.repositories.fundo_repository import FundoRepository
from app.repositories.indicador_repository import IndicadorRepository
from app.services.clustering_service import (
    ClusteringService,
    calcular_silhuetas,
    nomear_clusters_por_risco,
    preparar_features,
)


def _criar_fundos_com_indicadores(db_session, n=20):
    rng = np.random.default_rng(42)
    for i in range(n):
        fundo = Fundo(ticker=f"TS{i:02d}11", segmento="Logística")
        db_session.add(fundo)
        db_session.flush()
        db_session.add(
            Indicador(
                fundo_id=fundo.id,
                data_referencia=date(2026, 5, 26),
                dy_12m=float(rng.uniform(0.05, 0.15)),
                p_vp=float(rng.uniform(0.70, 1.30)),
                liquidez_diaria=float(rng.uniform(100_000, 50_000_000)),
                volatilidade_12m=float(rng.uniform(0.05, 0.35)),
            )
        )
    db_session.commit()


def _features(db_session):
    inds = IndicadorRepository(db_session).listar_mais_recentes_todos()
    fundos = {f.id: f for f in FundoRepository(db_session).listar_todos()}
    return preparar_features(inds, fundos)


def test_preparar_features_quatro_colunas(db_session):
    _criar_fundos_com_indicadores(db_session, 10)
    x, ids = _features(db_session)
    assert x.shape == (10, 4)
    assert len(ids) == 10


def test_preparar_features_exclui_sem_liquidez(db_session):
    fundo = Fundo(ticker="NOLIQ11", segmento="Logística")
    db_session.add(fundo)
    db_session.flush()
    db_session.add(
        Indicador(
            fundo_id=fundo.id,
            data_referencia=date(2026, 5, 26),
            dy_12m=0.08,
            p_vp=1.0,
            volatilidade_12m=0.12,  # sem liquidez_diaria
        )
    )
    db_session.commit()
    _, ids = _features(db_session)
    assert fundo.id not in ids


def test_preparar_features_imputa_volatilidade_ausente(db_session):
    for i, vol in enumerate([0.10, 0.20, None]):
        f = Fundo(ticker=f"IMP{i}11", segmento="Logística")
        db_session.add(f)
        db_session.flush()
        db_session.add(
            Indicador(
                fundo_id=f.id,
                data_referencia=date(2026, 5, 26),
                dy_12m=0.08,
                p_vp=1.0,
                liquidez_diaria=1_000_000.0,
                volatilidade_12m=vol,
            )
        )
    db_session.commit()
    x, ids = _features(db_session)
    assert x.shape[0] == 3
    assert not np.isnan(x).any()  # volatilidade ausente foi imputada (mediana 0.15)
    assert x[:, 3].min() > 0


def test_nomear_clusters_por_risco_ranqueia_por_volatilidade():
    centroides = [
        {"volatilidade_media": 0.30, "dy_medio": 0.12},  # maior vol -> Papel Agressivo
        {"volatilidade_media": 0.08, "dy_medio": 0.07},  # menor vol -> Tijolo Conservador
        {"volatilidade_media": 0.13, "dy_medio": 0.09},  # 2o -> Tijolo Balanceado
        {"volatilidade_media": 0.20, "dy_medio": 0.10},  # 3o -> Híbrido Diversificado
    ]
    nomes = nomear_clusters_por_risco(centroides)
    assert nomes[1] == ("Tijolo Conservador", "conservador")
    assert nomes[2] == ("Tijolo Balanceado", "moderado")
    assert nomes[3] == ("Híbrido Diversificado", "moderado")
    assert nomes[0] == ("Papel Agressivo", "arrojado")
    assert len({nome for nome, _ in nomes}) == 4  # nomes distintos


def test_calcular_silhuetas_retorna_score_por_k():
    rng = np.random.default_rng(0)
    x = np.vstack([rng.normal(0, 0.1, (20, 4)), rng.normal(5, 0.1, (20, 4))])
    sils = calcular_silhuetas(x, range(2, 5))
    assert set(sils.keys()) == {2, 3, 4}
    assert all(-1.0 <= v <= 1.0 for v in sils.values())
    assert sils[2] > 0.5  # 2 grupos bem separados -> silhueta alta


def test_clustering_cria_4_clusters_distintos(db_session, tmp_path, monkeypatch):
    import app.services.clustering_service as mod

    monkeypatch.setattr(mod, "_FIGURES_DIR", tmp_path)
    _criar_fundos_com_indicadores(db_session, 20)
    resultado = ClusteringService(db_session).executar()

    assert resultado["clusters_criados"] == 4
    assert resultado["fundos_clusterizados"] > 0

    clusters = db_session.query(Cluster).all()
    assert len({c.nome_interpretado for c in clusters}) == 4  # não degenerado
    assert all(c.volatilidade_media is not None for c in clusters)
    assert (tmp_path / "silhouette.png").exists()
    assert (tmp_path / "cotovelo.png").exists()
