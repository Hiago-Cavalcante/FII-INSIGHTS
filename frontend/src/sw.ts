import { defaultCache } from "@serwist/vite/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Service worker do PWA FII Insights.
// - precache do app shell (estáticos same-origin) -> abre instantâneo e a UI
//   funciona offline; também suaviza o cold start do backend.
// - runtimeCaching padrão do Serwist (estáticos/imagens same-origin).
// A API (cross-origin, dados do usuário/auth) NÃO é cacheada de propósito:
// nada pessoal ou desatualizado fica no dispositivo.
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();
