import { apiClient } from "@/api/client";
import type { components } from "@/types/api";

export type ExplicarBody = components["schemas"]["ExplicarIn"];
export type Explicacao = components["schemas"]["ExplicarOut"];

export async function explicar(body: ExplicarBody): Promise<Explicacao> {
  const { data } = await apiClient.post<Explicacao>("/api/v1/assistente/explicar", body);
  return data;
}
