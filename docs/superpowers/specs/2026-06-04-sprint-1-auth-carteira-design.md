# Sprint 1 — Autenticação + M1 (Carteira manual) — Design

> **Spec de feature.** Fecha o brainstorm-gate da autenticação (RNF-02′, Addendum A2 de
> `docs/REQUISITOS.md`) e desenha o M1 (cadastro manual de carteira). Próximo passo após
> aprovação: `superpowers:writing-plans`.
>
> Autor: Hiago Cavalcante Menezes — TCC GI/UFG
> Data: 2026-06-04
> Fonte de requisitos: [`docs/REQUISITOS.md`](../../REQUISITOS.md) · Contrato: [`CLAUDE.md`](../../../CLAUDE.md)
> Roadmap: [`docs/superpowers/specs/2026-06-02-roadmap-sprints-v4-design.md`](2026-06-02-roadmap-sprints-v4-design.md) (S1)

---

## 1. Objetivo e requisitos cobertos

Introduzir **autenticação multiusuário de papel único** e o **cadastro manual de carteira**
com isolamento por dono (ownership), deixando o núcleo público (ranking, clusters, dashboard
de scoring, perfil) intacto.

| Requisito | Como é atendido |
|---|---|
| **RNF-02′** | Permissionamento: cada usuário só acessa a própria carteira (ownership FK + escopo por `current_user`). LGPD: senha com hash bcrypt; sem dado sensível além de e-mail. |
| **RF-01** | `POST /carteira/posicoes` com `ticker`, `quantidade`, `preco`. |
| **RF-04** | `GET /carteira/resumo`: posição consolidada (patrimônio investido). |
| **RF-05** | Preço médio ponderado recalculado a cada aporte. |
| **RF-08** (básico) | Resumo com quebra por classe FII × FIAGRO. |

## 2. Decisões do brainstorm (fechadas)

1. **Profundidade:** multiusuário, **papel único** — sem RBAC. Personas são todas PF; papéis seriam vaidade (YAGNI).
2. **Sessão:** **JWT no header `Authorization: Bearer`**. Encaixa no deploy cross-domain Vercel↔Render (CORS já com `allow_credentials`). Trade-off de XSS no storage do token documentado e aceito para o escopo do TCC.
3. **Ownership na S1:** apenas `posicoes`. O perfil segue client-side (`localStorage`); migra para o servidor numa tarefa futura pequena se necessário.
4. **Registro:** aberto (e-mail + senha), **sem verificação de e-mail** (e-mail é só identificador; sem infra de envio).
5. **Implementação:** **hand-rolled** com `PyJWT` + `bcrypt`. `fastapi-users` é async-first e brigaria com a sessão **síncrona** existente (`Session`/`get_db`); descartado.
6. **`AUTH_SECRET`:** default de dev no `config.py` (roda local/testes sem fricção) + **obrigatório no Render** (env `sync:false`, já previsto no `render.yaml`).

## 3. Modelo de dados

Schema gerenciado por SQLAlchemy 2.0 + Alembic; roda em Postgres (oficial) e SQLite (dev/testes).

### `usuarios` (nova)
- `id` — PK (Integer).
- `email` — `String`, **UNIQUE**, `nullable=False`, indexado. Identificador de login.
- `senha_hash` — `String`, `nullable=False`. Hash bcrypt (nunca a senha em claro).
- `created_at`, `updated_at` — `DateTime` com `server_default=func.now()` (e `onupdate` em updated_at).
- relationship `posicoes` → `list[Posicao]`, `cascade="all, delete-orphan"`.

### `posicoes` (nova)
- `id` — PK (Integer).
- `usuario_id` — FK → `usuarios.id`, `nullable=False`. **Ownership.**
- `fundo_id` — FK → `fundos.id`, `nullable=False`. Vincula ao catálogo (habilita scoring/proventos futuros).
- `quantidade` — `Integer`, `nullable=False`. Cotas (FII negocia cota inteira, inclusive no fracionário).
- `preco_medio` — `Numeric(12, 2)`, `nullable=False`.
- `valor_investido` — `Numeric(14, 2)`, `nullable=False`.
- `created_at`, `updated_at` — como acima.
- **`UniqueConstraint(usuario_id, fundo_id)`** — uma linha consolidada por fundo por usuário.

> **Dinheiro em `Numeric` + `Decimal`** no cálculo do preço médio — evita erro de ponto
> flutuante e é defensável no TCC. `quantidade` como `Integer` reflete a realidade de cotas de FII.

### Migração
Uma revisão Alembic única, `down_revision = 'b3a3c4fa69ba'` (head atual = `adiciona_classe_em_fundos`),
autogerada e **revisada** (manter apenas `create_table` de `usuarios` e `posicoes` + a unique
constraint; remover ruído de dialeto). Testar reversibilidade no SQLite local
(`upgrade head` → `downgrade -1` → `upgrade head`).

## 4. Backend — Autenticação

### Config (`app/config.py`) + `.env.example`
- `auth_secret: str` com **default de dev** (ex.: `"dev-insecure-change-me"`). Documentar no `.env.example`
  e nos comentários que **produção (Render) deve sobrescrever** via env `AUTH_SECRET` (`sync:false`).
- `algorithm: str = "HS256"`.
- `access_token_expire_minutes: int = 10080` (7 dias) — evita deslogar a banca durante a demo.

### `app/utils/security.py`
Funções puras, fáceis de cobrir com TDD:
- `hash_senha(senha: str) -> str` — `bcrypt.hashpw(senha.encode(), bcrypt.gensalt())`, retorna str.
- `verificar_senha(senha: str, senha_hash: str) -> bool` — `bcrypt.checkpw(...)`.
- `criar_access_token(subject: str, expires_delta: timedelta | None = None) -> str` — payload `{"sub": subject, "exp": ...}`, assinado com `auth_secret`/`algorithm`.
- `decodificar_token(token: str) -> str` — retorna o `sub`; levanta erro próprio (ou `None`) em token inválido/expirado.

### `app/models/usuario.py`
Model `Usuario` (ver §3). Registrar em `app/models/__init__.py`.

### `app/repositories/usuario_repository.py`
- `criar(email, senha_hash) -> Usuario`.
- `buscar_por_email(email) -> Usuario | None`.
- `buscar_por_id(id) -> Usuario | None`.

### `app/schemas/auth.py`
- `RegistroIn { email: EmailStr, senha: str (min_length) }`.
- `LoginIn { email: EmailStr, senha: str }`.
- `TokenOut { access_token: str, token_type: "bearer" }`.
- `UsuarioOut { id: int, email: str }` (`from_attributes=True`). **Nunca** expõe `senha_hash`.

### `app/routers/auth.py` (prefix `/api/v1/auth`)
- `POST /register` — cria usuário (e-mail único; senha → `hash_senha`). **Auto-login:** retorna `TokenOut`. `409` se e-mail já existe.
- `POST /login` — valida credenciais; retorna `TokenOut`. `401` **genérico** (`"Credenciais inválidas"`) tanto para e-mail desconhecido quanto senha errada (não vaza qual campo falhou). Loga a falha.
- `GET /me` — protegido; retorna `UsuarioOut` do `current_user`.

### Dependency `get_current_user`
Em `app/utils/security.py` ou `app/dependencies.py`: extrai o token (`OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")` ou `HTTPBearer`), decodifica, carrega o usuário via repositório. `401` se token ausente/inválido/expirado ou usuário inexistente.

### `app/main.py`
Incluir o router `auth` (prefix `/api/v1`).

## 5. Backend — Carteira / M1

### `app/models/posicao.py`
Model `Posicao` (ver §3) + relationship `usuario` e `fundo`. Registrar em `__init__.py`.

### `app/repositories/posicao_repository.py`
- `listar_por_usuario(usuario_id) -> list[Posicao]`.
- `buscar(id, usuario_id) -> Posicao | None` — **sempre filtra por `usuario_id`** (isolamento).
- `buscar_por_usuario_e_fundo(usuario_id, fundo_id) -> Posicao | None`.
- `criar(...)`, `atualizar(...)`, `remover(...)`.

### `app/services/carteira_service.py`
- **`registrar_aporte(usuario_id, ticker, quantidade, preco)`** — núcleo do RF-05:
  - resolve `fundo` por `ticker` (404 se fora do catálogo);
  - se já existe posição no fundo → recalcula **preço médio ponderado**:
    `pm_novo = (qtd·pm + qtd_aporte·preco) / (qtd + qtd_aporte)` (com `Decimal`),
    `qtd_nova = qtd + qtd_aporte`, `valor_investido = qtd_nova · pm_novo`;
  - senão cria a posição: `valor_investido = quantidade · preco`.
- **`resumo(usuario_id)`** — RF-04/08: total investido + agregado por `classe` (FII/FIAGRO).

### `app/schemas/carteira.py`
- `AporteIn { ticker: str, quantidade: int (gt=0), preco: Decimal (gt=0) }`.
- `PosicaoUpdate { quantidade: int (gt=0), preco_medio: Decimal (gt=0) }`.
- `PosicaoOut { id, ticker, nome, classe, quantidade, preco_medio, valor_investido }`.
- `ResumoCarteira { total_investido, por_classe: {FII, FIAGRO}, num_posicoes }`.

### `app/routers/carteira.py` (prefix `/api/v1/carteira`, todos com `Depends(get_current_user)`)
- `POST /posicoes` — `AporteIn` → registra/aporta. `404` se ticker fora do catálogo.
- `GET /posicoes` — lista do usuário.
- `GET /resumo` — posição consolidada.
- `PUT /posicoes/{id}` — corrige `quantidade`/`preco_medio`. `404` se não for do usuário.
- `DELETE /posicoes/{id}` — remove. `404` se não for do usuário.

**Isolamento:** todo acesso a posição filtra por `current_user.id`; recurso de outro dono → **`404`** (não `403`, para não vazar existência).

## 6. Frontend (mobile-first)

- **`stores/authStore.ts`** (Zustand + persist, chave `fii-auth`): `token`, `user`, `setAuth`, `logout`.
- **`api/client.ts`:** interceptor de request injeta `Authorization: Bearer <token>`; interceptor de response em `401` → `logout()` + redireciona `/login`.
- **`api/endpoints/auth.ts`:** `register`, `login`, `me`. **`api/endpoints/carteira.ts`:** CRUD + resumo. Hooks TanStack Query correspondentes.
- **Páginas:** `LoginPage`, `RegisterPage` (React Hook Form + Zod, validação de e-mail/senha, mobile-first); `CarteiraPage` (lista em cards mobile-first; form de aporte com **select de ticker do catálogo** + quantidade + preço; total investido + quebra FII/FIAGRO; editar/remover com confirmação).
- **`ProtectedRoute`:** sem token → `Navigate` para `/login`. Apenas `/carteira` protegida; `/`, `/ranking`, `/clusters`, `/perfil` seguem públicas.
- **`Header`:** quando autenticado, mostra e-mail + botão logout; senão, link "Entrar". `Navigation` ganha item "Carteira" (visível/handleado conforme auth).
- Regenerar `src/types/api.ts` do OpenAPI após a API estabilizar.

## 7. Tratamento de erros

| Código | Situação |
|---|---|
| `401` | Token ausente/inválido/expirado; credenciais de login inválidas (mensagem genérica). |
| `409` | E-mail já cadastrado no registro. |
| `404` | Posição inexistente ou de outro usuário; ticker fora do catálogo. |
| `422` | Validação Pydantic (back) / Zod (front). |

Falhas de auth são logadas (sem revelar qual campo do login falhou). Exceções de chamadas externas seguem o padrão try/except + log do projeto.

## 8. Estratégia de testes (TDD — RED → GREEN → REFACTOR)

**Backend (pytest, SQLite in-memory):**
- `security`: `hash`/`verify` (inclui senha errada); token válido, **expirado**, **adulterado**.
- `auth`: register ok / e-mail duplicado (409); login ok / senha errada (401) / e-mail desconhecido (401); `me` com token / sem token (401).
- `carteira`: criar nova posição; **aporte com média ponderada** (vários cenários numéricos — núcleo RF-05); lista escopada ao usuário; resumo (total + por classe FII/FIAGRO); editar; remover; **isolamento (usuário B não vê/edita/apaga posição de A → 404)**; ticker fora do catálogo (404); endpoints sem token → 401.
- Conftest: fixture que cria usuário + token e helper de cliente autenticado; setar `AUTH_SECRET` de teste.

**Frontend (Vitest + Testing Library):**
- `authStore` (set/logout/persist); interceptor anexa `Bearer`; `ProtectedRoute` redireciona sem token; form/lista da Carteira; fluxo de login feliz + erro.

## 9. Fora de escopo da S1 (YAGNI — registrado)

Sem RBAC/papéis · sem reset de senha · sem verificação de e-mail · sem refresh token (token único; re-login ao expirar) · sem migração do perfil para o servidor (segue `localStorage`) · sem valor de mercado/rentabilidade (depende de cotação atual → S2, RF-08 completo) · sem CSV B3 (RF-02 → S6 stretch) · sem proventos (S2) · sem evolução patrimonial histórica (RF-06 → S2).

## 10. Arquivos afetados (resumo)

**Backend — criados:** `app/utils/security.py`, `app/models/usuario.py`, `app/models/posicao.py`, `app/repositories/usuario_repository.py`, `app/repositories/posicao_repository.py`, `app/services/carteira_service.py`, `app/schemas/auth.py`, `app/schemas/carteira.py`, `app/routers/auth.py`, `app/routers/carteira.py`, `migrations/versions/<rev>_auth_e_posicoes.py`, e os testes correspondentes.

**Backend — modificados:** `pyproject.toml` (deps `bcrypt`, `pyjwt`), `app/config.py` (auth settings), `app/models/__init__.py`, `app/main.py` (routers), `.env.example` (`AUTH_SECRET`).

**Frontend — criados:** `stores/authStore.ts`, `api/endpoints/auth.ts`, `api/endpoints/carteira.ts`, hooks, `pages/LoginPage.tsx`, `pages/RegisterPage.tsx`, `pages/CarteiraPage.tsx`, `components/ProtectedRoute.tsx`, + testes.

**Frontend — modificados:** `api/client.ts` (interceptors), `App.tsx` (rotas), `components/layout/Header.tsx` + `Navigation.tsx`, `src/types/api.ts` (regerar).
