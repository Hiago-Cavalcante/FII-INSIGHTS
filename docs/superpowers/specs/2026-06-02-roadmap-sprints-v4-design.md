# Roadmap de Sprints — Implementação do Escopo v4.0

> **Spec de planejamento** (não de feature). Decompõe o delta da v4.0 (FIIs + FIAGROs,
> carteira, dividendos, assistente IA, auth, deploy) numa sequência de sprints rastreável.
> Cada sprint ganha, no seu início, seu próprio ciclo `brainstorm? → write-plan → execute → review`.
>
> Autor: Hiago Cavalcante Menezes — TCC GI/UFG
> Data: 2026-06-02
> Fonte de requisitos: [`docs/REQUISITOS.md`](../../REQUISITOS.md) · Contrato: [`CLAUDE.md`](../../../CLAUDE.md)

---

## 1. Contexto e restrições (parâmetros que moldaram o plano)

| Parâmetro | Valor | Implicação |
|---|---|---|
| **Prazo** | Defesa julho/2026 (firme) — hoje 02/06/2026 | ~6–8 semanas. Priorização brutal. |
| **Capacidade** | ~40h/semana (tempo integral) | Orçamento ~240–320h. 8 sprints de ~1 semana (40h) viáveis. |
| **Estratégia** | **Híbrida** | Fundação fina → fatias verticais de valor → de-risk dos diferenciais antes da sprint deles. |
| **Bar inegociável** | URL pública no ar + 2 diferenciais demonstráveis | IA explicável (lacuna 3) e FIAGRO (lacuna 5) **não** ficam para a última semana. |

**Princípios herdados do contrato (CLAUDE.md):** TDD obrigatório em lógica de negócio · mobile-first
(RNF-05) · scoring por classe coerente com o contrato OpenAPI · assistente IA ancorado em dados
calculados (sem alucinar) · rastreabilidade RF/RNF em commits (RNF-04) · YAGNI.

---

## 2. Gap analysis — estado atual × alvo v4.0

**Núcleo já pronto (✅):** coleta de indicadores (RF-11), scoring de 10 indicadores (RF-13),
ranking/screener (RF-15), clustering K-Means (RF-20), perfil com pesos personalizados + preview
via `/ranking/simular` (RF-44, base RF-25). Frontend (Ranking, Dashboard de scoring, Clusters,
Perfil) consumindo API real. Persistência ainda em **SQLite**.

| Eixo | Status | Delta para v4.0 |
|---|---|---|
| M1 — Carteira | ❌ | `posicoes`, cadastro manual (RF-01/04/05), CSV B3 (RF-02, *stretch*) |
| M2 — Patrimônio + Dividendos | ⚠️ parcial | `proventos` + coleta (RF-21/22/23), dashboard de patrimônio (o atual é de scoring) |
| M3 — Monitoramento | ⚠️ base pronta | `classe` no fundo + scoring FIAGRO (RF-14), comparador (RF-16), histórico (RF-17), ficha (RF-18), alertas (RF-34) |
| M4 — Simulador de renda | ❌ | depende de M1 + proventos (RF-24, RF-43) |
| M5 — IA + Rebalanceamento | ❌ | cliente LLM (RF-38–42), rebalanceamento (RF-27), preço-teto (RF-29) |
| Auth/permissionamento | ❌ | RNF-02′ — `usuarios` + ownership |
| Infra/Deploy | ❌ | Postgres/Neon (A1) + Vercel/Render — **exigência da banca** |

---

## 3. Decisões de planejamento

1. **Sprints de ~1 semana** (40h), 8 sprints ≈ 8 semanas; S7 é buffer explícito.
2. **Deploy contínuo:** cada sprint encerra com o que foi feito **no ar**. A URL pública evolui a
   cada sprint — não é tarefa de fim de projeto.
3. **De-risk dos diferenciais na S0:** as duas maiores incógnitas (cobertura de dados FIAGRO na
   BRAPI; provedor/custo de LLM) são resolvidas já na S0 via spike/brainstorm, em paralelo com a infra.
4. **4 itens com brainstorm-gate** (CLAUDE.md) caem assim: LLM → S0; auth → S1; FIAGRO → spike S0 +
   design S3; CSV B3 → S6 *se houver folga*.
5. **RF-02 (import CSV B3) = stretch, fora do caminho crítico.** O cadastro manual (RF-01) já
   desbloqueia M2 e M4. CSV B3 entra na S6 só se sobrar tempo; caso contrário, vira trabalho futuro.

---

## 4. O roadmap

### 🏗️ S0 — Fundação fina + de-risk dos diferenciais
**Meta:** app atual no ar publicamente + 2 incógnitas resolvidas.
- Migrar SQLite → **Postgres** local + **Neon**; Alembic apontando para Postgres (A1).
- Esqueleto de **deploy**: backend Render + frontend Vercel + DB Neon → **URL pública com o núcleo
  já existente**. Sem auth ainda — não há dado pessoal exposto nessa fase.
- Campo `classe` (FII/FIAGRO) no modelo `fundos` + migração.
- 🔬 **Spike FIAGRO** (paralelo): cobertura de dados de FIAGRO na BRAPI (RF-12) → define o desenho do scoring FIAGRO.
- 🔬 **Decisão LLM** (paralelo, brainstorm): provedor/custo (RF-38).

**Entregável:** núcleo atual com URL pública; relatório do spike FIAGRO; decisão de LLM registrada; `classe` no modelo.
**RF/RNF:** A1, RNF-05, base RF-12/RF-14/RF-38.

### 🔐 S1 — Auth + M1 (carteira manual)
- **Brainstorm dedicado:** profundidade da auth (RNF-02′) → spec curta → gate implementado.
- Model `posicoes` + endpoints + cadastro manual (RF-01/04/05) com ownership FK.
- Frontend: página **Carteira** mobile-first.

**Entregável:** usuário autentica e cadastra posições; patrimônio investido básico.
**RF/RNF:** RNF-02′, RF-01, RF-04, RF-05.

### 💰 S2 — M2 (patrimônio + dividendos)
- Model `proventos` + script de coleta de proventos na BRAPI (RF-21).
- Dashboard de **patrimônio**: posição consolidada, preço médio, rentabilidade por classe (RF-04/05/08).
- Histórico + calendário de proventos (RF-22) + projeção básica (RF-23).

**Entregável:** dashboard de patrimônio e dividendos real.
**RF/RNF:** RF-21, RF-22, RF-23, RF-04, RF-06, RF-08.

### 📊 S3 — M3 (scoring FIAGRO + comparador) — **diferencial 1**
- **Brainstorm scoring FIAGRO** (com dados do spike S0) → perfil de pesos por classe (RF-14).
- Scoring por classe no motor; ranking exibindo classe. Comparador lado a lado (RF-16) + ficha do fundo (RF-18).

**Entregável:** diferencial FIAGRO funcionando; comparador.
**RF/RNF:** RF-14, RF-12, RF-16, RF-17, RF-18.

### 🧮 S4 — M4 (simulador de renda)
- Perfil ampliado: objetivos + horizonte (RF-43).
- Simulador de renda mensal futura (RF-24) sobre posições + proventos projetados.
- Integração perfil + carteira na recomendação (RF-25/26 — Must).

**Entregável:** "quanto vou receber por mês".
**RF/RNF:** RF-24, RF-43, RF-25, RF-26.

### 🤖 S5 — M5 (assistente IA explicável) — **diferencial 2**
- Cliente LLM via backend (provider decidido na S0) (RF-38).
- Explicação ancorada no scoring determinístico; linguagem por perfil (RF-39/40); microconteúdo educativo (RF-42).

**Entregável:** diferencial IA explicável demonstrável.
**RF/RNF:** RF-38, RF-39, RF-40, RF-41, RF-42.

### ⚖️ S6 — Rebalanceamento + preço-teto + alertas + polish
- Rebalanceamento (RF-27), preço-teto (RF-29), alertas in-app (RF-34), watchlist (RF-35).
- CSV B3 (RF-02) **se houver folga**.
- Polish mobile-first, performance, correções.

**Entregável:** recomendações acionáveis + alertas; produto coeso.
**RF/RNF:** RF-27, RF-29, RF-34, RF-35, (RF-02 stretch).

### 🛟 S7 — Buffer / hardening / demo do TCC
- Absorve atrasos das sprints anteriores. Deploy final, ensaio da demo, screenshots, matriz de rastreabilidade (RNF-04).

---

## 5. Grafo de dependências (resumo)

```
S0 (Postgres + deploy + classe + spikes)
  ├─ LLM decidido ─────────────────────────────► S5 (IA)
  ├─ spike FIAGRO ──► S3 (brainstorm + scoring FIAGRO)
  └─ classe no modelo ─► S3
S1 (auth + posicoes) ──► S2, S4, S6  (tudo que toca dado pessoal/carteira)
S2 (proventos) ───────► S4 (simulador), M2 dividendos
```

Caminho crítico: **S0 → S1 → S2 → S4** (carteira → proventos → renda). Os diferenciais
(S3 FIAGRO, S5 IA) dependem só da S0, então têm folga de agendamento — se uma sprint de
caminho crítico atrasar, eles podem ser remanejados sem perder o de-risk.

---

## 6. Riscos e mitigação

| Risco | Impacto | Mitigação |
|---|---|---|
| Cobertura de dados FIAGRO insuficiente na BRAPI | Enfraquece diferencial 1 | Spike na S0; se faltar, scraping complementar ou scoring FIAGRO com subconjunto de indicadores documentado |
| Custo/limite do LLM | Bloqueia diferencial 2 | Decisão na S0 (free tier / chave própria); contrato de "explica, não inventa" limita nº de tokens |
| Atraso no caminho crítico (S0→S4) | Come o buffer | S7 é buffer; S3/S5 remanejáveis; CSV B3 já é stretch sacrificável |
| Migração Postgres com surpresas | Atrasa S0 | SQLite segue válido p/ dev local; migração via mesmo schema SQLAlchemy/Alembic |

---

## 7. Definition of Done por sprint

- ✅ Lógica de negócio nova coberta por testes (TDD: RED→GREEN→REFACTOR).
- ✅ `verification-before-completion`: testes rodados, endpoint respondendo, fluxo validado **no viewport mobile primeiro**.
- ✅ O que foi feito está **no ar** na URL pública.
- ✅ Commits citam os IDs `RF-NN`/`RNF-NN` (rastreabilidade RNF-04).
- ✅ Contrato OpenAPI regenerado no frontend quando a API mudar.

---

## 8. Itens explicitamente fora deste roadmap (trabalhos futuros)

Mantidos como "Trabalhos Futuros" do TCC (`docs/REQUISITOS.md §8`): RF-03, RF-07, RF-09, RF-10,
RF-28, RF-31, RF-32, RF-33, RF-36, RF-37. CSV B3 (RF-02) é *stretch* — vira trabalho futuro se não
couber na S6.
