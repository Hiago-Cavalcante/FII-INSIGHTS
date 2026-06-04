from __future__ import annotations

from datetime import UTC, datetime, timedelta

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.usuario import Usuario
from app.repositories.usuario_repository import UsuarioRepository

_bearer = HTTPBearer(auto_error=False)


def hash_senha(senha: str) -> str:
    """Gera o hash bcrypt de uma senha em claro."""
    hashed = bcrypt.hashpw(senha.encode("utf-8"), bcrypt.gensalt())
    return hashed.decode("utf-8")


def verificar_senha(senha: str, senha_hash: str) -> bool:
    """Confere uma senha em claro contra o hash armazenado."""
    return bcrypt.checkpw(senha.encode("utf-8"), senha_hash.encode("utf-8"))


def criar_access_token(subject: str, expires_delta: timedelta | None = None) -> str:
    """Emite um JWT assinado com o subject (id do usuário) e expiração."""
    if expires_delta is None:
        expires_delta = timedelta(minutes=settings.access_token_expire_minutes)
    expire = datetime.now(UTC) + expires_delta
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, settings.auth_secret, algorithm=settings.algorithm)


def decodificar_token(token: str) -> str | None:
    """Retorna o subject do token, ou None se inválido/expirado."""
    try:
        payload = jwt.decode(
            token, settings.auth_secret, algorithms=[settings.algorithm]
        )
    except jwt.InvalidTokenError:
        return None
    sub = payload.get("sub")
    return sub if isinstance(sub, str) else None


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> Usuario:
    """Valida o Bearer token e retorna o usuário autenticado (401 caso contrário)."""
    nao_autorizado = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não autenticado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if creds is None:
        raise nao_autorizado
    sub = decodificar_token(creds.credentials)
    if sub is None:
        raise nao_autorizado
    usuario = UsuarioRepository(db).buscar_por_id(int(sub))
    if usuario is None:
        raise nao_autorizado
    return usuario
