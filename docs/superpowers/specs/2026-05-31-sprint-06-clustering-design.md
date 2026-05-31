# Sprint 06 — Clustering K-Means (features, silhueta, nomeação) — Design Spec

> **Data:** 2026-05-31 · **Status:** Aprovado — implementação direta via TDD

## Problema
O `ClusteringService` usa as features `[dy_12m, p_vp, vacancia_media, log10(liquidez)]`, mas a **vacância foi dropada na Sprint 04** (não coletável de forma confiável). Como a vacância é constante (~0), após o `StandardScaler` ela vira coluna morta → o clustering usa efetivamente 3 features e a heurística `interpretar_cluster` (que depende de `vacancia_media`) **degenera** (3 de 4 clusters viram "Papel Agressivo"). Falta também a **análise de silhueta** (`silhouette.png`) exigida pelo CLAUDE.md.

## Decisões (brainstorming)
- **Features (4):** `[dy_12m, p_vp, log10(liquidez_diaria), volatilidade_12m]`. Cada uma uma dimensão distinta: retorno, valuation, liquidez/porte, risco de mercado. A volatilidade (47/50, agora disponível) substitui o papel da vacância como dimensão de risco.
- **Nomeação data-driven:** ranquear os 4 centróides por **volatilidade crescente** (desempate por DY) e atribuir por posição. Sempre 4 nomes distintos, sem limiares frágeis.
- **k = 4 mantido** (decisão do CLAUDE.md, 4 perfis interpretáveis); silhueta (k=2..8) vira figura de justificativa metodológica.

## Design

### `preparar_features(indicadores, fundos) -> (np.ndarray[n,4], list[int])`
- Candidatos: fundos com `dy_12m`, `p_vp`, `liquidez_diaria > 0` (obrigatórios).
- Feature de volatilidade: `volatilidade_12m`; se ausente, **imputa a mediana** dos presentes (mantém a cobertura ~50).
- Colunas: `[dy_12m, p_vp, log10(liquidez), volatilidade_12m]`.

### `nomear_clusters_por_risco(centroides) -> list[(nome, perfil)]`
- Entrada: lista de dicts por cluster com `dy_medio`, `p_vp_medio`, `log_liq_medio`, `volatilidade_media`.
- Ordena por `volatilidade_media` asc (desempate por `dy_medio` asc) e atribui pela posição:

| Rank | Nome | Perfil |
|---|---|---|
| 0 | Tijolo Conservador | conservador |
| 1 | Tijolo Balanceado | moderado |
| 2 | Híbrido Diversificado | moderado |
| 3 | Papel Agressivo | arrojado |

- Retorna a lista alinhada ao índice do cluster (k_idx → (nome, perfil)). Função pura, testável.
- Substitui `interpretar_cluster`.

### `calcular_silhuetas(X_scaled, ks=range(2,9)) -> dict[int, float]`
- `silhouette_score(X_scaled, KMeans(k).fit_predict(X_scaled))` para cada k. Função pura, testável.
- `_salvar_figuras` passa a gerar **`silhouette.png`** (silhouette médio × k, marcando k=4) além de `cotovelo.png` e `clusters_scatter.png`.

### `Cluster`
- Passa a **popular `volatilidade_media`** (hoje `None`) a partir do centróide.
- `descricao` cita DY / P/VP / volatilidade (não mais vacância).

## Testes (TDD)
- `preparar_features`: `X.shape[1] == 4`; coluna 3 = volatilidade (imputação da mediana quando ausente).
- `nomear_clusters_por_risco`: centróides sintéticos → nomes/perfis corretos por rank de volatilidade.
- `calcular_silhuetas`: dados sintéticos bem separados → dict com score por k (valores em [-1,1]).
- Integração: `executar()` cria 4 clusters com nomes distintos e `volatilidade_media` preenchida; `silhouette.png` é gerado.
- Atualizar testes existentes (`_criar_fundos_com_indicadores` passa a setar `volatilidade_12m`; remover/atualizar `test_interpretar_cluster`).

## Fora de escopo (YAGNI)
ClustersPage real (frontend) → Sprint 09. Back-test → Sprint 07. Nenhuma mudança em API/scoring.

## Critério de Pronto
`silhouette.png` gerado; 4 clusters com nomes **distintos** e `volatilidade_media` preenchida; `pytest`/`ruff`/`mypy` limpos; `rodar_clustering` executa e as 3 figuras existem.
