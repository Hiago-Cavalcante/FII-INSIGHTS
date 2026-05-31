from fastapi.testclient import TestClient


def test_ranking_perfil_moderado_retorna_lista_ordenada(client_seeded: TestClient):
    r = client_seeded.get("/api/v1/ranking?perfil=moderado")
    assert r.status_code == 200
    dados = r.json()
    assert len(dados) == 3
    scores = [d["score"] for d in dados]
    assert scores == sorted(scores, reverse=True)


def test_ranking_inclui_indicadores_em_display(client_seeded: TestClient):
    r = client_seeded.get("/api/v1/ranking?perfil=moderado")
    item = next(d for d in r.json() if d["ticker"] == "AAAA11")
    assert item["dy_atual"] == 10.0
    assert item["liquidez_diaria"] == 18.0
    assert item["patrimonio_liquido"] == 5.0
    assert "classificacao" in item


def test_ranking_default_perfil_moderado(client_seeded: TestClient):
    r = client_seeded.get("/api/v1/ranking")
    assert r.status_code == 200
    assert len(r.json()) == 3


def test_ranking_perfil_invalido_retorna_422(client_seeded: TestClient):
    r = client_seeded.get("/api/v1/ranking?perfil=inexistente")
    assert r.status_code == 422
