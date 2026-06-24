// Registra o service worker do PWA (gerado pelo Serwist em /sw.js).
// Side-effect puro, sem UI. Chamado uma vez no boot (main.tsx).
// Só em produção: no `vite dev` o /sw.js não é gerado.
export function registrarServiceWorker(): void {
  if (!import.meta.env.PROD) return;
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    void (async () => {
      try {
        const { Serwist } = await import("@serwist/window");
        const sw = new Serwist("/sw.js", { scope: "/", type: "classic" });
        await sw.register();
      } catch (e) {
        // Não bloquear o app se o registro do SW falhar.
        console.warn("Falha ao registrar o service worker:", e);
      }
    })();
  });
}
