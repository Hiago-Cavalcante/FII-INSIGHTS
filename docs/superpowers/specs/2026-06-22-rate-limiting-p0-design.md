# Spec — P0 Rate Limiting + ajuste de deploy

> **Status:** aprovado (brainstorm 2026-06-22) · pronto para `writing-plans`.
> **Autor:** Hiago (com Claude Code)
> **Relacionado:** [`alpha-seguranca-pwa.md`](../../alpha-seguranca-pwa.md) (P0 #3 e #4), `REQUISITOS.md` — RNF-02′ (auth/permissionamento), RF-38 (assistente IA), RNF-04 (rastreabilidade).

Fecha os dois últimos bloqueadores **P0** da virada MVP→alpha: rate limiting anti-abuso em `/auth/*` (brute-force) e no `/assistente/explicar` (custo Gemini), além de declarar no `render.yaml` as variáveis que hoje impedem o boot em produção.

P0 #1 (`AUTH_SECRET` obrigatório, `eee98e3`) e P0 #2 (perfil escopado por dono, `871b06c`) **já estão concluídos** na `main`.

---

## 1. Objetivo e escopo

**Em escopo:**
1. Rate limiting com `slowapi` (storage in-memory) em `/auth/login`, `/auth/register` e `/assistente/explicar`.
2. Resposta **429** padronizada com `Retry-After`.
3. Ajuste do `render.yaml` para declarar `ENVIRONMENT`, `AUTH_SECRET`, `GEMINI_API_KEY`, `GEMINI_MODEL`.

**Fora de escopo (P1/futuro):** storage persistente de limites (Postgres/Redis), verificação de e-mail, reset/refresh de senha, security headers/CSP, LGPD.

---

## 2. Biblioteca e infraestrutura

- Nova dependência em `backend/pyproject.toml`: `slowapi>=0.1.9,<0.2` (compatível com FastAPI 0.115 / Starlette).
- Um único `Limiter` global em `app/utils/rate_limit.py`.
- Registro em `main.py`: `app.state.limiter = limiter` + `app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)`.
- Storage **in-memory** (default do slowapi). Sem Redis, sem tabela nova.

---

## 3. Limites definidos

| Endpoint | Limite | Chave | Justificativa |
|---|---|---|---|
| `/auth/login` | **10/min** | IP | Freia brute-force; folgado para humano |
| `/auth/register` | **5/hora** | IP | Cadastro é raro; barra criação em massa |
| `/assistente/explicar` | **5/min + 20/dia** | usuário (JWT `sub`) | Rajada + cota de custo Gemini |

---

## 4. Detalhes de correção (não óbvios)

### 4.1 IP real atrás do proxy do Render
O `get_remote_address` padrão lê `request.client.host` — atrás do Render isso é o **proxy**, fazendo todos os usuários compartilharem um único IP. Solução: `ip_key_func` que lê o **primeiro hop de `X-Forwarded-For`** (`xff.split(",")[0].strip()`), com fallback para `request.client.host` (dev local, sem proxy).

### 4.2 Cota do assistente por usuário, não por IP
O `key_func` do slowapi recebe apenas o `Request`. Para chavear por usuário criamos `usuario_key_func` que **decodifica o `sub` do Bearer token** (apenas `jwt.decode` com o mesmo `auth_secret`/algoritmo já usados em `utils/security.py`, **sem** consulta ao banco). Fallback para `ip_key_func` se não houver token válido. Assim dois usuários atrás do mesmo NAT não dividem a cota de 20/dia.

### 4.3 Assinaturas dos endpoints
`login`, `register` e `explicar` ganham `request: Request` no início da assinatura (exigência do slowapi). **Não altera o schema OpenAPI público** (FastAPI injeta o `Request`, não vira campo de body/query).

---

## 5. Testabilidade (TDD)

- Flag `rate_limit_enabled: bool = True` em `config.py`. O `Limiter` é criado com `enabled=settings.rate_limit_enabled`.
- O `conftest.py` da suíte existente roda com a flag **desligada** (env `RATE_LIMIT_ENABLED=false`) para que os 203 testes atuais não tropecem nos limites.
- Testes dedicados (RED→GREEN) ligam a flag e afirmam:
  - 11ª chamada consecutiva a `/auth/login` (mesmo IP) → **429**.
  - 6ª chamada/min e 21ª chamada/dia ao `/assistente/explicar` (mesmo usuário) → **429**.
  - Usuários distintos (tokens distintos) **não** compartilham a cota.
  - `X-Forwarded-For` distintos → contados separadamente.
- Reset do estado do limiter entre testes via fixture (`limiter.reset()` ou storage novo por teste) para evitar vazamento de contagem.

---

## 6. Ajuste de deploy

`render.yaml` — adicionar às `envVars` do serviço:

```yaml
- key: ENVIRONMENT
  value: production
- key: AUTH_SECRET
  sync: false        # gerar: python -c "import secrets; print(secrets.token_urlsafe(64))"
- key: GEMINI_API_KEY
  sync: false
- key: GEMINI_MODEL
  value: gemini-2.5-flash
```

`.env.example` já documenta essas variáveis (nada a mudar).

---

## 7. Limitação conhecida (trabalho futuro)

A cota diária (20/dia) usa storage **in-memory**; como o Render free **hiberna após ~15 min ocioso**, o contador **reseta na reinicialização** — é *best-effort*. Os freios reais de abuso são o **limite por minuto** e o **teto diário do próprio free tier do Gemini** (projeto compartilhado, $0). Migrar para storage persistente (Postgres/Redis) é P1/trabalho futuro e está registrado em `alpha-seguranca-pwa.md`.

---

## 8. Arquivos afetados (estimativa)

- `backend/pyproject.toml` — dependência `slowapi`.
- `backend/app/utils/rate_limit.py` — **novo**: `Limiter`, `ip_key_func`, `usuario_key_func`.
- `backend/app/main.py` — registra limiter + exception handler.
- `backend/app/config.py` — flag `rate_limit_enabled`.
- `backend/app/routers/auth.py` — decorators de limite + `request: Request`.
- `backend/app/routers/assistente.py` — decorators de limite + `request: Request`.
- `backend/tests/conftest.py` — desligar limiter por default.
- `backend/tests/test_rate_limit.py` — **novo**: testes dedicados.
- `render.yaml` — envVars de produção.
