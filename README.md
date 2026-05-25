# FII-Insights

Sistema de análise e recomendação de Fundos de Investimento Imobiliário (FIIs)
com scoring multicritério e clustering K-Means.

> TCC — Bacharelado em Gestão da Informação (UFG)
> Autor: Hiago Cavalcante Menezes

## Pré-requisitos

- Python 3.11+
- Node 20+
- Token BRAPI gratuito: https://brapi.dev

## Configuração inicial

```bash
git clone <url-do-repositorio>
cd fii-insights
```

## Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
cp ../.env.example .env          # edite BRAPI_TOKEN (obtenha em https://brapi.dev)
alembic upgrade head             # requer backend/migrations/ — criado na configuração inicial
uvicorn app.main:app --reload
```

API disponível em http://localhost:8000 | Swagger UI: http://localhost:8000/docs

## Frontend

```bash
cd frontend
npm install
cp ../.env.example .env.local    # ajuste VITE_API_BASE_URL se necessário
npm run dev
```

Frontend disponível em http://localhost:5173

## Testes

```bash
cd backend && pytest -v
cd frontend && npm run test
```

## Scripts de dados

```bash
cd backend
source .venv/bin/activate
python -m scripts.coletar_dados      # coleta top 50 FIIs via BRAPI
python -m scripts.rodar_scoring      # executa motor de scoring
python -m scripts.rodar_clustering   # executa K-Means
```
