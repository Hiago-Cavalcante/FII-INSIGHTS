# Backend Completo — Design Spec

**Data:** 2026-05-26
**Autor:** Hiago Cavalcante Menezes
**Status:** Aprovado

---

## Contexto

Os arquivos Python do backend foram perdidos entre sessões (apenas `__pycache__` permaneceu). O banco SQLite existe com schema completo e 50 fundos cadastrados, mas `indicadores`, `clusters` e `scoring_historico` estão vazios. O frontend já está implementado e aguarda a API.

**Objetivo desta spec:** Reconstruir o backend de ponta a ponta — infraestrutura, coleta de dados reais via Status Invest, motor de scoring multicritério e clustering K-Means — expondo uma API FastAPI que o frontend já existente consome.

---

## Arquitetura

```
fii-insights/backend/
├── app/
│   ├── main.py                    ← FastAPI app + CORS + routers
│   ├── config.py                  ← pydantic-settings (.env)
│   ├── database.py                ← SQLAlchemy engine + SessionLocal
│   ├── models/
│   │   ├── __init__.py            ← exporta todos os models para Alembic
│   │   ├── fundo.py
│   │   ├── indicador.py
│   │   ├── scoring.py
│   │   ├── cluster.py
│   │   └── perfil.py
│   ├── repositories/
│   │   ├── fundo_repository.py
│   │   └── indicador_repository.py   ← inclui método upsert
│   ├── services/
│   │   ├── coleta_service.py         ← Status Invest scraping
│   │   ├── scoring_service.py        ← motor de scoring multicritério
│   │   └── clustering_service.py     ← K-Means + StandardScaler
│   ├── routers/
│   │   ├── fundos.py
│   │   ├── ranking.py
│   │   ├── dashboard.py
│   │   ├── scoring.py
│   │   ├── clustering.py
│   │   └── perfil.py
│   └── utils/
│       ├── http_client.py            ← fetch_com_retry + criar_cliente_http
│       └── parsers/
│           ├── __init__.py
│           ├── status_invest.py      ← StatusInvestParser
│           └── backup_scraper.py     ← stub documentado
├── scripts/
│   ├── seed_fundos.py               ← já existe/executado
│   ├── coletar_dados.py
│   ├── rodar_scoring.py
│   └── rodar_clustering.py
└── tests/
    ├── conftest.py                  ← db_session fixture com SQLite em memória
    ├── fixtures/
    │   └── hglg11_page.html
    ├── test_models.py
    ├── test_fundo_repository.py
    ├── test_indicador_repository.py
    ├── test_http_client.py
    ├── test_status_invest_parser.py
    ├── test_coleta_service.py
    ├── test_scoring_service.py
    └── test_clustering_service.py
```

---

## Fluxo de dados

```
Status Invest (HTML)
    ↓ StatusInvestParser
    ↓ ColetaService (delay 300ms, retry 3x)
    ↓ IndicadorRepository.upsert
    ↓
indicadores (SQLite)
    ├── → ScoringService → scoring_historico
    └── → ClusteringService → clusters + fundo_clusters
                                        ↓
                              FastAPI routers
                                        ↓
                              Frontend React
```

---

## Sprint 01+02 — Infraestrutura (reconstrução)

Reconstrói os arquivos perdidos seguindo exatamente os planos existentes em:
- `docs/superpowers/plans/2026-05-21-sprint-01-skeleton.md`
- `docs/superpowers/plans/2026-05-22-sprint-02-database.md`

### Componentes

**`app/config.py`** — `Settings` via pydantic-settings com `DATABASE_URL`, `BRAPI_TOKEN`, `CORS_ORIGINS`, `LOG_LEVEL`.

**`app/database.py`** — `engine` + `SessionLocal` (context manager) + `Base` declarativa.

**`app/models/`** — 5 modelos SQLAlchemy 2.0 mapeando as tabelas do schema já criado:
- `Fundo`: id, ticker (UNIQUE), nome, segmento, gestora, data_ipo
- `Indicador`: id, fundo_id FK, data_referencia, dy_atual, dy_12m, p_vp, vacancia_fisica, vacancia_financeira, liquidez_diaria, volatilidade_12m, patrimonio_liquido, num_cotistas (todos nullable exceto fundo_id e data_referencia)
- `ScoringHistorico`: id, fundo_id FK, data_execucao, score (float), classificacao
- `Cluster`: id, nome_interpretado, perfil_risco, descricao, dy_medio, volatilidade_media, p_vp_medio, num_fiis
- `FundoCluster`: fundo_id FK, cluster_id FK, data_atribuicao
- `PerfilInvestidor`: id (UUID), tipo, pesos_personalizados (JSON), created_at, updated_at

**`app/repositories/`** — Pattern Repository com `Session` injetada. Sem lógica de negócio.

**`app/main.py`** — FastAPI com CORS configurado via `CORS_ORIGINS`. Monta todos os routers com prefixo `/api/v1`.

---

## Sprint 03 — Coleta de Dados (Status Invest)

Segue o plano existente em `docs/superpowers/plans/2026-05-23-sprint-03-coleta-dados.md`.

### StatusInvestParser
Extrai 9 indicadores do HTML via BeautifulSoup4 + lxml:
- `dy_atual`, `dy_12m`, `p_vp`, `vacancia_fisica`, `vacancia_financeira`
- `liquidez_diaria`, `patrimonio_liquido`, `num_cotistas`
- `volatilidade_12m` → **None** (não disponível no Status Invest, redistribuído no scoring)

Todos os campos são nullable. Parser nunca lança exceção — retorna None por campo ausente.

### ColetaService
- Itera todos os fundos do banco em ordem
- Delay de 300ms entre requests (evitar bloqueio)
- Retry exponencial: 1s, 2s, 4s (máx 3 tentativas) em status 5xx/429
- Sem retry em 400/403/404
- Falha de um ticker não interrompe os demais
- Retorna `ColetaResultado(coletados, falhas, erros)`

### Tratamento de nulos na coleta
Campos ausentes chegam como `None` no `upsert`. O scoring trata nulos com redistribuição de peso (ver Sprint 04).

---

## Sprint 04 — Motor de Scoring

### Modelo de scoring (10 indicadores)

| # | Indicador | Dimensão | Peso default |
|---|-----------|----------|--------------|
| 1 | DY atual | Rentabilidade | 20% |
| 2 | DY 12M | Rentabilidade | 10% |
| 3 | P/VP | Valuation | 15% |
| 4 | Vacância física | Risco | 10% |
| 5 | Vacância financeira | Risco | 10% |
| 6 | Liquidez diária | Risco | 10% |
| 7 | Volatilidade 12M | Risco | 10% |
| 8 | Patrimônio Líquido | Estrutura | 5% |
| 9 | Num cotistas | Estrutura | 5% |
| 10 | Segmento | Estrutura | 5% |

### Faixas de pontuação (1 a 5)

- **DY atual:** ≤6%=1, 6-8%=3, 8-10%=5, 10-12%=4, >12%=2
- **DY 12M:** mesmas faixas do DY atual (CLAUDE.md define o peso mas não as faixas; usando a mesma escala por coerência)
- **P/VP:** <0,80=5, 0,80-0,95=4, 0,95-1,05=3, 1,05-1,20=2, >1,20=1
- **Vacância (física e financeira):** <5%=5, 5-10%=4, 10-15%=3, 15-25%=2, >25%=1
- **Liquidez diária (R$):** <100k=1, 100-500k=2, 500k-1M=3, 1-5M=4, >5M=5
- **Volatilidade 12M:** <10%=5, 10-15%=4, 15-20%=3, 20-30%=2, >30%=1
- **Patrimônio Líquido:** percentil entre os 50 FIIs → faixa 1-5
- **Num cotistas:** percentil → faixa 1-5
- **Segmento:** Logística/Lajes=5, Shoppings=4, Híbrido=3, Papel=2, Outros=1

### Fórmula

```
Score(fundo) = Σ (peso_i × pontuação_i / 5) × 100
```

Resultado: float 0-100.

### Classificação

| Faixa | Classificação |
|-------|--------------|
| ≥ 80 | Excelente |
| 60-79 | Bom |
| 40-59 | Regular |
| < 40 | Evitar |

### Tratamento de nulos

Quando um indicador é `None`, seu peso é redistribuído proporcionalmente entre os demais indicadores **da mesma dimensão**. Se toda uma dimensão for nula, o peso total da dimensão é redistribuído entre as demais dimensões presentes proporcionalmente aos seus pesos originais.

Exemplo: `volatilidade_12m=None` → peso de 10% da dimensão Risco redistribuído entre vacância física, vacância financeira e liquidez diária (na proporção 10:10:10).

### API endpoints (Sprint 04)

- `POST /api/v1/scoring/executar` — executa scoring para todos os fundos com indicadores
- `GET /api/v1/ranking` — lista fundos ordenados por score desc, com paginação e filtro de busca por ticker

---

## Sprint 05 — K-Means Clustering

### Features do clustering

5 features padronizadas via `StandardScaler`:
1. `dy_12m`
2. `p_vp`
3. `vacancia_media` = média(vacancia_fisica, vacancia_financeira) quando ambas presentes
4. `log10(liquidez_diaria)` — log base 10 para reduzir assimetria (liquidez varia de ~100k a >100M)
5. `volatilidade_12m` — **None para todos os fundos** pois o Status Invest não expõe esse dado no HTML; será imputado com mediana calculada entre fundos que tiverem o dado (se nenhum tiver, a feature é removida do clustering)

Fundos com qualquer feature nula após imputação são excluídos do clustering apenas se a imputação não for possível.

**Imputação de nulos:** mediana da feature entre os 50 FIIs (não a média, para resistir a outliers). Isso garante que fundos com dados parciais ainda participem.

### Procedimento

1. Carregar indicadores mais recentes de todos os fundos
2. Imputar nulos com mediana por feature
3. Padronizar com `StandardScaler`
4. Calcular inércia e silhouette score para k = 2 a 8
5. Salvar gráficos cotovelo e silhouette em `data/figures/`
6. Treinar `KMeans(n_clusters=4, random_state=42, n_init=10)`
7. Interpretar clusters via heurísticas (ver abaixo)
8. Salvar em `clusters` e `fundo_clusters`

### Heurísticas de nomeação de clusters

Baseadas nos centróides após inverter a padronização:

| DY | Volatilidade | P/VP | Nome | Perfil |
|----|-------------|------|------|--------|
| Moderado | Baixa | ~1.0 | Tijolo Conservador | conservador |
| Moderado | Média | <1.0 | Tijolo Balanceado | moderado |
| Alto | Alta | qualquer | Papel Agressivo | arrojado |
| Misto | Média | misto | Híbrido Diversificado | moderado |

Nomes definitivos refletem os dados reais — heurísticas são ponto de partida.

### API endpoints (Sprint 05)

- `POST /api/v1/clustering/executar` — executa clustering
- `GET /api/v1/clusters` — lista clusters com fundos agrupados

---

## Sprint 06 — API para o Frontend

### Endpoints necessários

```
GET  /api/v1/fundos                → lista com score + cluster
GET  /api/v1/fundos/{ticker}       → detalhe completo
GET  /api/v1/dashboard/stats       → stats para charts (contagem por classificação, médias)
GET  /api/v1/perfil                → perfil do investidor
PUT  /api/v1/perfil                → atualizar perfil + pesos customizados
```

### Schema de resposta `/dashboard/stats`

```json
{
  "total_fundos": 50,
  "com_dados": 42,
  "score_medio": 61.3,
  "por_classificacao": {
    "Excelente": 5,
    "Bom": 18,
    "Regular": 14,
    "Evitar": 5
  },
  "dy_medio": 0.087,
  "p_vp_medio": 0.98
}
```

---

## Decisões técnicas

| Decisão | Justificativa |
|---------|--------------|
| Status Invest (scraping) | Sem necessidade de token; 50 FIIs é escala manejável |
| SQLite | Mono-usuário, sem concorrência, zero config |
| Imputação por mediana | Robustez a outliers; preserva máximo de fundos no clustering |
| K-Means k=4 fixo | Definido no CLAUDE.md; elbow/silhouette validam post-hoc |
| `random_state=42` | Reprodutibilidade para a defesa do TCC |
| TestClient FastAPI | Testa routers sem subir servidor |
| SQLite em memória nos testes | Isolamento total, sem poluir o banco de produção |

---

## Definição de pronto (DoD)

- [ ] `pytest tests/ -v` → 100% passing
- [ ] `ruff check . --fix` → limpo
- [ ] `mypy app/` → sem erros
- [ ] `python -m scripts.coletar_dados` → executa sem crash, ≥ 30 FIIs coletados
- [ ] `python -m scripts.rodar_scoring` → scoring_historico populado
- [ ] `python -m scripts.rodar_clustering` → clusters e fundo_clusters populados
- [ ] `uvicorn app.main:app` → API responde em `http://localhost:8000`
- [ ] `GET /api/v1/ranking` → retorna FIIs ordenados por score
- [ ] `GET /api/v1/dashboard/stats` → retorna stats para os charts
