from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.utils.rate_limit import limiter
from app.routers import (
    assistente,
    auth,
    carteira,
    clustering,
    dashboard,
    fundos,
    perfil,
    ranking,
    scoring,
)

logging.basicConfig(level=getattr(logging, settings.log_level))

app = FastAPI(title="FII Insights API", version="1.0.0")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(fundos.router, prefix="/api/v1")
app.include_router(ranking.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(perfil.router, prefix="/api/v1")
app.include_router(scoring.router, prefix="/api/v1")
app.include_router(clustering.router, prefix="/api/v1")
app.include_router(carteira.router, prefix="/api/v1")
app.include_router(assistente.router, prefix="/api/v1")


@app.get("/health")
def health() -> dict[str, str]:
    """Verifica se a API está operacional."""
    return {"status": "ok"}
