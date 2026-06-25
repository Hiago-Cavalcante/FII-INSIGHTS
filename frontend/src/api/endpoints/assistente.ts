import { apiClient } from "@/api/client";

export interface TrocaHistorico {
  papel: "usuario" | "assistente";
  texto: string;
}

export interface ChatIn {
  mensagem: string;
  historico: TrocaHistorico[];
  nivel: "iniciante" | "analitico";
}

export interface ChatOut {
  resposta: string;
}

export async function chat(body: ChatIn): Promise<ChatOut> {
  const { data } = await apiClient.post<ChatOut>("/api/v1/assistente/chat", body);
  return data;
}
