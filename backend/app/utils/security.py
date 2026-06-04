from __future__ import annotations

import bcrypt


def hash_senha(senha: str) -> str:
    """Gera o hash bcrypt de uma senha em claro."""
    hashed = bcrypt.hashpw(senha.encode("utf-8"), bcrypt.gensalt())
    return hashed.decode("utf-8")


def verificar_senha(senha: str, senha_hash: str) -> bool:
    """Confere uma senha em claro contra o hash armazenado."""
    return bcrypt.checkpw(senha.encode("utf-8"), senha_hash.encode("utf-8"))
