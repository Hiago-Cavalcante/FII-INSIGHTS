import { apiClient } from "@/api/client";
import type { TipoPerfil } from "@/types/domain";
import type { RankingItem, PesosPayload } from "@/types/ranking";

export async function getRanking(perfil: TipoPerfil): Promise<RankingItem[]> {
  const { data } = await apiClient.get<RankingItem[]>("/api/v1/ranking", {
    params: { perfil },
  });
  return data;
}

export async function simularRanking(pesos: PesosPayload): Promise<RankingItem[]> {
  const { data } = await apiClient.post<RankingItem[]>("/api/v1/ranking/simular", {
    pesos,
  });
  return data;
}
