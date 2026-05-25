from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings

app = FastAPI(
    title="FII-Insights API",
    description=(
        "API para análise e recomendação de Fundos de Investimento Imobiliário."
    ),
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["infra"])
async def health_check() -> dict[str, str]:
    """Verifica se a API está operacional."""
    return {"status": "ok"}
