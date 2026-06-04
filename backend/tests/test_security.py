from datetime import timedelta

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app.repositories.usuario_repository import UsuarioRepository
from app.utils.security import criar_access_token, decodificar_token, get_current_user, hash_senha, verificar_senha


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


def test_get_current_user_com_token_valido(db_session):
    repo = UsuarioRepository(db_session)
    u = repo.criar(email="x@y.com", senha_hash="h")
    token = criar_access_token(str(u.id))
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

    atual = get_current_user(creds=creds, db=db_session)
    assert atual.id == u.id


def test_get_current_user_sem_credenciais_401(db_session):
    with pytest.raises(HTTPException) as exc:
        get_current_user(creds=None, db=db_session)
    assert exc.value.status_code == 401


def test_get_current_user_token_invalido_401(db_session):
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials="lixo")
    with pytest.raises(HTTPException) as exc:
        get_current_user(creds=creds, db=db_session)
    assert exc.value.status_code == 401
