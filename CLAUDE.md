# FII-Insights

> **TCC do Bacharelado em Gestão da Informação (UFG)** — Plataforma full-stack de **análise, gestão e recomendação personalizada de FIIs e FIAGROs** para o investidor pessoa física: scoring ponderado multicritério por classe de ativo, clustering K-Means, carteira/patrimônio, dividendos e um assistente de IA explicável.
>
> Autor: Hiago Cavalcante Menezes
> Repositório: github.com/[seu-usuario]/fii-insights
>
> 📋 **Requisitos rastreáveis (RF/RNF):** ver [`docs/REQUISITOS.md`](docs/REQUISITOS.md) — é a fonte única de requisitos e a base do capítulo de Requisitos do TCC. Sempre que este CLAUDE.md citar um `RF-NN`/`RNF-NN`, o detalhe completo (status, prioridade MoSCoW, rastreio ao PDF/persona) está lá.

---

## 🎯 Modo de operação com Superpowers ativo

Você é meu parceiro de desenvolvimento neste TCC e tem o plugin **Superpowers** (obra/superpowers) instalado e ativo.

**Confie no fluxo do Superpowers.** Skills se ativam automaticamente baseadas em contexto — não invente processos paralelos. Siga o workflow padrão:

`brainstorming` → `using-git-worktrees` → `writing-plans` → `subagent-driven-development` (ou `executing-plans`) → `test-driven-development` → `requesting-code-review` → `finishing-a-development-branch`

**Princípios não-negociáveis** (vêm do Superpowers, reforço aqui):
- **TDD obrigatório** — RED → GREEN → REFACTOR. Sem teste falhando antes, sem código depois.
- **YAGNI** — não construa o que ainda não precisa
- **DRY** — sem duplicação semântica de lógica
- **Evidência sobre claims** — verifique antes de declarar pronto (`verification-before-completion`)
- **Sistemático sobre ad-hoc** — debugging em 4 fases, não tentativa e erro

---

## ⚡ Comandos do Superpowers que vou usar

| Comando | Quando | O que faço |
|---|---|---|
| `/superpowers:brainstorm` | Antes de qualquer feature significativa | Refinar spec antes de codar |
| `/superpowers:write-plan` | Depois do brainstorm aprovado | Plano de implementação detalhado |
| `/superpowers:execute-plan` | Para executar plano com checkpoints | Implementação em batches |

**Início típico de uma sessão de feature:**
1. Eu peço a feature → você pode propor `/superpowers:brainstorm`
2. Brainstorm aprovado → `/superpowers:write-plan`
3. Plano aprovado → `/superpowers:execute-plan` ou subagent-driven-development

Para tarefas pequenas (uma função, um bug fix óbvio, refactor trivial), pule o brainstorm e vá direto. Use seu julgamento.

> ⚠️ **Features que exigem brainstorm obrigatório** (mudam contrato/arquitetura, não improvise): **permissionamento/autenticação** (RNF-02′ — profundidade indefinida), **assistente de IA / escolha de provedor de LLM** (RF-38), **scoring de FIAGRO** (RF-14, faixas dependem de dados reais) e **importação CSV da B3** (RF-02).

---

## 🧠 Skills do Superpowers e quando elas vão ativar neste projeto

O Superpowers carrega skills automaticamente quando o contexto bate. Estas são as ativações esperadas:

**`test-driven-development`** — ativa em **toda** implementação de lógica de negócio:
- Funções de scoring (faixas, fórmula, classificação) — incluindo o **scoring por classe** (FII × FIAGRO)
- Algoritmo de clustering (preparar features, métricas)
- Coletor de dados (parsing, retry, fallback) — indicadores **e proventos**
- Cálculo de carteira (preço médio, posição consolidada, rentabilidade por classe)
- Projeção de dividendos e simulador de renda mensal
- Cálculo de recomendações personalizadas e rebalanceamento
- Endpoints novos

**`systematic-debugging`** — ativa quando algo falha de modo não óbvio:
- Indicadores nulos quebrando o scoring
- K-Means produzindo clusters degenerados
- BRAPI retornando schemas inesperados / cobertura faltante de FIAGRO
- Parsing do CSV de movimentação da B3 com layout inesperado
- Resposta do LLM fora do contrato esperado
- Erros de CORS, hidratação React, etc.

**`verification-before-completion`** — ativa antes de você dizer "está pronto":
- Rode os testes, mostre resultado real
- Suba o servidor, confirme endpoint respondendo
- Abra o frontend, valide fluxo de ponta a ponta **no viewport mobile primeiro** (mobile-first, RNF-05)

**`brainstorming`** — ativa quando peço feature ambígua ou nova:
- "Qual a profundidade do permissionamento?" (RNF-02′)
- "Que provedor de LLM usar no assistente?" (RF-38)
- "Como modelar o scoring de FIAGRO?" (RF-14)
- "Como apresentar carteira e projeção de dividendos?"

**`writing-plans`** — ativa após design aprovado.

**`subagent-driven-development`** — ativa para tarefas grandes/paralelizáveis.

**`requesting-code-review`** — ativa entre tarefas do plano.

**`using-git-worktrees`** — ativa em features grandes (eu prefiro branches simples por enquanto; sinalize se achar que vale worktree).

Quando uma skill ativar, **diga explicitamente** qual está sendo seguida. Ex: *"ativando test-driven-development: vou começar pelo teste de classificar_faixa..."*.

---

## 🤖 Subagents — quando delegar

Considere disparar subagents (`dispatching-parallel-agents`) para:

- **Pesquisa técnica** comparando bibliotecas/abordagens (ex.: provedores de LLM, libs de auth)
- **Auditoria final** de uma sessão grande (code review)
- **Geração paralela** de testes para vários módulos
- **Documentação em lote** (docstrings, README, ARCHITECTURE.md)

Quando delegar, anuncie: *"vou disparar um subagent para X enquanto sigo com Y"*. Ao retornar, integre o resultado.

---

## 📋 Visão geral do projeto

Plataforma **full-stack mobile-first** para o investidor pessoa física que:

1. Coleta dados públicos de FIIs **e FIAGROs** (indicadores e proventos) via API BRAPI + scraping de backup
2. Aplica scoring ponderado multicritério **diferenciado por classe de ativo** (RF-13, RF-14)
3. Segmenta fundos via **clustering K-Means** (RF-20)
4. Gerencia a **carteira do usuário** (cadastro manual ou CSV B3), patrimônio e proventos (M1, M2)
5. Projeta dividendos e simula **renda mensal futura** (M4)
6. Gera **recomendações personalizadas** por perfil + carteira, incluindo rebalanceamento e preço-teto (M5)
7. Oferece um **assistente de IA explicável** que traduz o scoring determinístico em linguagem simples (RF-38–RF-42)
8. Apresenta tudo em uma interface web **mobile-first**

**Cinco pilares do produto:** Dados · Carteira · Perfil · IA · Educação.

**Diferencial central** (janela de mercado): IA conversacional **explicável** + cobertura especializada de **FIAGROs** — as duas maiores lacunas do mercado.

**Personas:** P1 Iniciante (foco principal) · P2 Analítico · P3 Guiado por Research · P4 Organizador Patrimonial · P5 Tático. Detalhe em `docs/REQUISITOS.md §3`.

---

## 🏛️ Decisões arquiteturais consolidadas

**Não reabra** sem motivo técnico forte:

| Decisão | Justificativa |
|---|---|
| **Monorepo** (backend/ + frontend/) | Contexto único; simplifica desenvolvimento solo |
| **PostgreSQL** (dev: SQLite opcional) | Migração consolidada (Addendum A1 do catálogo). Necessário p/ deploy público exigido pela banca e p/ permissionamento. Neon em produção; SQLite só conveniência local. |
| **Mobile-first** (RNF-05) | Investidor PF usa majoritariamente o celular. Layout projetado do menor breakpoint para cima. |
| **Autenticação + permissionamento** (RNF-02′) | Agora **em escopo** (reverte a decisão antiga "sem auth"). ⚠️ Profundidade pendente de brainstorm — não implementar sem spec. |
| **Deploy:** Frontend Vercel · Backend Render · DB Neon (Postgres) | Stack Python estoura limite serverless da Vercel (~307MB); backend vai p/ Render (runtime nativo, sem Docker). |
| **Assistente = LLM externo via backend** | LLM **consumido** por API (RF-38), não treinado. A regra "sem deep learning" continua valendo para o ML que EU construo (scoring, K-Means). |
| **Zustand + persist** | Client state. Perfil/preferências no localStorage. |
| **shadcn/ui** (não MUI/AntD) | Componentes copy-paste, customizáveis, modernos |
| **TanStack Query** (não SWR) | Padrão atual; melhor DX para dashboards |
| **scikit-learn** (não TensorFlow) | K-Means clássico basta para o ML próprio; deep learning é overkill |
| **FastAPI** (não Django/Flask) | Async nativo, OpenAPI auto, type hints |

> **Mudança vs. v3.0:** as decisões "SQLite (não Postgres)", "Sem Docker como dogma" e "Sem autenticação" foram **revisadas** — ver Addendum (A1, A2) em `docs/REQUISITOS.md §11`. SQLite segue válido só para rodar rápido localmente.

---

## 🛠️ Stack técnica

### Backend (Python 3.11+)

```
FastAPI + uvicorn          → API REST async
SQLAlchemy 2.0 + Alembic   → ORM + migrações
PostgreSQL (Neon em prod)  → banco oficial · psycopg/asyncpg como driver
  └ SQLite                 → conveniência de dev local (mesmo schema via SQLAlchemy)
Pydantic v2                → validação
pydantic-settings + dotenv → configuração via .env
httpx                      → cliente HTTP async (BRAPI + chamadas ao LLM)
BeautifulSoup4 + lxml      → scraping de backup
pandas + numpy             → manipulação de dados + parsing do CSV B3
scikit-learn               → K-Means, StandardScaler (ML próprio)
matplotlib                 → gráficos (cotovelo, silhouette, back-test)
structlog                  → logs estruturados
pytest + pytest-asyncio    → testes (TDD obrigatório)
ruff + ruff format + mypy  → qualidade de código (ruff format é o formatador oficial; black não é dependência)

# A definir em brainstorm (não adicionar sem spec):
#   LLM      → provedor/SDK do assistente (RF-38) — custo é o maior risco do novo escopo
#   Auth     → biblioteca de autenticação/permissionamento (RNF-02′)
```

### Frontend (Node 20+) — **mobile-first**

```
React 18 + TypeScript      → UI tipada estrita
Vite 5                     → bundler e dev server
Tailwind CSS 3             → utility-first, mobile-first (breakpoints do menor p/ o maior)
shadcn/ui                  → componentes (Radix + Tailwind)
React Router v6            → roteamento SPA
TanStack Query v5          → server state
Zustand + persist          → client state (preferências no localStorage)
axios                      → cliente HTTP
React Hook Form + Zod      → formulários tipados
TanStack Table v8          → tabela de ranking/screener (com layout responsivo)
Recharts                   → gráficos (patrimônio, dividendos, scoring)
lucide-react               → ícones
sonner                     → toasts
date-fns                   → datas em pt-BR
openapi-typescript         → gera tipos da API
ESLint + Prettier          → qualidade
Vitest + Testing Library   → testes
```

---

## 📊 Modelo de dados (PostgreSQL)

> Schema gerenciado por SQLAlchemy 2.0 + Alembic. Funciona em Postgres (oficial) e SQLite (dev). Campos pessoais ganham FK de propriedade quando o permissionamento (RNF-02′) for especificado.

### Tabelas de catálogo & análise

**`fundos`** — Cadastro dos fundos (FII **ou** FIAGRO)
- `id` PK
- `ticker` UNIQUE (ex: "XPLG11")
- `nome`, `segmento`, `gestora`, `data_ipo`
- **`classe`** ("FII" | "FIAGRO") — **novo (RF-14)**; dirige qual perfil de scoring aplicar
- `created_at`, `updated_at`

**`indicadores`** — Snapshot dos indicadores em uma data
- `id` PK, `fundo_id` FK → fundos, `data_referencia`
- `dy_atual`, `dy_12m`, `p_vp` — nullable
- `vacancia_fisica`, `vacancia_financeira` — nullable (não se aplicam a FIAGRO de papel)
- `liquidez_diaria`, `volatilidade_12m` — nullable
- `patrimonio_liquido`, `num_cotistas` — nullable
- **Indicadores de FIAGRO** (RF-12, *condicionado a dados*): `indexador`, `duration`, `inadimplencia`, `qualidade_credito` — nullable

**`proventos`** — Histórico de dividendos por fundo **(novo — RF-21/22/23)**
- `id` PK, `fundo_id` FK → fundos
- `data_com`, `data_pagamento`, `valor_por_cota`, `tipo` (rendimento/amortização)

**`scoring_historico`**
- `id` PK, `fundo_id` FK, `data_execucao`
- `score` (0-100)
- `classificacao` ("Excelente" | "Bom" | "Regular" | "Evitar")
- `classe_aplicada` ("FII" | "FIAGRO") — qual perfil de pesos foi usado

**`clusters`** / **`fundo_clusters`** — segmentação K-Means (inalterado)
- `clusters`: `id`, `nome_interpretado`, `perfil_risco`, `descricao`, `dy_medio`, `volatilidade_media`, `p_vp_medio`, `num_fiis`
- `fundo_clusters`: `fundo_id` FK, `cluster_id` FK, `data_atribuicao`

### Tabelas do usuário / carteira

**`usuarios`** — **novo**, base do permissionamento (RNF-02′)
- `id` PK, `email`/identificador, campos de auth — **schema final pendente de brainstorm**
- Tabelas pessoais abaixo ganham `usuario_id` FK quando a spec de auth fechar

**`posicoes`** — Carteira do usuário **(novo — RF-01/04/05)**
- `id` PK, `fundo_id` FK → fundos, (`usuario_id` FK quando houver auth)
- `quantidade`, `preco_medio`, `valor_investido`
- `created_at`, `updated_at`

**`perfis_investidor`** — Perfil ampliado **(RF-43)**
- `id` PK (UUID), `tipo` ("conservador" | "moderado" | "arrojado")
- `pesos_personalizados` JSON nullable (RF-44)
- **`objetivos`**, **`horizonte`** — **novos (RF-43)**
- `created_at`, `updated_at`

**`watchlist`** / **`alertas`** — **opcionais, simples (RF-34/35)**
- `watchlist`: `fundo_id` FK, (`usuario_id`)
- `alertas`: tipo (preço-teto/provento/mudança de score), parâmetros, computados no carregamento sobre o último snapshot (sem push/streaming)

---

## 🎯 Modelo de scoring (CRÍTICO — não alterar sem justificativa)

> A partir da v4.0 o scoring é **por classe de ativo** (RF-14). O modelo abaixo é o perfil **FII** (consolidado, núcleo do TCC). O perfil **FIAGRO** é um **refator a especificar** com dados reais — ver fim da seção.

### Perfil FII — os 10 indicadores e pesos

| # | Indicador | Dimensão | Peso |
|---|---|---|---|
| 1 | DY atual | Rentabilidade | **20%** |
| 2 | DY 12M | Rentabilidade | **10%** |
| 3 | P/VP | Valuation | **15%** |
| 4 | Vacância física | Risco | **10%** |
| 5 | Vacância financeira | Risco | **10%** |
| 6 | Liquidez diária | Risco | **10%** |
| 7 | Volatilidade 12M | Risco | **10%** |
| 8 | Patrimônio Líquido | Estrutura | **5%** |
| 9 | Num cotistas | Estrutura | **5%** |
| 10 | Segmento | Estrutura | **5%** |
| | | **TOTAL** | **100%** |

### Faixas de pontuação (1 a 5)

**DY atual:** ≤6%=1 · 6-8%=3 · 8-10%=5 · 10-12%=4 · >12%=2

**P/VP:** <0,80=5 · 0,80-0,95=4 · 0,95-1,05=3 · 1,05-1,20=2 · >1,20=1

**Vacância (física e financeira):** <5%=5 · 5-10%=4 · 10-15%=3 · 15-25%=2 · >25%=1

**Liquidez diária (R$):** <100k=1 · 100-500k=2 · 500k-1M=3 · 1-5M=4 · >5M=5

**Volatilidade 12M (FIIs de tijolo):** <10%=5 · 10-15%=4 · 15-20%=3 · 20-30%=2 · >30%=1

### Fórmula

```
Score(fundo) = Σ (peso_i × pontuação_i / 5) × 100
```

Resultado: float 0-100.

### Classificação

| Faixa | Classificação |
|---|---|
| ≥ 80 | Excelente |
| 60-79 | Bom |
| 40-59 | Regular |
| < 40 | Evitar |

### Tratamento de nulos

Quando um indicador é nulo, **redistribua o peso proporcionalmente** entre os indicadores presentes na mesma dimensão. Documente o caso de fundos sem dimensão Risco completa.

### Perfil FIAGRO (RF-14 — 🎯 a especificar com dados reais)

FIAGRO de papel **não tem vacância**; a dimensão Risco se reescreve em torno de **crédito, duration, indexador e inadimplência** (RF-12), quando houver dado na fonte. Antes de implementar:
- **Brainstorm obrigatório** para definir indicadores, pesos e faixas do perfil FIAGRO.
- O motor de scoring deve receber o **perfil de pesos por `classe`** (não uma tabela única). Mantenha a fórmula e o esquema de classificação; muda o conjunto de indicadores/pesos/faixas.
- **Risco a verificar primeiro:** cobertura de dados de FIAGRO na BRAPI (talvez exija fonte/scraping complementar). Isso define até onde dá para ir no diferencial.

---

## 🔬 Clustering K-Means

**Features (padronizadas com StandardScaler):**
- DY 12M
- P/VP
- Vacância média (média de física e financeira quando ambas existem)
- log(Liquidez diária)
- Volatilidade 12M

**Procedimento:**
1. Método do cotovelo (k = 2 a 8)
2. Silhouette score para cada k
3. Salvar gráficos em `backend/data/figures/cotovelo.png` e `silhouette.png`
4. Treinar K-Means com **k = 4**
5. Interpretar clusters via heurísticas

**Heurísticas de nomeação:**
- Baixa volatilidade + DY moderado → "Tijolo Conservador"
- Volatilidade média + DY médio → "Tijolo Balanceado"
- Alta volatilidade + alto DY → "Papel Agressivo"
- Características mistas → "Híbrido Diversificado"

(Nomes definitivos refletirão os dados reais. Continua sendo scikit-learn — sem deep learning.)

---

## 🤖 Assistente de IA explicável (RF-38–RF-42) — maior risco técnico novo

> Diferencial central do produto (lacuna 3). Trata-se de **explicar**, não de inventar análise.

**Contrato inviolável:**
- O assistente **explica** o scoring determinístico já calculado — valores, pesos, pontuações e classificações que o sistema produziu. **Não inventa** números nem análise nova (RNF-04, rastreabilidade).
- LLM é **externo, consumido via backend** por API. O frontend **nunca** chama o LLM diretamente.
- As respostas são **fundamentadas nos dados do sistema** (passados como contexto ao LLM): score, faixas, classificação, indicadores do fundo. Sem fonte calculada → não afirma.
- **Linguagem adaptada ao perfil** (RF-40): iniciante (P1) recebe explicação sem jargão; analítico recebe os números.
- Explica riscos em linguagem simples (RF-39): vacância, *duration*, liquidez.
- Microconteúdo de educação financeira por indicador (RF-42).

**Antes de implementar (brainstorm obrigatório):** definir **provedor e custo do LLM** (free tier? chave própria? local?) — é o maior risco de tempo/custo do novo escopo. Sem isso decidido, não escrever o cliente do assistente.

---

## 🗂️ Escopo do MVP (defesa julho/2026) — 5 módulos

| Módulo | Descrição | RF cobertos |
|---|---|---|
| **M1 — Cadastro/Importação de Carteira** | Entrada manual ou CSV B3; base de tudo | RF-01, RF-02, RF-04, RF-05 |
| **M2 — Dashboard de Patrimônio e Dividendos** | Posição atual, proventos recebidos e projeção | RF-04, RF-06, RF-08, RF-21, RF-22, RF-23 |
| **M3 — Monitoramento de FIIs e FIAGROs** | Indicadores, scoring por classe, comparador, ranking, alertas | RF-11–RF-20, RF-34 |
| **M4 — Simulador de Renda Mensal Futura** | "Quanto vou receber por mês?" | RF-24, RF-43 |
| **M5 — Assistente IA + Rebalanceamento** | Explicação em linguagem simples + ajustes iniciais | RF-38, RF-39, RF-40, RF-42, RF-27, RF-29 |

**Critério de corte do MVP:** entra o que (a) é barato dado o núcleo já existente (scoring/clustering), (b) ataca as lacunas 1–5 e 8, e (c) cabe no prazo de julho/2026 para um dev solo. **Trabalhos futuros** (RF-03, RF-07, RF-09, RF-10, RF-28, RF-31–33, RF-36, RF-37) estão registrados em `docs/REQUISITOS.md §8`.

---

## 🌐 Coleta de dados

- **Fonte primária:** API BRAPI (https://brapi.dev) — gratuita, requer token. Indicadores **e proventos**.
- **Backup:** scraping leve de FundsExplorer / Status Invest
- **Importação de carteira:** **CSV de movimentação da B3** (área do investidor) parseado com pandas (RF-02). Não há API pública simples de posições pessoais.
- **Amostra:** top FIIs **e FIAGROs** por liquidez diária (volume > R$ 100k/dia nos últimos 30 dias)
- **Frequência:** manual via scripts (agendável); alertas são computados no carregamento sobre o último snapshot (sem tempo real no MVP)
- **Rate limiting:** delay de 300ms entre requisições
- **Retry:** exponential backoff, máximo 3 tentativas
- ⚠️ **Cobertura de FIAGRO na BRAPI é um risco a verificar** antes de cravar RF-12/RF-14.

---

## 👥 Perfis do investidor

### Pesos default por perfil (perfil FII)

**Conservador** — prioriza consistência e baixo risco
- DY atual 10% · DY 12M 15% · P/VP 10%
- Vacâncias 15% cada · Liquidez 10% · Volatilidade 15%
- PL 5% · Cotistas 5% · Segmento 0%

**Moderado** — usa os pesos default deste CLAUDE.md (equilíbrio)

**Arrojado** — prioriza retorno e desconto
- DY atual 25% · DY 12M 5% · P/VP 20%
- Vacância física 10% · Financeira 5% · Liquidez 10% · Volatilidade 5%
- PL 5% · Cotistas 5% · Segmento 10%

Soma sempre = 100%. Validar no frontend com Zod.

### Perfil ampliado (RF-43)

Além do tipo de risco, o perfil agora guarda **objetivos** e **horizonte de tempo** — usados pela recomendação personalizada (RF-25/26) e pelo simulador de renda (M4).

---

## 📁 Estrutura de pastas

```
fii-insights/
├── README.md
├── CLAUDE.md
├── .gitignore
├── .env.example
├── docs/
│   ├── REQUISITOS.md          # catálogo RF/RNF (fonte única + capítulo do TCC)
│   └── sprint-01-acoes-tecnicas.md
│
├── backend/
│   ├── pyproject.toml
│   ├── alembic.ini
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models/            # + posicao, provento, usuario; fundo ganha `classe`
│   │   ├── schemas/
│   │   ├── routers/           # + carteira, proventos, simulador, assistente
│   │   ├── services/          # + scoring por classe, projeção dividendos, assistente IA
│   │   ├── repositories/
│   │   └── utils/
│   ├── migrations/
│   ├── scripts/
│   │   ├── coletar_dados.py
│   │   ├── coletar_proventos.py   # novo
│   │   ├── importar_carteira_b3.py# novo (CSV B3)
│   │   ├── rodar_scoring.py
│   │   ├── rodar_clustering.py
│   │   └── back_test.py
│   ├── data/
│   └── tests/
│
└── frontend/                  # mobile-first
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    ├── tailwind.config.ts
    ├── components.json
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── api/
        ├── components/        # ui/ · layout/ · charts/ · tables/
        ├── pages/             # + carteira · dividendos · simulador · assistente
        ├── hooks/
        ├── stores/
        ├── lib/
        └── types/
```

---

## 🔧 Variáveis de ambiente

`.env.example`:

```env
# Backend
DATABASE_URL=postgresql+psycopg://user:pass@host/db   # prod (Neon)
# DATABASE_URL=sqlite:///./data/fii_insights.db       # dev local opcional
BRAPI_TOKEN=seu_token_aqui
CORS_ORIGINS=http://localhost:5173,https://<app>.vercel.app
LOG_LEVEL=INFO

# A definir em brainstorm (placeholders — não usar sem spec):
# LLM_API_KEY=...        # provedor do assistente (RF-38)
# AUTH_SECRET=...        # permissionamento (RNF-02′)

# Frontend (em frontend/.env.local)
VITE_API_BASE_URL=http://localhost:8000
```

Token gratuito BRAPI: https://brapi.dev

---

## 📐 Convenções de código

### Python
- `snake_case` variáveis/funções, `PascalCase` classes
- **Type hints obrigatórias** em funções públicas
- **Docstrings Google-style**
- Imports organizados via `ruff`
- Comentários em **português**

### TypeScript
- `camelCase` variáveis/funções, `PascalCase` componentes/tipos
- **Strict mode** no tsconfig
- **Proibido `any`** — usar `unknown` + narrowing
- `.tsx` para componentes, `.ts` para lógica pura
- **Mobile-first:** estilize do menor breakpoint para cima; só adicione `sm:`/`md:`/`lg:` para telas maiores. Valide o layout no viewport mobile antes de declarar pronto.

### Git
- Conventional Commits **em português**, no imperativo
- Branches: `main` + `feature/*`
- **Cite os IDs de requisito** (`RF-NN`/`RNF-NN`) na mensagem quando o commit atender a um — sustenta a rastreabilidade (RNF-04). Ex.: `feat(carteira): cadastro manual de posições (RF-01)`

---

## ⚙️ Comandos úteis

### Backend (de `backend/`)
```bash
source .venv/bin/activate
uvicorn app.main:app --reload
alembic revision --autogenerate -m "mensagem"
alembic upgrade head
pytest -v
ruff check . --fix && ruff format .
mypy app/
python -m scripts.coletar_dados
python -m scripts.coletar_proventos
python -m scripts.importar_carteira_b3 <arquivo.csv>
python -m scripts.rodar_scoring
python -m scripts.rodar_clustering
python -m scripts.back_test
```

### Frontend (de `frontend/`)
```bash
npm install
npm run dev
npm run build
npm run lint
npx openapi-typescript http://localhost:8000/openapi.json -o src/types/api.ts
npx shadcn@latest add button card dialog
```

### Superpowers
```
/superpowers:brainstorm   → refinar design antes de codar
/superpowers:write-plan   → plano de implementação detalhado
/superpowers:execute-plan → executar plano em batches
```

---

## ❌ NÃO fazer

- ❌ Implementar permissionamento/autenticação **sem antes brainstormar a profundidade** (RNF-02′ está em escopo, mas o desenho não está definido)
- ❌ Implementar o assistente IA sem provedor/custo de LLM decididos (RF-38)
- ❌ Pular o ciclo RED-GREEN-REFACTOR do TDD
- ❌ Declarar "está pronto" sem `verification-before-completion`
- ❌ Usar Redux, MobX, Recoil (Zustand é suficiente)
- ❌ Usar styled-components, CSS Modules (somente Tailwind)
- ❌ Usar Material UI, Ant Design, Bootstrap (somente shadcn/ui)
- ❌ Treinar deep learning, LSTM, redes neurais — **scikit-learn é o limite para o ML que EU construo** (scoring, K-Means). Consumir um LLM por API (assistente) é permitido e não viola isso.
- ❌ Chamar o LLM ou a B3 **direto do frontend** — sempre via backend
- ❌ Criar dados sintéticos sem marcar explicitamente
- ❌ `any` em TypeScript
- ❌ Desenhar a UI desktop-first (o projeto é mobile-first — RNF-05)
- ❌ Commitar `.env`, `.db`, `__pycache__`, `.venv`, `node_modules`
- ❌ Silenciar exceções sem log
- ❌ Construir features especulativas (YAGNI) — siga o recorte do MVP (M1–M5)

## ✅ SEMPRE fazer

- ✅ TDD obrigatório em lógica de negócio (test-driven-development)
- ✅ Brainstorm antes de feature significativa (auth, LLM, scoring FIAGRO, CSV B3)
- ✅ Plano escrito antes de implementação grande
- ✅ Verificação real antes de declarar pronto — incluindo o **viewport mobile**
- ✅ Citar IDs `RF-NN`/`RNF-NN` em commits e PRs (rastreabilidade — RNF-04)
- ✅ Manter o scoring **por classe de ativo** (FII × FIAGRO) coerente com o contrato OpenAPI
- ✅ Garantir que respostas do assistente sejam **ancoradas em dados calculados** (sem alucinar análise)
- ✅ Type hints (Python) e tipagem estrita (TypeScript)
- ✅ Try/except + logging em chamadas externas (BRAPI, LLM, scraping)
- ✅ Docstrings em endpoints FastAPI
- ✅ Variáveis de ambiente para configs sensíveis
- ✅ Validar inputs com Pydantic (back) e Zod (front)
- ✅ Tratar indicadores nulos (FIIs/FIAGROs nem sempre têm todos os dados)
- ✅ Commits semânticos em português ao final
- ✅ Code review entre tarefas (`requesting-code-review`)

---

## 🎓 Contexto acadêmico (norte de decisões)

Este é um TCC. Implicações:

- **Banca avalia o documento** (TCC escrito) e o **sistema demonstrado** — e **exige URL pública** (deploy é requisito, não opcional)
- **Defesa em julho/2026** — prazo restritivo
- **Foco em:** análise quantitativa, IA aplicada, full-stack, **explicabilidade** e **cobertura de FIAGRO** (diferenciais)
- **NÃO foco em:** escalabilidade enterprise, observabilidade pesada, micro-otimizações
- **Trade-offs documentados** viram "trabalhos futuros" no TCC, não problemas
- **Rastreabilidade (RNF-04)** é parte da nota: requisitos (`docs/REQUISITOS.md`) ↔ commits ↔ texto do TCC

Pergunta de ouro em qualquer dúvida técnica: *"Isso ajuda o TCC ou é vaidade de engenharia?"*

Como sou eu (Hiago) sozinho desenvolvendo, **complexidade extra é dívida pessoal**, não investimento.

---

## 📚 Referências externas

- Catálogo de requisitos do projeto: [`docs/REQUISITOS.md`](docs/REQUISITOS.md)
- API BRAPI: https://brapi.dev/docs
- FastAPI: https://fastapi.tiangolo.com
- SQLAlchemy 2.0: https://docs.sqlalchemy.org/en/20/
- Neon (Postgres serverless): https://neon.tech/docs
- Render (deploy backend): https://render.com/docs
- Vercel (deploy frontend): https://vercel.com/docs
- shadcn/ui: https://ui.shadcn.com
- TanStack Query: https://tanstack.com/query/latest
- TanStack Table: https://tanstack.com/table/latest
- Superpowers: https://github.com/obra/superpowers
- Resolução CVM 175/2022 (regulamentação FIIs/FIAGROs)

---

## 🔄 Início de cada sessão

Quando eu abrir uma nova sessão Claude Code:

1. **Cumprimente e diga em uma linha o que entende do projeto** (mostra que leu o CLAUDE.md)
2. **Pergunte o que vou fazer hoje** (não assuma)
3. **Para a primeira tarefa significativa, proponha `/superpowers:brainstorm`** se a feature ainda não tem spec definido — em especial auth, LLM, scoring de FIAGRO
4. **Para tarefas com plano já claro**, vá direto via `/superpowers:write-plan` ou implementação direta
5. **Mantenha foco no escopo** — se eu pedir algo fora do CLAUDE.md / `docs/REQUISITOS.md`, questione antes de fazer; cite o ID do requisito quando houver

---

**Última atualização:** junho de 2026
**Versão do CLAUDE.md:** 4.0 — escopo ampliado (FIIs + FIAGROs, carteira, dividendos, assistente IA), alinhado ao Catálogo de Requisitos v1.0 (`docs/REQUISITOS.md`). Decisões revisadas vs. v3.0: Postgres consolidado, auth/permissionamento em escopo, mobile-first.
