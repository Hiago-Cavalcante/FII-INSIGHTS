import { useMemo } from "react";
import { FUNDOS_MOCK } from "@/mocks";
import { calcularScore, calcularScoreComPesos, classificar } from "@/lib/scoring";
import { usePerfilStore } from "@/stores/perfilStore";
import type { FundoRanqueado, Classificacao } from "@/types/domain";

interface DashboardData {
  scoreMedio: number;
  totalFiis: number;
  topFiis: FundoRanqueado[];
  distribuicao: Record<Classificacao, number>;
}

export function useDashboard(): DashboardData {
  const perfil = usePerfilStore((s) => s.tipo);
  const pesosCustom = usePerfilStore((s) => s.pesosCustom);

  return useMemo(() => {
    const ranqueados: FundoRanqueado[] = FUNDOS_MOCK.map((f) => {
      const score = pesosCustom
        ? calcularScoreComPesos(f, pesosCustom)
        : calcularScore(f, perfil);
      return { ...f, score, classificacao: classificar(score) };
    }).sort((a, b) => b.score - a.score);

    const scoreMedio =
      ranqueados.reduce((acc, f) => acc + f.score, 0) / ranqueados.length;

    const distribuicao: Record<Classificacao, number> = {
      Excelente: 0,
      Bom: 0,
      Regular: 0,
      Evitar: 0,
    };
    ranqueados.forEach((f) => distribuicao[f.classificacao]++);

    return {
      scoreMedio: Math.round(scoreMedio * 10) / 10,
      totalFiis: ranqueados.length,
      topFiis: ranqueados.slice(0, 6),
      distribuicao,
    };
  }, [perfil, pesosCustom]);
}
