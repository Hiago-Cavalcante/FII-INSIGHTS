from fastapi.testclient import TestClient


def test_health_retorna_ok(client: TestClient) -> None:
    resposta = client.get("/health")
    assert resposta.status_code == 200
    assert resposta.json() == {"status": "ok"}


def test_health_content_type_json(client: TestClient) -> None:
    resposta = client.get("/health")
    assert "application/json" in resposta.headers["content-type"]
