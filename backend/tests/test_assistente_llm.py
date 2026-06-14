import httpx
import pytest
import respx

from app.services.assistente_llm import AssistenteIndisponivel, FakeLLM, GeminiClient


def test_gemini_client_extrai_texto():
    resp = {"candidates": [{"content": {"parts": [{"text": "Olá explicação"}]}}]}
    with respx.mock:
        respx.post(url__regex=r"generativelanguage\.googleapis\.com").mock(
            return_value=httpx.Response(200, json=resp)
        )
        out = GeminiClient(api_key="k", model="gemini-2.0-flash").gerar("sys", "user")
    assert out == "Olá explicação"


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
