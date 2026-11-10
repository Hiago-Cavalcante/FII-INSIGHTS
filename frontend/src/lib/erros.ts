/**
 * Extrai a mensagem legível de um erro da API (campo `detail` do FastAPI).
 * Erros de validação (lista) e de rede caem no texto padrão informado.
 */
export function mensagemErroApi(err: unknown, padrao: string): string {
  if (typeof err === "object" && err !== null && "response" in err) {
    const detail = (err as { response?: { data?: { detail?: unknown } } }).response?.data?.detail;
    if (typeof detail === "string" && detail.trim()) return detail;
  }
  return padrao;
}
