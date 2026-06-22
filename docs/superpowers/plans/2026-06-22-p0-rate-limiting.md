# P0 Rate Limiting + Ajuste de Deploy — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar os P0 #3 e #4 da virada alpha — rate limiting anti-abuso em `/auth/login`, `/auth/register` e `/assistente/explicar` — e declarar no `render.yaml` as env vars que hoje impedem o boot em produção.

**Architecture:** Um único `Limiter` do `slowapi` (storage in-memory) em `app/utils/rate_limit.py`, registrado no `main.py` com handler de `RateLimitExceeded` → 429 + `Retry-After`. Limites aplicados por decorator nos endpoints. `/auth/*` é chaveado por IP real (lendo `X-Forwarded-For` atrás do proxy do Render); `/assistente/explicar` é chaveado por usuário (decodificando o `sub` do JWT). Flag `rate_limit_enabled` desliga tudo nos testes não-dedicados.

**Tech Stack:** Python 3.11, FastAPI 0.115, slowapi 0.1.x, pytest, pydantic-settings.

## Global Constraints

- Dependência nova: `slowapi>=0.1.9,<0.2` (compatível com FastAPI 0.115 / Starlette).
- Comentários e docstrings em **português** (Google-style); type hints obrigatórias.
- TDD: RED → GREEN → REFACTOR; commits frequentes; Conventional Commits em português citando `RNF-02′`/`RF-38`/`RNF-04`.
- Ambiente de execução: backend roda no WSL. Rodar pytest/pip via:
  `wsl.exe bash -lc "cd /home/hiago/projetos/fii-insights/backend && .venv/bin/<cmd>"`.
- Não chavear `/assistente/*` por IP (usuários atrás do mesmo NAT dividiriam a cota). Reusar `decodificar_token` de `app/utils/security.py` (não reimplementar JWT — DRY).
- Storage in-memory; cota diária é *best-effort* (Render free hiberna). Não adicionar Redis/Postgres.
- Endpoints `login`, `register`, `explicar` ganham parâmetro `request: Request` nomeado exatamente `request` (exigência do slowapi).

---

### Task 1: Scaffolding do limiter + rate limit em `/auth/login`

**Files:**
- Modify: `backend/pyproject.toml` (dependências)
- Modify: `backend/app/config.py` (flag `rate_limit_enabled`)
- Create: `backend/app/utils/rate_limit.py`
- Modify: `backend/app/main.py` (registra limiter + handler)
- Modify: `backend/app/routers/auth.py` (decorator + `request: Request` no `login`)
- Modify: `backend/tests/conftest.py` (desliga limiter por default)
- Test: `backend/tests/test_rate_limit.py`

**Interfaces:**
- Produces:
  - `app.config.settings.rate_limit_enabled: bool` (default `True`)
  - `app.utils.rate_limit.limiter: slowapi.Limiter`
  - `app.utils.rate_limit.ip_key_func(request: Request) -> str`
  - `app.utils.rate_limit.usuario_key_func(request: Request) -> str`
- Consumes: `app.utils.security.decodificar_token(token: str) -> str | None` (já existe)

- [ ] **Step 1: Instalar slowapi no venv e fixar no pyproject**

Edite `backend/pyproject.toml`, adicionando à lista `dependencies` (após `"email-validator>=2.2,<3.0",`):

```toml
    "slowapi>=0.1.9,<0.2",
```

Run:
```bash
wsl.exe bash -lc "cd /home/hiago/projetos/fii-insights/backend && .venv/bin/pip install 'slowapi>=0.1.9,<0.2'"
```
Expected: instala slowapi e a dep transitiva `limits` sem erro.

- [ ] **Step 2: Adicionar a flag `rate_limit_enabled` ao config**

Em `backend/app/config.py`, dentro da classe `Settings`, após a linha `gemini_model: str = "gemini-2.5-flash"` adicione:

```python
    rate_limit_enabled: bool = True  # desligado nos testes (RATE_LIMIT_ENABLED=false)
```

- [ ] **Step 3: Desligar o limiter por default nos testes**

Em `backend/tests/conftest.py`, **antes de qualquer import de `app`** (topo absoluto do arquivo), adicione:

```python
import os

os.environ.setdefault("RATE_LIMIT_ENABLED", "false")
```

(Isso garante que, quando `app.config` instanciar `settings` no import, o limiter já nasça desabilitado.)

- [ ] **Step 4: Criar o módulo do limiter**

Crie `backend/app/utils/rate_limit.py`:

```python
from __future__ import annotations

from fastapi import Request
from slowapi import Limiter

from app.config import settings
from app.utils.security import decodificar_token


def ip_key_func(request: Request) -> str:
    """Chave de rate limit por IP real, ciente do proxy do Render.

    Atrás de um proxy, `request.client.host` é o IP do proxy (compartilhado por
    todos). O IP do cliente vem no primeiro hop de `X-Forwarded-For`.
    """
    xff = request.headers.get("X-Forwarded-For")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "anonimo"


def usuario_key_func(request: Request) -> str:
    """Chave de rate limit por usuário autenticado (sub do JWT).

    Evita que usuários distintos atrás do mesmo NAT dividam a cota. Sem token
    válido, cai no IP (ip_key_func).
    """
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        sub = decodificar_token(auth[len("Bearer ") :])
        if sub is not None:
            return f"user:{sub}"
    return ip_key_func(request)


limiter = Limiter(key_func=ip_key_func, enabled=settings.rate_limit_enabled)
```

- [ ] **Step 5: Registrar o limiter no app**

Em `backend/app/main.py`, adicione os imports (junto aos demais, após `from app.config import settings`):

```python
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.utils.rate_limit import limiter
```

E logo após `app = FastAPI(title="FII Insights API", version="1.0.0")` adicione:

```python
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
```

- [ ] **Step 6: Escrever o teste que falha (login 11ª tentativa → 429)**

Crie `backend/tests/test_rate_limit.py`:

```python
from app.utils.rate_limit import limiter


def test_login_estoura_em_11_tentativas_por_ip(client_carteira):
    """A 11ª tentativa de login do mesmo IP (10/min) retorna 429 (RNF-02′)."""
    client, novo_usuario = client_carteira
    novo_usuario("brute@b.com")  # registra com o limiter ainda desligado
    limiter.enabled = True
    try:
        headers = {"X-Forwarded-For": "203.0.113.7"}
        for _ in range(10):
            r = client.post(
                "/api/v1/auth/login",
                json={"email": "brute@b.com", "senha": "errada"},
                headers=headers,
            )
            assert r.status_code != 429
        r = client.post(
            "/api/v1/auth/login",
            json={"email": "brute@b.com", "senha": "errada"},
            headers=headers,
        )
        assert r.status_code == 429
    finally:
        limiter.enabled = False
```

- [ ] **Step 7: Rodar o teste e confirmar que falha**

Run:
```bash
wsl.exe bash -lc "cd /home/hiago/projetos/fii-insights/backend && .venv/bin/python -m pytest tests/test_rate_limit.py -v"
```
Expected: FAIL — todas as 11 chamadas retornam 401 (sem limite aplicado), então o `assert r.status_code == 429` falha.

- [ ] **Step 8: Aplicar o limite no `/auth/login`**

Em `backend/app/routers/auth.py`:

1. Ajuste os imports do FastAPI para incluir `Request`:
```python
from fastapi import APIRouter, Depends, HTTPException, Request, status
```
2. Importe o limiter e o key_func (após os imports existentes):
```python
from app.utils.rate_limit import ip_key_func, limiter
```
3. Decore o `login` e adicione `request: Request` como **primeiro** parâmetro:
```python
@router.post("/login", response_model=TokenOut)
@limiter.limit("10/minute", key_func=ip_key_func)
def login(request: Request, body: LoginIn, db: Session = Depends(get_db)) -> TokenOut:
    """Autentica por e-mail e senha; mensagem genérica em falha."""
    usuario = UsuarioRepository(db).buscar_por_email(body.email)
    if usuario is None or not verificar_senha(body.senha, usuario.senha_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais inválidas")
    return TokenOut(access_token=criar_access_token(str(usuario.id)))
```

- [ ] **Step 9: Rodar o teste e confirmar que passa**

Run:
```bash
wsl.exe bash -lc "cd /home/hiago/projetos/fii-insights/backend && .venv/bin/python -m pytest tests/test_rate_limit.py -v"
```
Expected: PASS.

- [ ] **Step 10: Rodar a suíte inteira (regressão)**

Run:
```bash
wsl.exe bash -lc "cd /home/hiago/projetos/fii-insights/backend && .venv/bin/python -m pytest -q"
```
Expected: todos passam (203 anteriores + 1 novo = 204). Se algum teste de auth quebrar por limite, confirme que o `conftest` setou `RATE_LIMIT_ENABLED=false` no topo (Step 3).

- [ ] **Step 11: Commit**

```bash
git add backend/pyproject.toml backend/app/config.py backend/app/utils/rate_limit.py backend/app/main.py backend/app/routers/auth.py backend/tests/conftest.py backend/tests/test_rate_limit.py
git commit -m "feat(seguranca): rate limit por IP em /auth/login (RNF-02')"
```

---

### Task 2: Rate limit em `/auth/register`

**Files:**
- Modify: `backend/app/routers/auth.py` (decorator + `request: Request` no `register`)
- Test: `backend/tests/test_rate_limit.py`

**Interfaces:**
- Consumes: `app.utils.rate_limit.limiter`, `ip_key_func` (Task 1)

- [ ] **Step 1: Escrever o teste que falha (6º cadastro do mesmo IP → 429)**

Adicione a `backend/tests/test_rate_limit.py`:

```python
def test_register_estoura_em_6_cadastros_por_ip(client_carteira):
    """O 6º cadastro do mesmo IP (5/hora) retorna 429 (RNF-02′)."""
    client, _ = client_carteira
    limiter.enabled = True
    try:
        headers = {"X-Forwarded-For": "203.0.113.9"}
        for i in range(5):
            r = client.post(
                "/api/v1/auth/register",
                json={"email": f"u{i}@b.com", "senha": "segredo123"},
                headers=headers,
            )
            assert r.status_code != 429
        r = client.post(
            "/api/v1/auth/register",
            json={"email": "u6@b.com", "senha": "segredo123"},
            headers=headers,
        )
        assert r.status_code == 429
    finally:
        limiter.enabled = False
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run:
```bash
wsl.exe bash -lc "cd /home/hiago/projetos/fii-insights/backend && .venv/bin/python -m pytest tests/test_rate_limit.py::test_register_estoura_em_6_cadastros_por_ip -v"
```
Expected: FAIL — o 6º cadastro retorna 201, não 429.

- [ ] **Step 3: Aplicar o limite no `/auth/register`**

Em `backend/app/routers/auth.py`, decore o `register` e adicione `request: Request` como primeiro parâmetro:

```python
@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/hour", key_func=ip_key_func)
def register(request: Request, body: RegistroIn, db: Session = Depends(get_db)) -> TokenOut:
    """Cria um usuário e já retorna o token (auto-login)."""
    repo = UsuarioRepository(db)
    if repo.buscar_por_email(body.email) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="E-mail já cadastrado")
    nome = body.nome.strip() if body.nome and body.nome.strip() else None
    usuario = repo.criar(email=body.email, senha_hash=hash_senha(body.senha), nome=nome)
    return TokenOut(access_token=criar_access_token(str(usuario.id)))
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run:
```bash
wsl.exe bash -lc "cd /home/hiago/projetos/fii-insights/backend && .venv/bin/python -m pytest tests/test_rate_limit.py -v"
```
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add backend/app/routers/auth.py backend/tests/test_rate_limit.py
git commit -m "feat(seguranca): rate limit por IP em /auth/register (RNF-02')"
```

---

### Task 3: Rate limit por usuário em `/assistente/explicar`

**Files:**
- Modify: `backend/app/routers/assistente.py` (decorator + `request: Request` no `explicar`)
- Test: `backend/tests/test_rate_limit.py`

**Interfaces:**
- Consumes: `app.utils.rate_limit.limiter`, `usuario_key_func` (Task 1); `app.routers.assistente.get_llm`, `app.services.assistente_llm.FakeLLM` (já existem)

- [ ] **Step 1: Escrever os testes que falham (rajada + isolamento por usuário)**

Adicione a `backend/tests/test_rate_limit.py` (no topo, junto aos imports):

```python
from app.main import app
from app.routers.assistente import get_llm
from app.services.assistente_llm import FakeLLM
```

E os testes:

```python
def test_assistente_estoura_em_6_chamadas_por_minuto(client_carteira):
    """A 6ª chamada/min do mesmo usuário (5/minute) retorna 429 (RF-38)."""
    client, novo_usuario = client_carteira
    h = novo_usuario("ia@b.com")  # registra com limiter desligado
    app.dependency_overrides[get_llm] = lambda: FakeLLM("ok")
    limiter.enabled = True
    try:
        body = {"ticker": "HGLG11", "pergunta": "Por que?", "nivel": "iniciante"}
        for _ in range(5):
            r = client.post("/api/v1/assistente/explicar", json=body, headers=h)
            assert r.status_code != 429
        r = client.post("/api/v1/assistente/explicar", json=body, headers=h)
        assert r.status_code == 429
    finally:
        limiter.enabled = False
        app.dependency_overrides.pop(get_llm, None)


def test_assistente_cota_e_por_usuario_nao_por_ip(client_carteira):
    """Usuário B não é bloqueado quando A estoura a cota (chave por JWT, RF-38)."""
    client, novo_usuario = client_carteira
    ha = novo_usuario("a@b.com")
    hb = novo_usuario("b@b.com")
    app.dependency_overrides[get_llm] = lambda: FakeLLM("ok")
    limiter.enabled = True
    try:
        body = {"ticker": "HGLG11", "pergunta": "?", "nivel": "iniciante"}
        for _ in range(6):  # estoura a cota do usuário A
            client.post("/api/v1/assistente/explicar", json=body, headers=ha)
        r = client.post("/api/v1/assistente/explicar", json=body, headers=hb)
        assert r.status_code == 200
    finally:
        limiter.enabled = False
        app.dependency_overrides.pop(get_llm, None)
```

- [ ] **Step 2: Rodar e confirmar que falham**

Run:
```bash
wsl.exe bash -lc "cd /home/hiago/projetos/fii-insights/backend && .venv/bin/python -m pytest tests/test_rate_limit.py -k assistente -v"
```
Expected: FAIL — a 6ª chamada retorna 200, não 429.

- [ ] **Step 3: Aplicar os limites no `/assistente/explicar`**

Em `backend/app/routers/assistente.py`:

1. Ajuste o import do FastAPI para incluir `Request`:
```python
from fastapi import APIRouter, Depends, HTTPException, Request
```
2. Importe limiter e key_func (após os imports existentes):
```python
from app.utils.rate_limit import limiter, usuario_key_func
```
3. Decore o `explicar` e adicione `request: Request` como **primeiro** parâmetro:
```python
@router.post("/explicar", response_model=ExplicarOut)
@limiter.limit("5/minute;20/day", key_func=usuario_key_func)
def explicar(
    request: Request,
    body: ExplicarIn,
    usuario: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
    llm: AssistenteLLM = Depends(get_llm),
) -> ExplicarOut:
    """Explica, em linguagem simples e ancorada nos dados, o scoring de um fundo (RF-38)."""
    try:
        out = responder(db, body.ticker, body.pergunta, body.nivel, llm)
    except FundoNaoEncontrado:
        raise HTTPException(status_code=404, detail="Fundo não encontrado") from None
    except AssistenteIndisponivel:
        raise HTTPException(status_code=503, detail="Assistente indisponível no momento") from None
    fundo = out["fundo"]
    return ExplicarOut(
        resposta=out["resposta"],
        fundo=FundoResumoOut(
            ticker=fundo["ticker"],
            score=fundo["score"],
            classificacao=fundo["classificacao"],
        ),
    )
```

> Nota: a cota diária (`20/day`) usa o mesmo mecanismo do `5/minute`; seu limite-fronteira não é asserido isoladamente porque o limite/minuto domina dentro da janela de um teste rápido. O teste `test_assistente_estoura_em_6_chamadas_por_minuto` valida o mecanismo.

- [ ] **Step 4: Rodar e confirmar que passam**

Run:
```bash
wsl.exe bash -lc "cd /home/hiago/projetos/fii-insights/backend && .venv/bin/python -m pytest tests/test_rate_limit.py -v"
```
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add backend/app/routers/assistente.py backend/tests/test_rate_limit.py
git commit -m "feat(seguranca): cota por usuario em /assistente/explicar (RF-38, RNF-02')"
```

---

### Task 4: Declarar env vars de produção no `render.yaml`

**Files:**
- Modify: `render.yaml`

**Interfaces:** nenhum (arquivo de infra).

- [ ] **Step 1: Adicionar as env vars ao serviço**

Em `render.yaml`, dentro de `envVars` (após o bloco `LOG_LEVEL`), adicione:

```yaml
      - key: ENVIRONMENT
        value: production
      - key: AUTH_SECRET
        sync: false
      - key: GEMINI_API_KEY
        sync: false
      - key: GEMINI_MODEL
        value: gemini-2.5-flash
```

- [ ] **Step 2: Validar que o YAML continua parseável**

Run:
```bash
wsl.exe bash -lc "cd /home/hiago/projetos/fii-insights && .venv/bin/python -c \"import yaml,sys; d=yaml.safe_load(open('render.yaml')); keys=[e['key'] for e in d['services'][0]['envVars']]; print(keys); sys.exit(0 if {'ENVIRONMENT','AUTH_SECRET','GEMINI_API_KEY','GEMINI_MODEL'} <= set(keys) else 1)\""
```
Expected: imprime a lista de keys incluindo as 4 novas e sai com código 0.
(Se `backend/.venv` não tiver `pyyaml`, use `wsl.exe bash -lc "cd /home/hiago/projetos/fii-insights/backend && .venv/bin/python -c ..."` — o `.venv` do backend tem pyyaml via dependências transitivas; caso não, `python3 -c` do sistema.)

- [ ] **Step 3: Commit**

```bash
git add render.yaml
git commit -m "chore(deploy): declara ENVIRONMENT/AUTH_SECRET/GEMINI no render.yaml (RNF-02')"
```

---

### Task 5: Verificação final (regressão + lint + tipos)

**Files:** nenhum (verificação).

- [ ] **Step 1: Suíte completa**

Run:
```bash
wsl.exe bash -lc "cd /home/hiago/projetos/fii-insights/backend && .venv/bin/python -m pytest -q"
```
Expected: todos passam (207 = 203 + 4 novos).

- [ ] **Step 2: Lint e formatação**

Run:
```bash
wsl.exe bash -lc "cd /home/hiago/projetos/fii-insights/backend && .venv/bin/ruff check . && .venv/bin/ruff format --check ."
```
Expected: sem erros. Se `ruff format --check` reclamar, rode `.venv/bin/ruff format .` e re-commite.

- [ ] **Step 3: Type check**

Run:
```bash
wsl.exe bash -lc "cd /home/hiago/projetos/fii-insights/backend && .venv/bin/mypy app/"
```
Expected: `Success: no issues found`. Se o mypy reclamar do handler do slowapi em `main.py`, anote o motivo e avalie um `# type: ignore[arg-type]` pontual (slowapi não é totalmente tipado; `ignore_missing_imports` já está ligado).

- [ ] **Step 4: Smoke do boot em produção (recusa sem AUTH_SECRET)**

Run:
```bash
wsl.exe bash -lc "cd /home/hiago/projetos/fii-insights/backend && ENVIRONMENT=production .venv/bin/python -c 'from app.config import Settings; Settings()' ; echo exit=$?"
```
Expected: levanta `ValueError` sobre AUTH_SECRET (exit != 0) — confirma que o P0 #1 segue ativo e que a flag nova não o quebrou.

- [ ] **Step 5: Commit (se Step 2 reformatou algo)**

```bash
git add -A && git commit -m "style(seguranca): ruff format apos rate limiting" || echo "nada a formatar"
```

---

## Self-Review (preenchido)

**Cobertura do spec:**
- §2 biblioteca/infra → Task 1 (deps, limiter, registro). ✓
- §3 limites (login 10/min, register 5/h, assistente 5/min;20/day) → Tasks 1, 2, 3. ✓
- §4.1 X-Forwarded-For → `ip_key_func` (Task 1, Step 4). ✓
- §4.2 chave por usuário → `usuario_key_func` reusando `decodificar_token` (Task 1, Step 4; aplicado Task 3). ✓
- §4.3 `request: Request` nas assinaturas → Tasks 1/2/3. ✓
- §5 testabilidade (flag + conftest desliga + testes dedicados) → Task 1 Steps 2,3,6; Tasks 2,3. ✓
- §6 render.yaml → Task 4. ✓
- §7 limitação diária documentada → nota na Task 3 Step 3. ✓

**Placeholder scan:** nenhum TBD/TODO; todo passo de código mostra o código. ✓

**Consistência de tipos:** `ip_key_func`/`usuario_key_func` definidos em Task 1 e usados com os mesmos nomes em Tasks 2/3; `limiter` idem; `decodificar_token` assinatura confere com `security.py`. ✓
