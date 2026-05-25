# Sprint 03 — Coleta de Dados (Status Invest)

> **Projeto:** FII-Insights (TCC — Gestão da Informação / UFG)
> **Autor:** Hiago Cavalcante Menezes
> **Data:** 2026-05-23
> **Status:** Aprovado para implementação

---

## Objetivo da Sprint

Implementar o coletor de dados que busca os 10 indicadores financeiros dos 50 FIIs cadastrados no banco, usando o Status Invest como fonte primária via scraping HTML.

**Critério de conclusão (DoD):**
- `python -m scripts.coletar_dados` popula a tabela `indicadores` para os 50 FIIs com `data_referencia = hoje`
- `pytest tests/` passa inteiro (meta: ~40 testes)
- Nenhum campo fica `None` para FIIs de tijolo com página completa no Status Invest
- `ruff check .` e `mypy app/` limpos

---

## Decisões Técnicas

| Decisão | Alternativa descartada | Motivo |
|---|---|---|
| **Status Invest** como fonte primária | BRAPI (pago), Fundamentus (dados incompletos) | Gratuito, cobre todos os 10 indicadores do modelo de scoring |
| **Scraping por ticker** (50 requests) | Endpoint bulk | Status Invest não expõe API pública; página por ticker tem todos os campos |
| **Backup como stub** (`NotImplementedError`) | Scraping real de FundsExplorer | Prazo restritivo; stub documenta ponto de extensão para trabalho futuro |
| **`respx`** para mockar httpx nos testes | `unittest.mock` puro | API dedicada para mock de httpx, mais legível |
| **Upsert por `(fundo_id, data_referencia)`** | Sempre inserir | Evita duplicatas em re-execuções do script |

---

## Fonte de Dados: Status Invest

**URL por ticker:** `https://statusinvest.com.br/fundos-imobiliarios/{ticker}`

| Campo no banco | Localização no HTML | Fallback |
|---|---|---|
| `dy_atual` | DY do último mês | `None` |
| `dy_12m` | DY 12M | `None` |
| `p_vp` | P/VP | `None` |
| `vacancia_fisica` | Vacância física (seção propriedades) | `None` |
| `vacancia_financeira` | Vacância financeira | `None` |
| `liquidez_diaria` | Liquidez média diária (R$) | `None` |
| `volatilidade_12m` | Volatilidade 12M | `None` |
| `patrimonio_liquido` | Patrimônio líquido | `None` |
| `num_cotistas` | Número de cotistas | `None` |

> Vacância física/financeira é `None` para FIIs de papel e fundo de fundos — comportamento esperado e documentado.

---

## Arquitetura

```
backend/
├── app/
│   ├── utils/
│   │   ├── http_client.py              ← adicionar retry + delay (já existe)
│   │   └── parsers/
│   │       ├── __init__.py
│   │       ├── status_invest.py        ← parser principal (NOVO)
│   │       └── backup_scraper.py       ← stub com NotImplementedError (NOVO)
│   ├── services/
│   │   └── coleta_service.py           ← orquestrador (NOVO)
│   └── repositories/
│       └── indicador_repository.py     ← adicionar método upsert (MODIFICAR)
├── scripts/
│   └── coletar_dados.py                ← CLI entry point (NOVO)
└── tests/
    ├── fixtures/
    │   └── hglg11_page.html            ← snapshot HTML real (NOVO)
    ├── test_status_invest_parser.py    ← testes do parser (NOVO)
    └── test_coleta_service.py          ← testes do serviço (NOVO)
```

---

## Fluxo de Execução

```
coletar_dados.py
    └── ColetaService.coletar_todos()
            ├── busca lista dos 50 FIIs no banco (FundoRepository)
            ├── para cada ticker:
            │   ├── httpx GET statusinvest.com.br/fundos-imobiliarios/{ticker}
            │   │   └── retry: 3 tentativas, backoff 1s → 2s → 4s
            │   ├── delay 300ms entre requisições
            │   ├── StatusInvestParser.extrair(html) → dict[str, Any]
            │   └── IndicadorRepository.upsert(fundo_id, date.today(), **campos)
            └── retorna ColetaResultado(coletados=N, falhas=M, erros=[...])
```

---

## Tratamento de Erros

- **Falha de rede / timeout:** retry com backoff exponencial (1s, 2s, 4s). Após 3 tentativas, loga `WARNING` e continua para o próximo ticker. Nunca aborta a coleta inteira.
- **HTTP 429 / 503:** tratado igual a erro de rede no retry.
- **Campo ausente no HTML:** retorna `None` para o campo. O modelo de scoring trata nulos via redistribuição de pesos.
- **Ticker não encontrado no banco:** erro de programação — lança `ValueError`.

---

## Estratégia de Testes (TDD)

### `test_status_invest_parser.py`
- Testa extração de cada campo com HTML real salvo em `tests/fixtures/hglg11_page.html`
- Sem rede, sem mock — apenas parse de string HTML
- Testa caso de campo ausente → retorna `None`

### `test_coleta_service.py`
- Httpx mockado via `respx`
- Valida: dados salvos corretamente via upsert
- Valida: retry em respostas 429 e 503
- Valida: continuidade da coleta após falha de um ticker

### `test_indicador_repository.py` (adição)
- `test_upsert_cria_novo_indicador`
- `test_upsert_atualiza_indicador_existente_mesma_data`

---

## Backup Stub

```python
# app/utils/parsers/backup_scraper.py
class BackupScraper:
    def extrair(self, ticker: str) -> dict:
        # Trabalho futuro: scraping de FundsExplorer como fallback
        raise NotImplementedError(
            f"Scraping de backup não implementado para {ticker}. "
            "Ver docs/superpowers/specs/2026-05-23-sprint-03-coleta-dados-design.md"
        )
```

---

## Roadmap de Sprints (atualizado)

| Sprint | Foco | Status |
|---|---|---|
| 01 | Skeleton & configuração técnica | ✅ Concluída |
| 02 | Banco de dados: models + repositories + seed | ✅ Concluída (27 testes) |
| **03** | **Coleta de dados: Status Invest + retry + upsert** | ← você está aqui |
| 04 | Motor de scoring: faixas, fórmula, redistribuição de nulos | Pendente |
| 05 | Clustering K-Means: pipeline, cotovelo, silhouette | Pendente |
| 06 | API REST: endpoints FastAPI + testes de integração | Pendente |
| 07 | Frontend: páginas, componentes, tabela de ranking, gráficos | Pendente |
| 08 | Integração E2E, ajustes visuais, documentação TCC | Pendente |
