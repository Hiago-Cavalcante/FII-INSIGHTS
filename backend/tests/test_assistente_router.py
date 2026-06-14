from app.main import app
from app.routers.assistente import get_llm
from app.services.assistente_llm import FakeLLM


def test_explicar_retorna_resposta(client_carteira):
    client, novo_usuario = client_carteira
    app.dependency_overrides[get_llm] = lambda: FakeLLM("explicado")
    try:
        h = novo_usuario("ia@b.com")
        r = client.post(
            "/api/v1/assistente/explicar",
            json={"ticker": "HGLG11", "pergunta": "Por que?", "nivel": "iniciante"},
            headers=h,
        )
        assert r.status_code == 200
        body = r.json()
        assert body["resposta"] == "explicado"
        assert body["fundo"]["ticker"] == "HGLG11"
    finally:
        app.dependency_overrides.pop(get_llm, None)


def test_explicar_exige_auth(client_carteira):
    client, _ = client_carteira
    r = client.post("/api/v1/assistente/explicar", json={"ticker": "HGLG11", "pergunta": "?"})
    assert r.status_code in (401, 403)


def test_explicar_ticker_inexistente(client_carteira):
    client, novo_usuario = client_carteira
    app.dependency_overrides[get_llm] = lambda: FakeLLM()
    try:
        h = novo_usuario("ia2@b.com")
        r = client.post(
            "/api/v1/assistente/explicar",
            json={"ticker": "ZZZZ11", "pergunta": "?", "nivel": "iniciante"},
            headers=h,
        )
        assert r.status_code == 404
    finally:
        app.dependency_overrides.pop(get_llm, None)
