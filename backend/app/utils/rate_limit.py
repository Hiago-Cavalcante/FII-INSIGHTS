from __future__ import annotations

from fastapi import Request
from slowapi import Limiter

from app.config import settings
from app.utils.security import decodificar_token


def ip_key_func(request: Request) -> str:
    """Chave de rate limit por IP real, ciente do proxy do Render.

    Atrás de um proxy, `request.client.host` é o IP do proxy (compartilhado por
    todos). O IP do cliente vem no primeiro hop de `X-Forwarded-For`.
    """
    xff = request.headers.get("X-Forwarded-For")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "anonimo"


def usuario_key_func(request: Request) -> str:
    """Chave de rate limit por usuário autenticado (sub do JWT).

    Evita que usuários distintos atrás do mesmo NAT dividam a cota. Sem token
    válido, cai no IP (ip_key_func).
    """
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        sub = decodificar_token(auth[len("Bearer ") :])
        if sub is not None:
            return f"user:{sub}"
    return ip_key_func(request)


limiter = Limiter(key_func=ip_key_func, enabled=settings.rate_limit_enabled)
