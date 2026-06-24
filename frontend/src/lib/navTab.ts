/**
 * Lê uma sub-aba de `location.state` (vinda do índice de tours), validando
 * contra a lista de abas permitidas. Retorna null se ausente ou inválida.
 */
export function lerTabDoEstado(state: unknown, validas: readonly string[]): string | null {
  if (state && typeof state === "object" && "tab" in state) {
    const t = (state as { tab?: unknown }).tab;
    if (typeof t === "string" && validas.includes(t)) return t;
  }
  return null;
}
