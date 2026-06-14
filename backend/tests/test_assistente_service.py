from datetime import date

import pytest

from app.models.fundo import Fundo
from app.models.indicador import Indicador
from app.services.assistente_llm import FakeLLM
from app.services.assistente_service import (
    FundoNaoEncontrado,
    montar_contexto_fundo,
    responder,
)


def _fundo(db, ticker="HGLG11", classe="FII"):
    f = Fundo(ticker=ticker, nome="Teste", segmento="Logística", classe=classe)
    db.add(f)
    db.flush()
    db.add(
        Indicador(
            fundo_id=f.id,
            data_referencia=date.today(),
            dy_atual=0.09,
            p_vp=0.95,
            liquidez_diaria=2e6,
            volatilidade_12m=0.10,
            patrimonio_liquido=5e9,
            num_cotistas=300000,
        )
    )
    db.commit()
    return f


def test_montar_contexto_inclui_score_e_indicadores(db_session):
    _fundo(db_session)
    ctx = montar_contexto_fundo(db_session, "hglg11", nivel="iniciante")
    assert ctx["ticker"] == "HGLG11"
    assert ctx["classe"] == "FII"
    assert 0 <= ctx["score"] <= 100
    assert any(i["indicador"] == "dy_atual" for i in ctx["indicadores"])


def test_responder_injeta_grounding_e_restricao(db_session):
    _fundo(db_session)
    fake = FakeLLM("explicação")
    out = responder(db_session, "HGLG11", "Por que essa nota?", nivel="iniciante", llm=fake)
    assert out["resposta"] == "explicação"
    assert out["fundo"]["ticker"] == "HGLG11"
    # grounding e restrição presentes no que foi enviado ao LLM:
    assert "HGLG11" in fake.ultimo_prompt
    assert "Por que essa nota?" in fake.ultimo_prompt
    assert "somente" in fake.ultimo_system.lower()
    assert "iniciante" in fake.ultimo_system.lower()
    # a decomposição factual (grounding) chega ao prompt:
    assert "dy_atual" in fake.ultimo_prompt
    assert "contribui" in fake.ultimo_prompt


def test_responder_ticker_inexistente(db_session):
    with pytest.raises(FundoNaoEncontrado):
        responder(db_session, "ZZZZ11", "?", nivel="iniciante", llm=FakeLLM())


def test_sem_indicadores_nao_inventa_score(db_session):
    # RNF-04: fundo sem indicadores NÃO pode virar score 0 / "Evitar" no grounding.
    db_session.add(Fundo(ticker="NOVO11", nome="Novo", segmento="Logística", classe="FII"))
    db_session.commit()
    ctx = montar_contexto_fundo(db_session, "NOVO11", nivel="iniciante")
    assert ctx["score"] is None
    assert ctx["classificacao"] == "Sem dados"
    assert ctx["indicadores"] == []

    fake = FakeLLM("ok")
    responder(db_session, "NOVO11", "Por que?", nivel="iniciante", llm=fake)
    assert "Evitar" not in fake.ultimo_prompt
    assert "não há score" in fake.ultimo_prompt.lower() or "sem indicadores" in fake.ultimo_prompt.lower()
