import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getRanking, simularRanking } from "@/api/endpoints/ranking";
import { usePerfilStore } from "@/stores/perfilStore";
import type { RankingItem, PesosPayload } from "@/types/ranking";
import type { Classificacao } from "@/types/domain";

interface DashboardData {
  scoreMedio: number;
  totalFiis: number;
  topFiis: RankingItem[];
  distribuicao: Record<Classificacao, number>;
  isLoading: boolean;
  isError: boolean;
}

export function useDashboard(): DashboardData {
  const tipo = usePerfilStore((s) => s.tipo);
  const pesosCustom = usePerfilStore((s) => s.pesosCustom);

  const query = useQuery({
    queryKey: ["ranking", pesosCustom ?? tipo],
    queryFn: () =>
      pesosCustom
        ? simularRanking(pesosCustom as unknown as PesosPayload)
        : getRanking(tipo),
  });

  return useMemo(() => {
    const lista = query.data ?? [];
    const distribuicao: Record<Classificacao, number> = {
      Excelente: 0, Bom: 0, Regular: 0, Evitar: 0,
    };
    lista.forEach((f) => {
      if (f.classificacao in distribuicao) {
        distribuicao[f.classificacao as Classificacao]++;
      }
    });
    const scoreMedio =
      lista.length > 0
        ? Math.round((lista.reduce((a, f) => a + f.score, 0) / lista.length) * 10) / 10
        : 0;
    return {
      scoreMedio,
      totalFiis: lista.length,
      topFiis: lista.slice(0, 6),
      distribuicao,
      isLoading: query.isLoading,
      isError: query.isError,
    };
  }, [query.data, query.isLoading, query.isError]);
}
