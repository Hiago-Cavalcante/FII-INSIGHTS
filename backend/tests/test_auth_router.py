from __future__ import annotations


def test_register_retorna_token(client_db):
    r = client_db.post("/api/v1/auth/register", json={"email": "a@b.com", "senha": "segredo123"})
    assert r.status_code == 201
    assert "access_token" in r.json()


def test_register_email_duplicado_409(client_db):
    client_db.post("/api/v1/auth/register", json={"email": "a@b.com", "senha": "segredo123"})
    r = client_db.post("/api/v1/auth/register", json={"email": "a@b.com", "senha": "outra123"})
    assert r.status_code == 409


def test_login_ok_retorna_token(client_db):
    client_db.post("/api/v1/auth/register", json={"email": "a@b.com", "senha": "segredo123"})
    r = client_db.post("/api/v1/auth/login", json={"email": "a@b.com", "senha": "segredo123"})
    assert r.status_code == 200
    assert r.json()["token_type"] == "bearer"


def test_login_senha_errada_401(client_db):
    client_db.post("/api/v1/auth/register", json={"email": "a@b.com", "senha": "segredo123"})
    r = client_db.post("/api/v1/auth/login", json={"email": "a@b.com", "senha": "errada"})
    assert r.status_code == 401


def test_login_email_desconhecido_401(client_db):
    r = client_db.post("/api/v1/auth/login", json={"email": "x@y.com", "senha": "segredo123"})
    assert r.status_code == 401


def test_me_com_token(client_db):
    reg = client_db.post("/api/v1/auth/register", json={"email": "a@b.com", "senha": "segredo123"})
    token = reg.json()["access_token"]
    r = client_db.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["email"] == "a@b.com"


def test_register_com_nome_aparece_no_me(client_db):
    reg = client_db.post(
        "/api/v1/auth/register",
        json={"nome": "Hiago", "email": "h@b.com", "senha": "segredo123"},
    )
    assert reg.status_code == 201
    token = reg.json()["access_token"]
    r = client_db.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["nome"] == "Hiago"


def test_me_sem_token_401(client_db):
    r = client_db.get("/api/v1/auth/me")
    assert r.status_code == 401
