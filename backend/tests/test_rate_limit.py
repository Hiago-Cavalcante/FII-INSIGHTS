from app.utils.rate_limit import limiter


def test_login_estoura_em_11_tentativas_por_ip(client_carteira):
    """A 11ª tentativa de login do mesmo IP (10/min) retorna 429 (RNF-02′)."""
    client, novo_usuario = client_carteira
    novo_usuario("brute@b.com")  # registra com o limiter ainda desligado
    limiter.enabled = True
    try:
        headers = {"X-Forwarded-For": "203.0.113.7"}
        for _ in range(10):
            r = client.post(
                "/api/v1/auth/login",
                json={"email": "brute@b.com", "senha": "errada"},
                headers=headers,
            )
            assert r.status_code != 429
        r = client.post(
            "/api/v1/auth/login",
            json={"email": "brute@b.com", "senha": "errada"},
            headers=headers,
        )
        assert r.status_code == 429
    finally:
        limiter.enabled = False
