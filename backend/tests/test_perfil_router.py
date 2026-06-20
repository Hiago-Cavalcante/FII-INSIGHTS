"""Testes do router de perfil — escopo por dono (RNF-02′).

O perfil deixou de ser global ("perfil-unico") e passa a pertencer ao usuário
autenticado. Estes testes travam o isolamento (sem IDOR/BOLA) e a exigência de auth.
"""


def test_get_perfil_exige_auth(client_carteira):
    client, _ = client_carteira
    r = client.get("/api/v1/perfil")
    assert r.status_code in (401, 403)


def test_put_perfil_exige_auth(client_carteira):
    client, _ = client_carteira
    r = client.put("/api/v1/perfil", json={"tipo": "arrojado"})
    assert r.status_code in (401, 403)


def test_get_cria_perfil_default_moderado(client_carteira):
    client, novo_usuario = client_carteira
    h = novo_usuario("p1@b.com")
    r = client.get("/api/v1/perfil", headers=h)
    assert r.status_code == 200
    assert r.json()["tipo"] == "moderado"


def test_put_persiste_para_o_mesmo_usuario(client_carteira):
    client, novo_usuario = client_carteira
    h = novo_usuario("p2@b.com")
    client.put("/api/v1/perfil", json={"tipo": "arrojado"}, headers=h)
    r = client.get("/api/v1/perfil", headers=h)
    assert r.json()["tipo"] == "arrojado"


def test_perfis_sao_isolados_por_usuario(client_carteira):
    client, novo_usuario = client_carteira
    ha = novo_usuario("a@b.com")
    hb = novo_usuario("b@b.com")

    # A define arrojado; B nunca tocou no perfil dele.
    client.put("/api/v1/perfil", json={"tipo": "arrojado"}, headers=ha)

    # B continua vendo o default — não o que A escreveu (sem vazamento entre contas).
    rb = client.get("/api/v1/perfil", headers=hb)
    assert rb.json()["tipo"] == "moderado"

    # E A continua vendo o seu próprio.
    ra = client.get("/api/v1/perfil", headers=ha)
    assert ra.json()["tipo"] == "arrojado"
