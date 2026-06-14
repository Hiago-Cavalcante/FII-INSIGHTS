import { useMutation } from "@tanstack/react-query";
import { explicar } from "@/api/endpoints/assistente";

/** Pergunta ao assistente sobre um fundo (mutation; resposta ancorada no backend). */
export function useAssistente() {
  return useMutation({ mutationFn: explicar });
}
