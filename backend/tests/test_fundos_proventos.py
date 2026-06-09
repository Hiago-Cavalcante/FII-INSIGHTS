def test_proventos_do_fundo(client_carteira):
    client, _ = client_carteira  # a fixture já semeia 2 proventos p/ HGLG11
    r = client.get("/api/v1/fundos/HGLG11/proventos")
    assert r.status_code == 200
    body = r.json()
    assert len(body) == 2
    assert {"data_com", "data_pagamento", "valor_por_cota", "tipo"} <= set(body[0].keys())


def test_proventos_fundo_inexistente(client_carteira):
    client, _ = client_carteira
    assert client.get("/api/v1/fundos/ZZZZ11/proventos").status_code == 404
