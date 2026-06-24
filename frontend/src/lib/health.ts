import { BASE_URL } from "@/api/client";

export type EstadoServidor = "ocioso" | "acordando" | "pronto";

/** Tempo pendente antes de assumir que o servidor está acordando (cold start do free tier). */
export const LIMIAR_ACORDANDO_MS = 2500;

interface ParamsEstado {
  /** O GET /health já respondeu (servidor no ar). */
  resolvido: boolean;
  /** Há quanto tempo o ping está pendente (ms). */
  msDecorridos: number;
  /** Limiar a partir do qual mostramos o aviso de "acordando". */
  limiarMs: number;
}

/**
 * Decide o estado da UI de cold start a partir do ping de saúde.
 *
 * Enquanto o ping não resolve e ainda estamos dentro do limiar, ficamos
 * "ocioso" (sem aviso) — assim, num servidor já quente o aviso nunca aparece.
 */
export function classificarEstado({
  resolvido,
  msDecorridos,
  limiarMs,
}: ParamsEstado): EstadoServidor {
  if (resolvido) return "pronto";
  return msDecorridos >= limiarMs ? "acordando" : "ocioso";
}

/**
 * Dispara um GET /health fire-and-forget para iniciar o warmup do backend
 * assim que o app abre (combate o cold start do Render free). Nunca lança.
 */
export async function acordarServidor(): Promise<void> {
  try {
    await fetch(`${BASE_URL}/health`, { method: "GET" });
  } catch {
    // fire-and-forget: ignoramos falha de rede/CORS de propósito.
  }
}
