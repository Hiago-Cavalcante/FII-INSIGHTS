import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { decidirConviteInstalar, ehIOS, type VarianteConvite } from "@/lib/pwa";
import { GuiaInstalacaoIOS } from "./GuiaInstalacaoIOS";

const CHAVE_DISPENSA = "pwa-convite-dispensado";
const DELAY_MS = 1500;

// beforeinstallprompt não é tipado no lib.dom padrão.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function estaInstalado(): boolean {
  if (typeof window === "undefined") return false;
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches ?? false;
  const iosStandalone = (navigator as unknown as { standalone?: boolean }).standalone === true;
  return standalone || iosStandalone;
}

function lerDispensa(): number | null {
  const v = localStorage.getItem(CHAVE_DISPENSA);
  return v ? Number(v) : null;
}

/**
 * Convite para instalar o PWA na tela inicial. Banner inferior mobile-first,
 * renderizado na raiz. Aparece ~1,5s após abrir, só quando faz sentido:
 * Android (prompt nativo) ou iOS (instruções manuais). Some quando instalado
 * ou dispensado (com backoff). Coordena com a faixa superior do ServidorAcordando.
 */
export function ConviteInstalarPwa() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [instalado, setInstalado] = useState<boolean>(() => estaInstalado());
  const [dispensadoEm, setDispensadoEm] = useState<number | null>(() => lerDispensa());
  // `agora` é capturado quando o delay expira (no effect), nunca no render —
  // Date.now() no render viola a regra de pureza do React.
  const [agora, setAgora] = useState<number | null>(null);
  const [guiaAberto, setGuiaAberto] = useState(false);

  useEffect(() => {
    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setInstalado(true);
      setPromptEvent(null);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    const t = setTimeout(() => setAgora(Date.now()), DELAY_MS);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      clearTimeout(t);
    };
  }, []);

  const variante: VarianteConvite =
    agora !== null
      ? decidirConviteInstalar({
          jaInstalado: instalado,
          promptDisponivel: promptEvent !== null,
          ehIOS: ehIOS(navigator.userAgent),
          dispensadoEm,
          agora,
        })
      : "oculto";

  function dispensar() {
    const agora = Date.now();
    localStorage.setItem(CHAVE_DISPENSA, String(agora));
    setDispensadoEm(agora);
  }

  async function instalar() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    setPromptEvent(null);
  }

  if (variante === "oculto") return null;

  return (
    <>
      <div
        role="dialog"
        aria-label="Instalar o FII Insights"
        className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md p-3"
      >
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-lg">
          <img src="/icons/icon-192.png" alt="" className="h-10 w-10 shrink-0 rounded-xl" />
          <div className="flex-1 text-sm">
            <p className="font-semibold text-foreground">Instale o FII Insights</p>
            <p className="text-xs text-muted-foreground">
              Adicione à tela inicial para abrir como um app.
            </p>
          </div>
          {variante === "android" ? (
            <button
              type="button"
              onClick={instalar}
              className="flex shrink-0 items-center gap-1 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
            >
              <Download className="h-4 w-4" aria-hidden /> Instalar
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setGuiaAberto(true)}
              className="shrink-0 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
            >
              Como instalar
            </button>
          )}
          <button
            type="button"
            onClick={dispensar}
            aria-label="Dispensar"
            className="shrink-0 rounded-lg p-1 text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <GuiaInstalacaoIOS aberto={guiaAberto} onFechar={() => setGuiaAberto(false)} />
    </>
  );
}
