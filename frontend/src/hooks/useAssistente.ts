import { useMutation } from "@tanstack/react-query";
import { chat, type ChatIn, type ChatOut } from "@/api/endpoints/assistente";

export function useAssistente() {
  return useMutation<ChatOut, Error, ChatIn>({ mutationFn: chat });
}
