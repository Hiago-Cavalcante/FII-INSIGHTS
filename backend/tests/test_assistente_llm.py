import json

import httpx
import pytest
import respx

from app.services.assistente_llm import AssistenteIndisponivel, FakeLLM, GeminiClient


def test_gemini_client_extrai_texto():
    resp = {"candidates": [{"content": {"parts": [{"text": "Olá explicação"}]}}]}
    with respx.mock:
        respx.post(url__regex=r"generativelanguage\.googleapis\.com").mock(return_value=httpx.Response(200, json=resp))
        out = GeminiClient(api_key="k", model="gemini-2.0-flash").gerar("sys", "user")
    assert out == "Olá explicação"


def test_gemini_client_desliga_thinking():
    """O assistente só explica um score já calculado; o thinking dos modelos 2.5 deve
    vir desligado para não consumir o orçamento de tokens e truncar a resposta."""
    resp = {"candidates": [{"content": {"parts": [{"text": "ok"}]}}]}
    with respx.mock:
        rota = respx.post(url__regex=r"generativelanguage\.googleapis\.com").mock(
            return_value=httpx.Response(200, json=resp)
        )
        GeminiClient(api_key="k", model="gemini-2.5-flash").gerar("sys", "user")
        corpo = json.loads(rota.calls.last.request.content)
    assert corpo["generationConfig"]["thinkingConfig"]["thinkingBudget"] == 0


def test_gemini_client_retry_apos_503_transitorio():
    """Um 503 transitório (modelo sobrecarregado) não pode derrubar a resposta:
    o adapter deve tentar de novo e devolver o texto na tentativa seguinte."""
    resp_ok = {"candidates": [{"content": {"parts": [{"text": "depois do retry"}]}}]}
    with respx.mock:
        respx.post(url__regex=r"generativelanguage").mock(
            side_effect=[httpx.Response(503), httpx.Response(200, json=resp_ok)]
        )
        out = GeminiClient(api_key="k", model="m", backoff_base=0).gerar("s", "u")
    assert out == "depois do retry"


def test_gemini_client_503_persistente_levanta():
    with respx.mock:
        respx.post(url__regex=r"generativelanguage").mock(return_value=httpx.Response(503))
        with pytest.raises(AssistenteIndisponivel):
            GeminiClient(api_key="k", model="m", max_tentativas=3, backoff_base=0).gerar("s", "u")


def test_gemini_client_sem_chave_levanta():
    with pytest.raises(AssistenteIndisponivel):
        GeminiClient(api_key="", model="m").gerar("s", "u")


def test_gemini_client_erro_http_levanta():
    with respx.mock:
        respx.post(url__regex=r"generativelanguage").mock(return_value=httpx.Response(500))
        with pytest.raises(AssistenteIndisponivel):
            GeminiClient(api_key="k", model="m").gerar("s", "u")


def test_gemini_client_resposta_inesperada_levanta():
    with respx.mock:
        respx.post(url__regex=r"generativelanguage").mock(return_value=httpx.Response(200, json={"x": 1}))
        with pytest.raises(AssistenteIndisponivel):
            GeminiClient(api_key="k", model="m").gerar("s", "u")


def test_fake_llm_registra_chamada():
    fake = FakeLLM("resp")
    out = fake.gerar("SYS", "PROMPT")
    assert out == "resp"
    assert fake.ultimo_system == "SYS"
    assert fake.ultimo_prompt == "PROMPT"
