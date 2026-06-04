from app.utils.security import hash_senha, verificar_senha


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
