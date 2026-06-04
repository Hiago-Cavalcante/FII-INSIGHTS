from __future__ import annotations

from datetime import UTC, datetime, timedelta

import bcrypt
import jwt

from app.config import settings


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
