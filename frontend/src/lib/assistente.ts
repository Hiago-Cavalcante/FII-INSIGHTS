import type { TrocaHistorico } from "@/api/endpoints/assistente";

export interface Mensagem {
  papel: "usuario" | "assistente" | "erro";
  texto: string;
}

/**
 * Últimas `n` trocas (par usuário+assistente) para enviar como contexto,
 * descartando bolhas de erro.
 */
export function ultimasTrocas(mensagens: Mensagem[], n: number): TrocaHistorico[] {
  const validas = mensagens.filter((m) => m.papel !== "erro");
  return validas.slice(-n * 2) as TrocaHistorico[];
}
