from datetime import date, timedelta
from decimal import Decimal

from app.models.fundo import Fundo
from app.models.indicador import Indicador
from app.models.posicao import Posicao
from app.models.provento import Provento
from app.services.recomendacao_service import (
    analisar_precos_teto,
    calcular_preco_teto,
    proventos_ultimos_12m,
    sugerir_rebalanceamento,
)


# ── Bazin ─────────────────────────────────────────────────────────────


def test_calcular_preco_teto_bazin():
    # R$12 anuais ÷ yield-alvo 8% = teto 150,00
    assert calcular_preco_teto(Decimal("12.00"), 0.08) == Decimal("150.00")


def test_preco_teto_sem_proventos_eh_none():
    assert calcular_preco_teto(Decimal("0"), 0.08) is None
    assert calcular_preco_teto(None, 0.08) is None


def test_proventos_ultimos_12m_soma_so_a_janela(db_session):
    f = Fundo(ticker="AAAA11", classe="FII")
    db_session.add(f)
    db_session.flush()
    hoje = date(2026, 6, 1)
    db_session.add_all(
        [
            Provento(
                fundo_id=f.id,
                data_com=hoje,
                tipo="rendimento",
                data_pagamento=hoje - timedelta(days=30),
                valor_por_cota=Decimal("1.00"),
            ),
            Provento(
                fundo_id=f.id,
                data_com=hoje - timedelta(days=395),  # data_com distinta (chave única)
                tipo="rendimento",
                data_pagamento=hoje - timedelta(days=400),  # fora da janela de 12m
                valor_por_cota=Decimal("9.99"),
            ),
        ]
    )
    db_session.commit()
    assert proventos_ultimos_12m(db_session, f.id, hoje=hoje) == Decimal("1.00")


# ── Rebalanceamento ───────────────────────────────────────────────────


def test_rebalanceamento_aportar_mais_quando_abaixo_do_alvo():
    r = sugerir_rebalanceamento(
        {"FII": Decimal("9000"), "FIAGRO": Decimal("1000")}, Decimal("10000"), alvo_fii=0.80
    )
    classes = {c["classe"]: c for c in r["classes"]}
    assert classes["FIAGRO"]["sugestao"] == "Aportar mais"  # 10% < 20% - banda
    assert classes["FII"]["sugestao"] == "Reduzir ritmo"  # 90% > 80% + banda


def test_rebalanceamento_equilibrado_dentro_da_banda():
    r = sugerir_rebalanceamento(
        {"FII": Decimal("8200"), "FIAGRO": Decimal("1800")}, Decimal("10000"), alvo_fii=0.80
    )
    assert all(c["sugestao"] == "Equilibrado" for c in r["classes"])  # 82/18 dentro de ±5pp


def test_rebalanceamento_carteira_vazia():
    r = sugerir_rebalanceamento({"FII": Decimal("0"), "FIAGRO": Decimal("0")}, Decimal("0"), alvo_fii=0.80)
    assert r["total_investido"] == Decimal("0")
    assert r["classes"] == []


# ── Análise por posição ───────────────────────────────────────────────


def test_analisar_precos_teto_status_e_margem(db_session):
    f = Fundo(ticker="KNCA11", nome="Kinea Crédito Agro", classe="FIAGRO")
    db_session.add(f)
    db_session.flush()
    hoje = date.today()
    # 12 proventos de R$1,00 = R$12 anuais; yield FIAGRO 0,12 -> teto 100,00
    db_session.add_all(
        [
            Provento(
                fundo_id=f.id,
                data_com=hoje - timedelta(days=15 * i),
                tipo="rendimento",
                data_pagamento=hoje - timedelta(days=15 * i),
                valor_por_cota=Decimal("1.00"),
            )
            for i in range(12)
        ]
    )
    db_session.add(Indicador(fundo_id=f.id, data_referencia=hoje, preco_atual=90.0))
    db_session.add(
        Posicao(
            usuario_id=1,
            fundo_id=f.id,
            quantidade=10,
            preco_medio=Decimal("95"),
            valor_investido=Decimal("950"),
        )
    )
    db_session.commit()

    itens = analisar_precos_teto(db_session, usuario_id=1, yield_fii=0.08, yield_fiagro=0.12)
    item = next(i for i in itens if i["ticker"] == "KNCA11")
    assert item["classe"] == "FIAGRO"
    assert item["preco_teto"] == Decimal("100.00")
    assert item["status"] == "Abaixo do teto"  # 90 <= 100
    assert item["margem_seguranca"] is not None and item["margem_seguranca"] > 0  # desconto


def test_analisar_precos_teto_sem_proventos_status_sem_dados(db_session):
    f = Fundo(ticker="NOVO11", classe="FII")
    db_session.add(f)
    db_session.flush()
    db_session.add(Indicador(fundo_id=f.id, data_referencia=date.today(), preco_atual=100.0))
    db_session.add(
        Posicao(
            usuario_id=1,
            fundo_id=f.id,
            quantidade=5,
            preco_medio=Decimal("100"),
            valor_investido=Decimal("500"),
        )
    )
    db_session.commit()

    item = next(i for i in analisar_precos_teto(db_session, usuario_id=1) if i["ticker"] == "NOVO11")
    assert item["preco_teto"] is None
    assert item["status"] == "Sem dados"
    assert item["margem_seguranca"] is None
