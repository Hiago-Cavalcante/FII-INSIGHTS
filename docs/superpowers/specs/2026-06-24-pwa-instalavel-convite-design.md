# PWA instalável + convite de instalação — Design

> **Status:** aprovado 2026-06-24, em implementação. Estende o plano de alpha (ver memória `alpha-producao-seguranca-pwa`).
> Decisão de stack: **Serwist** (alinha com a decisão do alpha). Risco "compat @serwist/vite × Vite 8" **descartado**: `@serwist/vite@9.5.11` declara `peerDependencies vite >=5.0.0`; projeto em `vite@8.0.16`.

## Problema

O app **não é PWA** (sem manifest/SW/ícones). Logo, no celular o navegador não oferece "instalar" e nenhum convite pode aparecer. O pedido ("ao abrir, aparecer convite pra instalar no celular") exige duas partes: (1) tornar instalável; (2) a UX do convite.

## Decisões (brainstorm 2026-06-24)

- Escopo: **PWA completo com Serwist** (instalável + cache de leitura pública), não só o convite.
- Ícones: **gerados** (monograma da marca sobre o verde primário) — 192/512/maskable + apple-touch.
- "Notificação" = **banner de instalar na tela inicial** (NÃO web push).

## Seção 1 — Fundação PWA

**Deps (dev):** `@serwist/vite @serwist/window serwist`.

```
frontend/
  vite.config.ts          ALT  + plugin serwist({ swSrc: "src/sw.ts", swDest: "sw.js", ... })
  index.html              ALT  + <link rel=manifest>, theme-color, apple-touch-icon, meta apple-mobile-web-app-*
  public/manifest.webmanifest  NOVO  name "FII Insights", display: standalone, start_url "/", theme/bg verde, lang pt-BR, icons
  public/icons/           NOVO  192, 512, maskable, apple-touch (gerados)
  src/sw.ts               NOVO  service worker Serwist
```

**Cache (honra "só leitura pública, sem sync de escrita"):**
- Precache do app shell (`__SW_MANIFEST`) → abre instantâneo / UI offline (bônus: combina com cold start).
- Runtime `NetworkFirst` (TTL curto) só para GET de catálogo/análise público: ranking, fundos, clusters, scoring, dashboard.
- `NetworkOnly` (nunca em cache): `/auth/*`, dados do usuário (carteira, perfil, assistente), e todo POST/PUT/DELETE.
- Navegação offline → fallback `index.html` precacheado (SPA).
- Atualização: `skipWaiting` + `clientsClaim` + toast "nova versão" (evita ficar preso em build antigo).

## Seção 2 — UX do convite

- `<ConviteInstalarPwa/>` na raiz (irmão do `ServidorAcordando`), banner inferior mobile-first.
- Pura/testável `decidirConviteInstalar({ jaInstalado, promptDisponivel, ehIOS, dispensadoEm, agora })` → `"oculto" | "android" | "ios"`.
  - instalado → oculto; dispensado < 7 dias → oculto; `beforeinstallprompt` → android; iOS Safari não-standalone → ios; senão oculto.
- Android: [Instalar] chama `deferredPrompt.prompt()`; [Agora não] guarda dispensa. Some em `appinstalled`.
- iOS: instruções "Compartilhar → Adicionar à Tela de Início" + [Entendi].
- Aparece ~1,5s após abrir, só se decisão ≠ oculto. Dispensa em localStorage, backoff 7 dias.

## Testes

- TDD: `decidirConviteInstalar` (todos os ramos) + componente (`ConviteInstalarPwa`) renderiza variante certa / oculto.
- Config/assets (manifest, vite.config, sw.ts, ícones): exceção de TDD → validar via `npm run build` + checagem manual no celular (instalar de verdade).

## Pendências de implementação a resolver

- Template `src/sw.ts` da API Serwist v9 (buscar nos docs).
- Ferramenta de geração de PNG dos ícones (SVG→PNG): verificar rsvg/convert/sharp no WSL.
- Coordenar posição do banner inferior com a faixa superior do `ServidorAcordando`.
