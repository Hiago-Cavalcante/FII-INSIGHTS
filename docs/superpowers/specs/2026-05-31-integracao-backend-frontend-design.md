# Integração Backend ↔ Frontend — Design

> **Status:** aprovado em 2026-05-31
> **Autor:** Hiago Cavalcante Menezes
> **Contexto:** TCC FII-Insights. Sai-se do frontend em mock total para consumo real da API FastAPI.

---

## 1. Objetivo

Ligar o frontend (hoje 100% mock, calculando score no cliente) ao backend FastAPI já
pronto, tornando o **backend a fonte única do scoring**. O frontend passa a ser
consumidor puro via TanStack Query, mantendo busca/filtro/ordenação/paginação no
cliente sobre a lista completa (~50 FIIs).

## 2. Decisões consolidadas no brainstorm

1. **Fonte única do score = backend.** Elimina a divergência atual entre
   `scoring_service.py` (percentil para PL/cotistas, redistribuição genérica de nulos,
   unidades cruas) e `lib/scoring.ts` (faixas fixas, redistribuição só de vacância,
   unidades de display). O motor Python é o que a banca avalia.
2. **Formato da API:** `GET /ranking?perfil=<tipo>` para os 3 presets canônicos +
   `POST /ranking/simular` para pesos customizados. Backend é dono dos presets.
3. **Normalizar unidades no backend** (resposta em unidade de display; contrato
   OpenAPI autodescritivo). _A verificar:_ unidades reais gravadas pelo coletor/DB
   antes de fixar fatores de conversão.
4. **Deletar** `lib/scoring.ts`, `lib/scoring.test.ts` e `mocks/` — lógica de score só
   no backend.
5. **Perfil continua no Zustand+localStorage** (CLAUDE.md: suficiente). `GET/PUT /perfil`
   do backend fica como trabalho futuro, não é fiado nesta integração.

## 3. Fluxo de dados

```
perfilStore (Zustand) ──> tipo | pesosCustom
        │
        ├─ sem custom ─> GET  /ranking?perfil=<tipo>      ─┐
        └─ com custom ─> POST /ranking/simular {pesos}     ─┤
                                                            ▼
                          backend calcula sob demanda (não persiste)
                          → lista de ~50 FIIs c/ indicadores + score + classificação
                                                            │
            ┌───────────────────────────────────────────────┼───────────────┐
            ▼                                                ▼               ▼
   useRanking (tabela)                          useDashboard (deriva:     PerfilPage
   busca/filtro/sort/paginação                  média, distribuição,      preview Top 3
   no cliente                                   top 6 — client-side)      (mesmo endpoint)
```

Um único endpoint de ranking alimenta as três telas que dependem de score. O dashboard
**não** ganha endpoint próprio: deriva média, distribuição e top 6 da mesma query, com
os mesmos pesos ativos.

## 4. Backend

### 4.1 Refactor do ScoringService
- Extrair função pura `rankear(db, pesos) -> list[RankingItem]` que:
  - lê os indicadores mais recentes de todos os fundos,
  - pontua a **coorte inteira** (percentil de PL/cotistas exige os ~50),
  - devolve **em memória, sem gravar** no `scoring_historico`.
- O `executar()` atual (que persiste) segue servindo `POST /scoring/executar` e o script
  `rodar_scoring`. Reaproveita as funções de pontuação e `calcular_score_com_pesos` já
  existentes.

### 4.2 Presets de perfil no backend
Mover os 3 mapas de pesos (`conservador`/`moderado`/`arrojado`, conforme CLAUDE.md) para
constantes canônicas ao lado de `PESOS_DEFAULT`. `moderado` == `PESOS_DEFAULT`.

### 4.3 Endpoints
- `GET /api/v1/ranking?perfil=<tipo>` → resolve preset → `rankear`. `perfil` inválido → 422/400.
- `POST /api/v1/ranking/simular` body `{pesos: {...}}` → valida soma ≈ 1.0 (Pydantic) → `rankear`.
- Ambos retornam a mesma estrutura `RankingItemOut`:
  `ticker, nome, segmento, score, classificacao` **+ indicadores**
  `dy_atual, dy_12m, p_vp, vacancia_fisica, vacancia_financeira, liquidez_diaria,
  volatilidade_12m, patrimonio_liquido, num_cotistas`.
- Remover `busca/limit/offset` do `/ranking` (filtro/paginação agora client-side).

### 4.4 Correções de schema
- Adicionar `volatilidade_12m` ao `IndicadorOut` (`/fundos/{ticker}`).
- Adicionar `volatilidade_media` ao `ClusterItemOut` (a ClustersPage vai usar).

### 4.5 Normalização de unidades
Converter para unidade de display **uma vez**, na serialização da resposta:
- DY, vacância, volatilidade: fração → percentual (×100).
- Liquidez: R$ → milhões (÷1e6) _(a confirmar com o coletor)_.
- PL: R$ → bilhões; cotistas: bruto → milhares _(a confirmar)_.

Tarefa de planejamento: inspecionar `scripts/coletar_dados` e o DB para fixar os fatores
reais antes de implementar a conversão.

## 5. Frontend

### 5.1 Contrato de tipos
Gerar `src/types/api.ts` com `npx openapi-typescript http://localhost:8000/openapi.json`.
Sem tipos de API escritos à mão.

### 5.2 Camada de API
- `api/endpoints/ranking.ts`: `getRanking(perfil)`, `simularRanking(pesos)`.
- `api/endpoints/clusters.ts`: `getClusters()`.
- Usam o `apiClient` axios já existente.

### 5.3 Hooks
- `useRanking` e `useDashboard` trocam `FUNDOS_MOCK` por `useQuery`, com **queryKey pelos
  pesos ativos** (perfil ou pesos custom). Dashboard deriva média/distribuição/top6 da
  mesma query.
- Manter busca/filtro/sort/paginação no cliente (TanStack Table já faz).

### 5.4 Limpeza e tipos
- Deletar `lib/scoring.ts`, `lib/scoring.test.ts`, `mocks/`.
- Mover o type `PesosIndicadores` para `types/`, **alinhando as chaves às do backend**
  (`liquidez`→`liquidez_diaria`, `pl`→`patrimonio_liquido`, `cotistas`→`num_cotistas`,
  `volatilidade`→`volatilidade_12m`) para o `pesosCustom` ir direto no POST sem mapeamento.

### 5.5 Telas
- **RankingPage**: troca fonte de dados; colunas e interações permanecem.
- **DashboardPage**: deriva da query; remover `isLoading = false` fixo.
- **ClustersPage**: substituir `CLUSTERS_PLACEHOLDER` por `GET /clusters`; redesenhar card
  (dy_medio, p_vp_medio, num_fiis, tickers, volatilidade_media).
- **PerfilPage**: preview Top 3 e pesos custom via `POST /ranking/simular`.

### 5.6 Estados de loading/erro
Ligar `Skeleton` e `ErrorState` (já existem) nas 4 telas.

## 6. Fora de escopo (YAGNI)
- Sincronizar perfil com `GET/PUT /perfil` (trabalho futuro).
- Autenticação (decisão consolidada).

## 7. Estratégia de testes (TDD obrigatório)
- **Backend (pytest):** `rankear` não persiste, ordena por score desc, usa percentil sobre
  a coorte; endpoints (preset válido/inválido, validação de soma de pesos, presença dos
  indicadores na resposta, unidades de display).
- **Frontend (Vitest + Testing Library):** hook carrega ranking, troca de perfil refaz a
  query, estado de erro renderiza `ErrorState`.

## 8. Sequenciamento (fatias verticais)
1. Backend: `rankear` + `GET /ranking` + `POST /ranking/simular` + fixes de schema.
2. Front: type-gen + camada `api/` + `useRanking` → **RankingPage** ponta a ponta.
3. **DashboardPage** (deriva da mesma query).
4. **ClustersPage** (dados reais + redesign do card).
5. **PerfilPage** (preview via `/ranking/simular`) + limpeza (deletar scoring/mocks/tipos).

## 9. Riscos / pontos a verificar no plano
- Unidades reais gravadas pelo coletor (fixar fatores de conversão).
- Indicadores nulos no banco (memória: ~5/10 nulos) — garantir que a resposta e o front
  tratam `null` sem quebrar tabela/cards.
- `vacancia` pode estar 100% nula (foi removida da coleta) — confirmar comportamento da
  redistribuição e da exibição.
