from app.main import app
from app.routers.assistente import get_llm
from app.services.assistente_llm import FakeLLM
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


def test_assistente_estoura_em_6_chamadas_por_minuto(client_carteira):
    """A 6ª chamada/min do mesmo usuário (5/minute) retorna 429 (RF-38)."""
    client, novo_usuario = client_carteira
    h = novo_usuario("ia@b.com")  # registra com limiter desligado
    app.dependency_overrides[get_llm] = lambda: FakeLLM("ok")
    limiter.enabled = True
    try:
        body = {"ticker": "HGLG11", "pergunta": "Por que?", "nivel": "iniciante"}
        for _ in range(5):
            r = client.post("/api/v1/assistente/explicar", json=body, headers=h)
            assert r.status_code != 429
        r = client.post("/api/v1/assistente/explicar", json=body, headers=h)
        assert r.status_code == 429
    finally:
        limiter.enabled = False
        app.dependency_overrides.pop(get_llm, None)


def test_assistente_cota_e_por_usuario_nao_por_ip(client_carteira):
    """Usuário B não é bloqueado quando A estoura a cota (chave por JWT, RF-38)."""
    client, novo_usuario = client_carteira
    ha = novo_usuario("a@b.com")
    hb = novo_usuario("b@b.com")
    app.dependency_overrides[get_llm] = lambda: FakeLLM("ok")
    limiter.enabled = True
    try:
        body = {"ticker": "HGLG11", "pergunta": "?", "nivel": "iniciante"}
        for _ in range(6):  # estoura a cota do usuário A
            client.post("/api/v1/assistente/explicar", json=body, headers=ha)
        r = client.post("/api/v1/assistente/explicar", json=body, headers=hb)
        assert r.status_code == 200
    finally:
        limiter.enabled = False
        app.dependency_overrides.pop(get_llm, None)


def test_register_estoura_em_6_cadastros_por_ip(client_carteira):
    """O 6º cadastro do mesmo IP (5/hora) retorna 429 (RNF-02′)."""
    client, _ = client_carteira
    limiter.enabled = True
    try:
        headers = {"X-Forwarded-For": "203.0.113.9"}
        for i in range(5):
            r = client.post(
                "/api/v1/auth/register",
                json={"email": f"u{i}@b.com", "senha": "segredo123"},
                headers=headers,
            )
            assert r.status_code != 429
        r = client.post(
            "/api/v1/auth/register",
            json={"email": "u6@b.com", "senha": "segredo123"},
            headers=headers,
        )
        assert r.status_code == 429
    finally:
        limiter.enabled = False
