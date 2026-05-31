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


PESOS_OK = {
    "dy_atual": 0.20, "dy_12m": 0.10, "p_vp": 0.15,
    "vacancia_fisica": 0.10, "vacancia_financeira": 0.10,
    "liquidez_diaria": 0.10, "volatilidade_12m": 0.10,
    "patrimonio_liquido": 0.05, "num_cotistas": 0.05, "segmento": 0.05,
}


def test_simular_com_pesos_validos(client_seeded: TestClient):
    r = client_seeded.post("/api/v1/ranking/simular", json={"pesos": PESOS_OK})
    assert r.status_code == 200
    assert len(r.json()) == 3


def test_simular_soma_diferente_de_um_retorna_422(client_seeded: TestClient):
    ruins = {**PESOS_OK, "dy_atual": 0.50}  # soma = 1.30
    r = client_seeded.post("/api/v1/ranking/simular", json={"pesos": ruins})
    assert r.status_code == 422


def test_detalhe_fundo_inclui_volatilidade(client_seeded: TestClient):
    r = client_seeded.get("/api/v1/fundos/AAAA11")
    assert r.status_code == 200
    assert r.json()["indicador"]["volatilidade_12m"] == 0.085  # cru (este endpoint não converte)
