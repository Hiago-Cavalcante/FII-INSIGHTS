import pytest
import numpy as np
from datetime import date

from app.models.fundo import Fundo
from app.models.indicador import Indicador
from app.services.clustering_service import (
    ClusteringService,
    preparar_features,
    interpretar_cluster,
)


def _criar_fundos_com_indicadores(db_session, n=20):
    rng = np.random.default_rng(42)
    fundos = []
    for i in range(n):
        fundo = Fundo(ticker=f"TS{i:02d}11", segmento="Logística")
        db_session.add(fundo)
        db_session.flush()
        ind = Indicador(
            fundo_id=fundo.id,
            data_referencia=date(2026, 5, 26),
            dy_12m=float(rng.uniform(0.05, 0.15)),
            p_vp=float(rng.uniform(0.70, 1.30)),
            vacancia_fisica=float(rng.uniform(0.0, 0.30)),
            vacancia_financeira=float(rng.uniform(0.0, 0.30)),
            liquidez_diaria=float(rng.uniform(100_000, 50_000_000)),
        )
        db_session.add(ind)
        fundos.append(fundo)
    db_session.commit()
    return fundos


def test_preparar_features_retorna_array(db_session):
    _criar_fundos_com_indicadores(db_session, 10)
    from app.repositories.indicador_repository import IndicadorRepository
    from app.repositories.fundo_repository import FundoRepository
    inds = IndicadorRepository(db_session).listar_mais_recentes_todos()
    fundos = {f.id: f for f in FundoRepository(db_session).listar_todos()}
    X, ids = preparar_features(inds, fundos)
    assert X.shape[0] == 10
    assert X.shape[1] == 4
    assert len(ids) == 10


def test_preparar_features_exclui_fundo_sem_liquidez(db_session):
    fundo = Fundo(ticker="NOLIQU11", segmento="Logística")
    db_session.add(fundo)
    db_session.flush()
    ind = Indicador(
        fundo_id=fundo.id,
        data_referencia=date(2026, 5, 26),
        dy_12m=0.08,
        p_vp=1.0,
        # liquidez_diaria=None → excluído
    )
    db_session.add(ind)
    db_session.commit()
    from app.repositories.indicador_repository import IndicadorRepository
    from app.repositories.fundo_repository import FundoRepository
    inds = IndicadorRepository(db_session).listar_mais_recentes_todos()
    fundos = {f.id: f for f in FundoRepository(db_session).listar_todos()}
    X, ids = preparar_features(inds, fundos)
    assert fundo.id not in ids


def test_clustering_service_cria_4_clusters(db_session):
    _criar_fundos_com_indicadores(db_session, 20)
    resultado = ClusteringService(db_session).executar()
    assert resultado["clusters_criados"] == 4
    assert resultado["fundos_clusterizados"] > 0


def test_interpretar_cluster_retorna_nome_e_perfil():
    nome, perfil = interpretar_cluster(
        dy_medio=0.06, p_vp_medio=1.05, vacancia_media=0.03, log_liq_medio=7.0
    )
    assert isinstance(nome, str)
    assert perfil in {"conservador", "moderado", "arrojado"}
