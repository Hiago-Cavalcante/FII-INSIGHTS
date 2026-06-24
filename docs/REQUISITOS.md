# FII-Insights — Catálogo de Requisitos (v1.0)

> Consolidação do *benchmark* de FIIs/FIAGROs em requisitos rastreáveis.
> Serve de base única para o **CLAUDE.md v4.0** e para o **capítulo de Requisitos do TCC**.
>
> Autor: Hiago Cavalcante Menezes — Bacharelado em Gestão da Informação (UFG)
> Fonte: *Benchmark e Levantamento de Requisitos para Plataforma de FIIs e FIAGROs*
> Data: junho de 2026

---

## 1. Convenções

**Status do escopo**

| Marca | Significado |
|---|---|
| ✅ | Já existe (total ou parcial) no projeto atual |
| 🎯 | Entra no MVP (primeira versão / defesa de julho/2026) |
| 🔭 | Trabalho futuro (registrado, fora do MVP) |

**Prioridade (MoSCoW)** — `Must` · `Should` · `Could` · `Won't` (não no MVP)

**Rastreio** — referência à origem no PDF: `pág. N` e/ou persona `P1–P5`.
Personas: P1 Iniciante · P2 Analítico · P3 Guiado por Research · P4 Organizador Patrimonial · P5 Tático.

Cada requisito funcional recebe um ID `RF-NN`; cada não funcional, `RNF-NN`. Os IDs são estáveis e devem ser citados em commits, no CLAUDE.md e no texto do TCC.

---

## 2. Visão do produto (resumo)

**O produto.** Plataforma de análise, gestão e recomendação personalizada de FIIs **e FIAGROs** para o investidor pessoa física — acessível, inteligente e orientada a resultados.

**Proposta de valor.** Transformar dados complexos em orientação clara, explicável e alinhada ao perfil do investidor, combinando dados de mercado, carteira pessoal, IA e educação financeira aplicada.

**Diferencial central (e janela de mercado).** Não é "ter mais dados" — é (a) **IA conversacional explicável** e (b) **cobertura especializada de FIAGROs**, as duas maiores lacunas de maturidade do mercado (pág. 8).

**Cinco pilares** (pág. 16): Dados · Carteira · Perfil · IA · **Educação**.

---

## 3. Personas (camada de justificativa do TCC)

| ID | Persona | Necessidade-chave | Atendida no MVP? |
|---|---|---|---|
| P1 | Investidor Iniciante | Linguagem simples, explicação de indicadores, dividendos fáceis | **Sim** — foco principal (maior fatia e mais subatendida, pág. 9) |
| P2 | Investidor Analítico | Screener, comparador, histórico de rendimentos | Sim (parcial) |
| P3 | Guiado por Research | Carteiras recomendadas, preço-teto, rebalanceamento | Sim (parcial; research humano = futuro) |
| P4 | Organizador Patrimonial | Consolidação, evolução patrimonial, metas, relatórios | Parcial (consolidação múltipla e metas = futuro) |
| P5 | Investidor Tático | Tempo real, watchlists, fatos relevantes | Mínimo (tempo real = futuro) |

---

## 4. Lacunas de mercado endereçadas (pág. 14)

| # | Lacuna | Como o produto responde | Escopo |
|---|---|---|---|
| 1 | Baixa personalização das recomendações | Recomendação por perfil + carteira (RF-25, RF-26) | 🎯 |
| 2 | Pouca explicabilidade das decisões | Scoring transparente + IA explicadora (RF-38, RF-39) | 🎯 |
| 3 | Ausência de assistentes inteligentes | Assistente conversacional (RF-38) | 🎯 |
| 4 | Baixa integração perfil/carteira/oportunidade | Integração explícita (RF-26) | 🎯 |
| 5 | Limitação no tratamento de FIAGROs | Classe FIAGRO + scoring próprio (RF-12, RF-14) | 🎯 |
| 6 | Pouca análise preditiva de cenários | — | 🔭 |
| 7 | Pouca orientação a objetivos de longo prazo | Perfil com horizonte + metas (RF-43; metas RF-09) | 🎯 parcial |
| 8 | Baixa adaptação à linguagem do iniciante | Linguagem por perfil + educação (RF-40, RF-42) | 🎯 |

---

## 5. Requisitos Funcionais (RF)

### 5.1 Carteira & Patrimônio

| ID | Requisito | Status | Prioridade | Rastreio |
|---|---|---|---|---|
| RF-01 | Cadastro manual de carteira (ticker, quantidade, preço) | 🎯 | Must | pág. 7,17,19 · P4 |
| RF-02 | Importação de carteira via CSV de movimentação da B3 | 🎯 (stretch) | Should | pág. 17,19 · P4 |
| RF-03 | Integração automática/online com B3 ou corretoras | 🔭 | Won't | pág. 7 · P4 |
| RF-04 | Acompanhamento do patrimônio investido (posição consolidada) | 🎯 | Must | pág. 2,17 · P4 |
| RF-05 | Cálculo de preço médio por ativo | 🎯 | Must | pág. 17 |
| RF-06 | Evolução patrimonial histórica | 🎯 (básico) | Should | pág. 2,12,17 · P4 |
| RF-07 | Consolidação de múltiplas carteiras | 🔭 | Could | pág. 12 · P4 |
| RF-08 | Rentabilidade segregada por classe (FII × FIAGRO) | 🎯 (simples) | Should | pág. 12 · P4 |
| RF-09 | Definição e acompanhamento de metas | 🔭 | Could | pág. 12 · P4 · lacuna 7 |
| RF-10 | Relatórios gerenciais exportáveis (PDF/CSV) | 🔭 | Could | pág. 12 · P4 |

### 5.2 Dados, Indicadores & Análise

| ID | Requisito | Status | Prioridade | Rastreio |
|---|---|---|---|---|
| RF-11 | Coleta de indicadores fundamentalistas (DY, P/VP, vacância, liquidez, volatilidade, PL, cotistas) | ✅ | Must | pág. 7,10 |
| RF-12 | Indicadores próprios de FIAGRO (crédito, *duration*, indexador, inadimplência) | 🎯 *(condicionado a dados)* | Should | pág. 3,10 · lacuna 5 |
| RF-13 | Scoring multicritério ponderado (10 indicadores) | ✅ | Must | núcleo do projeto |
| RF-14 | Scoring diferenciado por classe de ativo (FII × FIAGRO) | 🎯 (refator) | Must | pág. 3,8 · lacuna 5 |
| RF-15 | Rankings e filtros avançados (*screener*) | ✅ | Must | pág. 7,10 · P2 |
| RF-16 | Comparador de ativos lado a lado | 🎯 | Should | pág. 7,10 · P2 |
| RF-17 | Histórico completo de rendimentos por fundo | 🎯 | Should | pág. 10 · P2 |
| RF-18 | Ficha/relatório de análise por fundo | 🎯 (básico) | Should | pág. 7,17 |
| RF-19 | Atualização frequente dos dados | 🎯 (coleta manual/agendável) | Should | pág. 10 · RNF-04 |
| RF-20 | Clustering K-Means / segmentação de fundos | ✅ | Should | núcleo do projeto |

### 5.3 Dividendos

| ID | Requisito | Status | Prioridade | Rastreio |
|---|---|---|---|---|
| RF-21 | Histórico de proventos por fundo | 🎯 | Must | pág. 2,7 |
| RF-22 | Calendário de pagamentos | 🎯 | Should | pág. 2 |
| RF-23 | Projeção/previsão de dividendos futuros | 🎯 | Must | pág. 2,7,19 |
| RF-24 | Simulador de renda mensal futura ("quanto vou receber por mês?") | 🎯 | Must | pág. 17,19 |

### 5.4 Inteligência, Recomendação & Oportunidade

| ID | Requisito | Status | Prioridade | Rastreio |
|---|---|---|---|---|
| RF-25 | Recomendação personalizada por perfil | ✅ base / 🎯 ampliar c/ carteira | Must | pág. 15 · lacuna 1 |
| RF-26 | Integração perfil + carteira + oportunidade | 🎯 | Must | pág. 15 · lacuna 4 |
| RF-27 | Recomendação de rebalanceamento | 🎯 | Should | pág. 11,17,19 · P3 |
| RF-28 | Sinais explícitos de compra/venda | 🔭 *(sensível — cuidado regulatório)* | Could | pág. 11 · P3 |
| RF-29 | Análise de preço-teto com metodologia transparente | 🎯 | Should | pág. 2,11 · P3 |
| RF-30 | Carteiras recomendadas (geradas pelo sistema) | 🎯 | Should | pág. 7,11 |
| RF-31 | Análise de cenário macroeconômico (Dados + Contexto) | 🔭 | Could | pág. 11,15 |
| RF-32 | Análise preditiva de cenários | 🔭 | Won't | lacuna 6 |
| RF-33 | Recomendações táticas rápidas | 🔭 | Could | pág. 13 · P5 |

### 5.5 Alertas & Mercado

| ID | Requisito | Status | Prioridade | Rastreio |
|---|---|---|---|---|
| RF-34 | Alertas personalizados (preço-teto atingido, provento anunciado, mudança de score) | 🎯 (in-app, no carregamento) | Should | pág. 2,7,17 · P1,P5 |
| RF-35 | Watchlists personalizadas | 🎯 (simples) | Could | pág. 13 · P5 |
| RF-36 | Cotações em tempo real | 🔭 *(MVP usa último snapshot)* | Won't | pág. 13 · P5 |
| RF-37 | Notícias e eventos / fatos relevantes (feed) | 🔭 | Could | pág. 13 · P5 |

### 5.6 IA, Explicabilidade & Educação

| ID | Requisito | Status | Prioridade | Rastreio |
|---|---|---|---|---|
| RF-38 | Assistente conversacional (LLM) ancorado nos dados do sistema | 🎯 | Must | pág. 8,17,19 · lacuna 3 |
| RF-39 | Explicação de riscos em linguagem simples (vacância, *duration*, liquidez) | 🎯 | Must | pág. 3,17 · P1 |
| RF-40 | Linguagem adaptada ao perfil (iniciante, sem jargão) | 🎯 | Should | pág. 9 · lacuna 8 · P1 |
| RF-41 | Relatórios personalizados (gerados por IA/sistema) | 🎯 (básico) | Should | pág. 17 |
| RF-42 | Conteúdo de educação financeira contextual (microconteúdo por indicador) | 🎯 | Should | pág. 7,16 · P1 |
| RF-45 | Tour guiado contextual de navegação e features (coach marks por tela/sub-feature, sob demanda) | 🎯 | Should | pág. 16 · lacuna 8 · P1 · estende RF-42 |

> **RF-38 é o maior risco técnico novo.** O assistente *explica* o scoring determinístico — não inventa análise. As respostas são fundamentadas nos valores, pesos e classificações já calculados pelo sistema (garante rastreabilidade — RNF-04). Definir provedor/custo de LLM antes de implementar.

### 5.7 Perfil do Investidor

| ID | Requisito | Status | Prioridade | Rastreio |
|---|---|---|---|---|
| RF-43 | Perfil ampliado: risco + objetivos + horizonte de tempo | 🎯 (expandir o atual) | Must | pág. 16 |
| RF-44 | Pesos personalizados por perfil | ✅ | Should | CLAUDE.md atual |

---

## 6. Requisitos Não Funcionais (RNF)

| ID | Requisito | Status | Observação |
|---|---|---|---|
| RNF-01 | Usabilidade & acessibilidade | 🎯 | Linguagem acessível, adaptada a diferentes níveis de conhecimento (pág. 18). Reforça P1. |
| RNF-02 | Segurança & privacidade (LGPD) | 🎯 | Dados ficam locais (SQLite, mono-usuário). Documentar postura LGPD. Auth/multiusuário = 🔭. **→ revisado no Addendum (A2): auth/permissionamento agora entra no escopo.** |
| RNF-03 | Disponibilidade & performance | 🎯 | Responsivo/mobile-friendly; integração confiável com fonte de dados (pág. 18). |
| RNF-04 | Transparência metodológica | 🎯 **(diferencial)** | Rastreabilidade das recomendações, critérios claros, atualização frequente. É o que sustenta a explicabilidade (RF-38/39). |

---

## 7. Escopo do MVP (recorte — pág. 19)

Os 5 módulos do MVP e os RF que cada um agrega:

| Módulo | Descrição | RF cobertos |
|---|---|---|
| **M1 — Cadastro/Importação de Carteira** | Entrada manual ou CSV B3; base de tudo | RF-01, RF-02, RF-04, RF-05 |
| **M2 — Dashboard de Patrimônio e Dividendos** | Posição atual, proventos recebidos e projeção | RF-04, RF-06, RF-08, RF-21, RF-22, RF-23 |
| **M3 — Monitoramento de FIIs e FIAGROs** | Indicadores, scoring por classe, comparador, ranking, alertas | RF-11–RF-20, RF-34 |
| **M4 — Simulador de Renda Mensal Futura** | "Quanto vou receber por mês?" | RF-24, RF-43 |
| **M5 — Assistente IA + Rebalanceamento** | Explicação em linguagem simples + ajustes iniciais | RF-38, RF-39, RF-40, RF-42, RF-27, RF-29 |

**Critério de corte:** entra no MVP o que (a) é barato dado o núcleo já existente (scoring/clustering), (b) ataca diretamente as lacunas 1–5 e 8, e (c) cabe no prazo de julho/2026 para um desenvolvedor solo.

---

## 8. Trabalhos futuros (registrados, fora do MVP)

Tudo do PDF que foi deliberadamente cortado — registrado para o capítulo "Trabalhos Futuros" do TCC:

- RF-03 Integração online com B3/corretoras
- RF-07 Consolidação de múltiplas carteiras
- RF-09 Metas (acompanhamento)
- RF-10 Relatórios gerenciais exportáveis
- RF-28 Sinais de compra/venda (atenção regulatória — CVM)
- RF-31 Cenário macroeconômico
- RF-32 Análise preditiva de cenários
- RF-33 Recomendações táticas rápidas
- RF-36 Cotações em tempo real
- RF-37 Feed de notícias e fatos relevantes
- ~~Autenticação e suporte multiusuário (decorrência do RNF-02)~~ → **movido para escopo no Addendum (A2)**

---

## 9. Decisões e impactos técnicos (insumo para o CLAUDE.md v4.0)

Mudanças que o novo escopo impõe sobre o projeto atual:

1. **Classe de ativo no modelo.** `fundos` ganha `classe` (`FII` | `FIAGRO`) + campos específicos de FIAGRO. O motor de scoring deixa de ter uma tabela única de pesos e passa a ter **perfis de peso por classe** (RF-14). Vacância não se aplica a FIAGRO de papel; usar critérios de crédito/duration/indexador onde houver dado.

2. **Novas tabelas.** `posicoes` (carteira do usuário), `proventos` (histórico de dividendos por fundo/data); expandir `perfis_investidor` com `objetivos` e `horizonte`; opcional `alertas` e `watchlist`.

3. **Assistente = LLM externo via backend.** Revisar a regra atual *"scikit-learn é o limite / sem deep learning"*: ela continua valendo para o **ML que eu construo** (scoring, K-Means); o assistente **consome** um LLM por API — não treina rede. Mantém-se a regra *"sem chamadas externas no frontend"* (LLM e B3 entram pelo backend).

4. **Importação B3 = CSV de movimentação.** Não há API pública simples de posições pessoais; o caminho realista é o arquivo de movimentação da área do investidor (pandas já está no stack).

5. **"Tempo real" e alertas = sobre o último snapshot.** No MVP, alertas são computados no carregamento sobre os dados já coletados; sem push/streaming.

6. **Auth permanece mono-usuário.** Decisão consolidada mantida; LGPD documentada (dados locais); multiusuário/auth → trabalhos futuros. **→ revisado no Addendum (A2).**

### Riscos a verificar antes de cravar a build

- **Cobertura de dados de FIAGRO** na BRAPI (e necessidade de fonte/scraping complementar). Define quão fundo dá pra ir no diferencial RF-12/RF-14.
- **Provedor e custo do LLM** do RF-38 (free tier? chave própria? local?). É o maior risco de tempo/custo do novo escopo.

---

## 10. Rastreabilidade

Cada RF/RNF acima traz, na coluna *Rastreio*, a página do PDF e/ou a persona de origem — atendendo ao requisito de rastreabilidade da própria solução (RNF-04) e servindo de matriz de rastreabilidade no capítulo de Requisitos do TCC. Nenhum item do PDF ficou sem registro: o que não entrou no MVP está na seção 8.

---

## 11. Addendum — Revisões pós-v1.0 (junho/2026)

> Decisões tomadas **depois** da consolidação do catálogo v1.0, que **substituem** as linhas correspondentes acima. Mantidas aqui (em vez de editar o corpo) para preservar a rastreabilidade histórica do artefato no TCC. As seções 2, 6, 8 e 9 acima trazem ponteiros para este addendum.

| ID | Revisão | Motivação | Afeta |
|---|---|---|---|
| **A1** | **Banco de dados: migração para PostgreSQL consolidada.** SQLite deixa de ser o banco oficial; passa a ser apenas conveniência de desenvolvimento local. PostgreSQL (Neon em produção) é o banco de referência. | (a) A banca exige URL pública / deploy do sistema; (b) a lógica de permissionamento (A2) pressupõe modelo relacional multiusuário. | Seção 9.2; decisões arquiteturais do CLAUDE.md |
| **A2** | **Autenticação e permissionamento: de 🔭 para 🎯.** O RNF-02 e a seção 8 tratavam auth/multiusuário como trabalho futuro. Passa a integrar o escopo. | Necessidade explícita de lógica de permissionamento + deploy público. | RNF-02; seção 8; seção 9.6 |
| **A3** | **Mobile-first vira RNF-05.** Eleva o "responsivo/mobile-friendly" do RNF-03 para projeto **mobile-first** (layout pensado a partir do menor breakpoint para cima). | Perfil de uso predominante do investidor PF é mobile. | RNF-03 (reforça); novo RNF-05 |

**A profundidade do permissionamento (A2) ainda NÃO está definida** — login único (gate mono-usuário) vs. multiusuário com RBAC, provider/biblioteca, fluxo de sessão. Isso deve passar por um brainstorm dedicado (`/superpowers:brainstorm`) **antes** de qualquer implementação. Até lá, o modelo de dados prevê a tabela `usuarios` e FKs de propriedade (ownership) nas tabelas pessoais (`posicoes`, `perfis_investidor`, `watchlist`, `alertas`), mas o fluxo de autenticação fica pendente de spec.

### RNF revisado / novo

| ID | Requisito | Status | Observação |
|---|---|---|---|
| RNF-02′ | Segurança, privacidade (LGPD) **e permissionamento** | 🎯 | Auth/permissionamento entra no escopo (A2). Profundidade a definir em brainstorm. LGPD segue documentada. |
| RNF-05 | Mobile-first | 🎯 | Layout responsivo projetado mobile-first; testar nos breakpoints menores primeiro (A3). |
