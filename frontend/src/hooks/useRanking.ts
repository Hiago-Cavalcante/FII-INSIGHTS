import { useMemo, useState } from "react";
import { FUNDOS_MOCK } from "@/mocks";
import { calcularScore, calcularScoreComPesos, classificar } from "@/lib/scoring";
import { usePerfilStore } from "@/stores/perfilStore";
import type { FundoRanqueado, Classificacao } from "@/types/domain";

interface UseRankingResult {
  fundos: FundoRanqueado[];
  filtro: Classificacao | "Todas";
  setFiltro: (f: Classificacao | "Todas") => void;
  busca: string;
  setBusca: (b: string) => void;
}

export function useRanking(): UseRankingResult {
  const perfil = usePerfilStore((s) => s.tipo);
  const pesosCustom = usePerfilStore((s) => s.pesosCustom);
  const [filtro, setFiltro] = useState<Classificacao | "Todas">("Todas");
  const [busca, setBusca] = useState("");

  const fundos = useMemo(() => {
    const ranqueados: FundoRanqueado[] = FUNDOS_MOCK.map((f) => {
      const score = pesosCustom
        ? calcularScoreComPesos(f, pesosCustom)
        : calcularScore(f, perfil);
      return { ...f, score, classificacao: classificar(score) };
    }).sort((a, b) => b.score - a.score);

    return ranqueados.filter((f) => {
      const passaFiltro = filtro === "Todas" || f.classificacao === filtro;
      const passaBusca =
        busca === "" ||
        f.ticker.toLowerCase().includes(busca.toLowerCase()) ||
        f.nome.toLowerCase().includes(busca.toLowerCase());
      return passaFiltro && passaBusca;
    });
  }, [perfil, pesosCustom, filtro, busca]);

  return { fundos, filtro, setFiltro, busca, setBusca };
}
