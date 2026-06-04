from datetime import timedelta

from app.utils.security import criar_access_token, decodificar_token, hash_senha, verificar_senha


def test_hash_senha_nao_retorna_a_senha_em_claro():
    h = hash_senha("segredo123")
    assert h != "segredo123"
    assert isinstance(h, str)


def test_verificar_senha_correta():
    h = hash_senha("segredo123")
    assert verificar_senha("segredo123", h) is True


def test_verificar_senha_incorreta():
    h = hash_senha("segredo123")
    assert verificar_senha("outra-senha", h) is False


def test_token_round_trip_retorna_o_subject():
    token = criar_access_token("42")
    assert decodificar_token(token) == "42"


def test_token_expirado_retorna_none():
    token = criar_access_token("42", expires_delta=timedelta(seconds=-1))
    assert decodificar_token(token) is None


def test_token_adulterado_retorna_none():
    token = criar_access_token("42")
    assert decodificar_token(token + "x") is None
