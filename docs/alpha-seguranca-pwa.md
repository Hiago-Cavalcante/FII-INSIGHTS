# Plano: virada MVP → Alpha em produção (Segurança + PWA)

> **Status:** planejamento (pré-implementação). Nenhum código alterado por este documento.
> **Data:** 2026-06-20 · **Autor:** Hiago (com Claude Code)
> **Relacionado:** [`REQUISITOS.md`](REQUISITOS.md) — RNF-02′ (auth/permissionamento), RNF-05 (mobile-first), RNF-04 (rastreabilidade), RF-38 (assistente IA).

Este documento consolida a pesquisa e o diagnóstico para levar o **FII-Insights** de um MVP/demo para um **alpha em produção com usuários reais**, adicionando **PWA (Serwist)**, **camadas de segurança** e **autenticação para signup público**. Cada bloco aqui é uma feature significativa (muda contrato/arquitetura) e, pelo `CLAUDE.md`, exige `brainstorm → write-plan → TDD` antes de implementar.

---

## 1. Escopo decidido

| Tema | Decisão |
|---|---|
| **Autenticação** | Self-hosted no backend (sem provedor terceirizado) — manter e reforçar a base JWT que já existe. Dados de auth no próprio Postgres/Neon. |
| **Acesso ao alpha** | **Cadastro público aberto** → exige verificação de e-mail, rate limit anti-abuso e LGPD mínimo. |
| **PWA** | Serwist **instalável + cache só de leitura pública** (rankings, indicadores, catálogo). **Sem** sync offline de escrita. |

---

## 2. Diagnóstico real do código (auditoria 2026-06-20)

A premissa "não tem auth / tabelas pessoais sem dono" estava **parcialmente desatualizada**: a autenticação já existe e está decente. O buraco é cirúrgico.

| Área | Estado | Evidência |
|---|---|---|
| Hash de senha | ✅ bcrypt; senha limitada a 72 bytes (correto p/ bcrypt) | `utils/security.py:19`, `routers/auth.py:23` |
| JWT | ✅ PyJWT HS256, Bearer, `get_current_user` valida e busca usuário | `utils/security.py:30,49` |
| Carteira (posições/dividendos/recomendações) | ✅ **escopada por dono** — sem IDOR/BOLA | `routers/carteira.py:116,186` |
| Assistente IA | ✅ exige login | `routers/assistente.py:44` |
| Chave do Gemini | ✅ **só no backend**, nunca exposta ao front | `routers/assistente.py:21` |
| **`auth_secret`** | 🔴 **default inseguro hardcoded** — se `AUTH_SECRET` não for setado em prod, qualquer um forja token | `config.py:9` |
| **`perfil.py`** | 🔴 **perfil global único** (`_PERFIL_ID="perfil-unico"`), **sem `get_current_user`** — todos os usuários leem/sobrescrevem o mesmo perfil | `routers/perfil.py:13,40,46` |
| Rate limiting | 🟠 **inexistente** — `/login`/`/register` brute-forçáveis; `/assistente/explicar` abusável (custo Gemini) | `main.py` |
| Verificação de e-mail | 🟠 inexistente — `register` faz auto-login imediato | `routers/auth.py:44` |
| Reset de senha | 🟠 inexistente | — |
| Token | 🟠 único, **7 dias**, sem refresh nem revogação; em `localStorage` → 7 dias de acesso se vazar via XSS | `config.py:11`, `frontend/src/stores/authStore.ts:27` |
| Security headers (CSP/HSTS) | 🟠 nenhum middleware | `main.py` |
| CORS | ✅ origens explícitas via env. Obs: `allow_credentials=True` é inócuo já que se usa Bearer, não cookie | `main.py:25` |
| Token storage (front) | ⚠️ `localStorage` via `zustand persist` (chave `fii-auth`), injetado por interceptor `Authorization: Bearer` | `frontend/src/stores/authStore.ts`, `frontend/src/api/client.ts:13` |
| PWA | ⚪ inexistente (sem serwist/workbox/vite-plugin-pwa) | `frontend/package.json` |
| Stack real | ℹ️ **React 19 + Vite 8** (o `CLAUDE.md` ainda diz React 18/Vite 5 — desatualizar) | `frontend/package.json` |

**Conclusão:** estamos a ~2 correções **críticas** (secret + perfil) e ~4 de **hardening** de um alpha responsável. A auth pesada já foi feita.

---

## 3. Pilar 1 — Autenticação (fechar buracos da base existente)

- **`AUTH_SECRET`:** remover o default do `config.py` e **recusar subir** se vazio/igual ao default em produção. Gerar com `python -c "import secrets;print(secrets.token_urlsafe(64))"` e setar no env do Render.
- **Escopar `perfil.py`:** adicionar FK `usuario_id` em `perfis_investidor`, exigir `get_current_user`, buscar por `usuario.id` (como a carteira já faz). Migração Alembic + backfill.
- **Token:** encurtar o access token (30–60 min) **+ refresh token**; ou, no mínimo p/ alpha, reduzir para ~1 dia + logout que limpa tudo. `bcrypt` permanece (trocar p/ argon2id não vale o esforço agora — YAGNI).
- **Signup público → e-mail:** verificação por link com token assinado, usando provedor transacional de free tier (Resend/Brevo/Mailgun — **preços/limites a reverificar**). Sem isso, signup aberto = contas falsas que queimam a cota do Gemini.
- **Brute-force:** rate limit em `/login` e `/register` + mensagem genérica (já existe em `auth.py:60`).

---

## 4. Pilar 2 — Hardening (checklist priorizada)

### P0 — bloqueia o lançamento (sem isso, não abrir ao público)
1. `AUTH_SECRET` forte e obrigatório em prod.
2. `perfil.py` escopado por dono.
3. **Rate limit no Gemini** — `/assistente/explicar` com limite por usuário (ex.: N/dia). Maior risco de **custo**.
4. **Rate limit em `/auth/*`** — `slowapi` é o caminho mais simples no FastAPI (**versão a reverificar**).

### P1 — antes de convidar usuários reais
5. Security headers: HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy` e **CSP** restritiva (crítica: token em `localStorage` ⇒ CSP é a principal defesa anti-XSS). Middleware no FastAPI + headers na Vercel (`vercel.json`).
6. Verificação de e-mail no signup.
7. `pip-audit` (backend) + `npm audit`/Dependabot (frontend) no CI.
8. LGPD mínimo: consentimento no cadastro, política de privacidade simples, rota de **exclusão de conta** (apaga usuário + dados pessoais). Coleta já é mínima.

### P2 — pode vir junto/depois
9. Reset de senha; refresh token; logs de auditoria de login.

---

## 5. Pilar 3 — PWA com Serwist (Vite + React)

> ⚠️ **A reverificar:** o projeto está no **Vite 8** (muito recente). Confirmar a compatibilidade do plugin Serwist (`@serwist/vite`) com Vite 8 — maior risco técnico deste pilar.

- Plugin `@serwist/vite` + `serwist` + `@serwist/window`; SW em `src/sw.ts` com a classe `Serwist`, `precacheEntries: self.__SW_MANIFEST`, `skipWaiting`/`clientsClaim`, e `manifest.webmanifest` + ícones maskable.
- **Cache:** precache do app shell; runtime cache **só de GETs públicos** (ranking, catálogo de fundos, indicadores) via `StaleWhileRevalidate`/`NetworkFirst`.
- 🔴 **Segurança (decisivo num app financeiro):** **NUNCA** cachear no `CacheStorage` respostas autenticadas — `/carteira/*`, `/perfil`, `/assistente/*`, `/auth/*`. Usar **allowlist por URL** (cacheia só o público), nunca blocklist. No **logout, limpar `caches`** além do `localStorage`.
- Update do SW: avisar o usuário ("nova versão") e só então `skipWaiting` (evita troca abrupta).
- **Prioridade:** PWA é **P2**, abaixo dos buracos de segurança.

---

## 6. Sequência recomendada

```
P0 segurança (secret + perfil + rate-limit Gemini/auth)  ← antes de QUALQUER usuário real
      ↓
P1 alpha (headers/CSP + verificação e-mail + LGPD mínimo + audit deps)
      ↓
P2 PWA Serwist (instalável + cache público) + reset senha/refresh
```

---

## 7. Itens em aberto (a reverificar)

A pesquisa multi-fonte (`deep-research`) **não foi concluída** (limite de gasto da org derrubou as etapas de fetch e verificação). Quando reabrir, verificar:

- Compatibilidade do `@serwist/vite` com **Vite 8** e o setup atual.
- Preços/limites correntes de e-mail transacional (Resend/Brevo/Mailgun).
- Limites do **free tier do Gemini** (modelo `gemini-2.5-flash`) e estratégia de quota por usuário.
- Versão atual e melhores práticas do `slowapi` (ou alternativa de rate limit no FastAPI).

---

## 8. Achado operacional (fora de escopo, registrar)

Em 2026-06-20 a árvore de trabalho apresentava **87 arquivos com diff de fim de linha (CRLF↔LF)** — `12302 insertions / 12302 deletions`, sem mudança de conteúdo nem de modo. O repositório **não tem `.gitattributes`** normalizando EOL e `core.autocrlf` está vazio. Recomenda-se adicionar um `.gitattributes` com `* text=auto eol=lf` e renormalizar (`git add --renormalize .`) numa tarefa dedicada, para evitar diffs-fantasma ao alternar entre Windows e WSL.
