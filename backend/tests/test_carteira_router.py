def test_criar_posicao(client_carteira):
    client, novo_usuario = client_carteira
    h = novo_usuario()
    r = client.post(
        "/api/v1/carteira/posicoes", json={"ticker": "HGLG11", "quantidade": 10, "preco": "100.00"}, headers=h
    )
    assert r.status_code == 201
    body = r.json()
    assert body["ticker"] == "HGLG11"
    assert body["quantidade"] == 10


def test_aporte_recalcula_media(client_carteira):
    client, novo_usuario = client_carteira
    h = novo_usuario()
    client.post("/api/v1/carteira/posicoes", json={"ticker": "HGLG11", "quantidade": 10, "preco": "100.00"}, headers=h)
    r = client.post(
        "/api/v1/carteira/posicoes", json={"ticker": "HGLG11", "quantidade": 10, "preco": "120.00"}, headers=h
    )
    assert r.json()["preco_medio"] == "110.00"


def test_listar_escopado_ao_usuario(client_carteira):
    client, novo_usuario = client_carteira
    ha = novo_usuario("a@b.com")
    hb = novo_usuario("b@b.com")
    client.post("/api/v1/carteira/posicoes", json={"ticker": "HGLG11", "quantidade": 1, "preco": "10.00"}, headers=ha)
    r = client.get("/api/v1/carteira/posicoes", headers=hb)
    assert r.json() == []


def test_resumo_por_classe(client_carteira):
    client, novo_usuario = client_carteira
    h = novo_usuario()
    client.post("/api/v1/carteira/posicoes", json={"ticker": "HGLG11", "quantidade": 10, "preco": "100.00"}, headers=h)
    client.post("/api/v1/carteira/posicoes", json={"ticker": "SPAF11", "quantidade": 5, "preco": "200.00"}, headers=h)
    r = client.get("/api/v1/carteira/resumo", headers=h)
    body = r.json()
    assert body["total_investido"] == "2000.00"
    assert body["por_classe"]["FIAGRO"] == "1000.00"


def test_editar_posicao(client_carteira):
    client, novo_usuario = client_carteira
    h = novo_usuario()
    pid = client.post(
        "/api/v1/carteira/posicoes", json={"ticker": "HGLG11", "quantidade": 10, "preco": "100.00"}, headers=h
    ).json()["id"]
    r = client.put(f"/api/v1/carteira/posicoes/{pid}", json={"quantidade": 20, "preco_medio": "90.00"}, headers=h)
    assert r.status_code == 200
    assert r.json()["valor_investido"] == "1800.00"


def test_remover_posicao(client_carteira):
    client, novo_usuario = client_carteira
    h = novo_usuario()
    pid = client.post(
        "/api/v1/carteira/posicoes", json={"ticker": "HGLG11", "quantidade": 10, "preco": "100.00"}, headers=h
    ).json()["id"]
    assert client.delete(f"/api/v1/carteira/posicoes/{pid}", headers=h).status_code == 204
    assert client.get("/api/v1/carteira/posicoes", headers=h).json() == []


def test_isolamento_nao_edita_posicao_de_outro(client_carteira):
    client, novo_usuario = client_carteira
    ha = novo_usuario("a@b.com")
    hb = novo_usuario("b@b.com")
    pid = client.post(
        "/api/v1/carteira/posicoes", json={"ticker": "HGLG11", "quantidade": 1, "preco": "10.00"}, headers=ha
    ).json()["id"]
    r = client.put(f"/api/v1/carteira/posicoes/{pid}", json={"quantidade": 99, "preco_medio": "1.00"}, headers=hb)
    assert r.status_code == 404


def test_ticker_fora_do_catalogo_404(client_carteira):
    client, novo_usuario = client_carteira
    h = novo_usuario()
    r = client.post("/api/v1/carteira/posicoes", json={"ticker": "ZZZZ99", "quantidade": 1, "preco": "1.00"}, headers=h)
    assert r.status_code == 404


def test_sem_token_401(client_carteira):
    client, _ = client_carteira
    assert client.get("/api/v1/carteira/posicoes").status_code == 401


def test_dividendos_projeta_renda(client_carteira):
    client, novo_usuario = client_carteira
    h = novo_usuario()
    client.post("/api/v1/carteira/posicoes", json={"ticker": "HGLG11", "quantidade": 10, "preco": "100.00"}, headers=h)
    r = client.get("/api/v1/carteira/dividendos", headers=h)
    assert r.status_code == 200
    body = r.json()
    # média (1.0 + 1.2)/2 = 1.1 × 10 cotas = 11.00
    assert body["renda_mensal"] == "11.00"
    assert body["renda_anual"] == "132.00"
    assert body["por_fundo"][0]["ticker"] == "HGLG11"


def test_dividendos_exige_auth(client_carteira):
    client, _ = client_carteira
    assert client.get("/api/v1/carteira/dividendos").status_code == 401
