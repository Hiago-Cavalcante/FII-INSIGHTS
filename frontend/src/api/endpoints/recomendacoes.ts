import { apiClient } from "@/api/client";
import type { components } from "@/types/api";

export type Recomendacoes = components["schemas"]["RecomendacoesOut"];
export type PrecoTeto = components["schemas"]["PrecoTetoOut"];
export type ClasseRebal = components["schemas"]["ClasseRebalOut"];

export interface RecomendacoesParams {
  yieldFii?: number;
  yieldFiagro?: number;
  alvoFii?: number;
}

export async function getRecomendacoes(p: RecomendacoesParams = {}): Promise<Recomendacoes> {
  const { data } = await apiClient.get<Recomendacoes>("/api/v1/carteira/recomendacoes", {
    params: { yield_fii: p.yieldFii, yield_fiagro: p.yieldFiagro, alvo_fii: p.alvoFii },
  });
  return data;
}
