export type VarianteConvite = "oculto" | "android" | "ios";

/** Não reincomodar com o convite por 7 dias após dispensa. */
export const BACKOFF_DISPENSA_MS = 7 * 24 * 60 * 60 * 1000;

interface ParamsConvite {
  /** App já roda instalado (display-mode standalone). */
  jaInstalado: boolean;
  /** Evento beforeinstallprompt foi capturado (Android/Chromium). */
  promptDisponivel: boolean;
  /** É um navegador iOS (sem beforeinstallprompt → instruções manuais). */
  ehIOS: boolean;
  /** Quando o usuário dispensou o convite (ms), ou null se nunca. */
  dispensadoEm: number | null;
  /** Agora (ms). */
  agora: number;
}

/**
 * Decide qual convite de instalação mostrar.
 *
 * Instalado ou dispensado recentemente → nada. Caso contrário, prompt nativo
 * (Android) tem prioridade; no iOS, instruções manuais; senão, nada.
 */
export function decidirConviteInstalar({
  jaInstalado,
  promptDisponivel,
  ehIOS: iOS,
  dispensadoEm,
  agora,
}: ParamsConvite): VarianteConvite {
  if (jaInstalado) return "oculto";
  if (dispensadoEm !== null && agora - dispensadoEm < BACKOFF_DISPENSA_MS) return "oculto";
  if (promptDisponivel) return "android";
  if (iOS) return "ios";
  return "oculto";
}

/** Detecta navegador iOS pelo user agent. */
export function ehIOS(userAgent: string): boolean {
  return /iphone|ipad|ipod/i.test(userAgent);
}
