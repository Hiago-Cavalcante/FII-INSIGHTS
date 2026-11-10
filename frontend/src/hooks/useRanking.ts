import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getRanking, simularRanking } from "@/api/endpoints/ranking";
import { usePerfilStore } from "@/stores/perfilStore";
import type { RankingItem } from "@/types/ranking";
import type { Classificacao } from "@/types/domain";
import { posicoesPorScore } from "@/lib/ranking";

interface UseRankingResult {
  fundos: RankingItem[];
  /** Posição de cada ticker no ranking geral (antes de filtro e busca). */
  posicoes: Map<string, number>;
  isLoading: boolean;
  isError: boolean;
  filtro: Classificacao | "Todas";
  setFiltro: (f: Classificacao | "Todas") => void;
  busca: string;
  setBusca: (b: string) => void;
}

/**
 * Ranking completo segundo o perfil ativo — pesos personalizados têm prioridade.
 * Fonte única para Ranking e Comparador, para o mesmo fundo nunca ter dois scores.
 */
export function useRankingDados() {
  const tipo = usePerfilStore((s) => s.tipo);
  const pesosCustom = usePerfilStore((s) => s.pesosCustom);
  return useQuery({
    queryKey: ["ranking", pesosCustom ?? tipo],
    queryFn: () => (pesosCustom ? simularRanking(pesosCustom) : getRanking(tipo)),
  });
}

export function useRanking(): UseRankingResult {
  const [filtro, setFiltro] = useState<Classificacao | "Todas">("Todas");
  const [busca, setBusca] = useState("");

  const query = useRankingDados();

  const fundos = useMemo(() => {
    const lista = query.data ?? [];
    return lista.filter((f) => {
      const passaFiltro = filtro === "Todas" || f.classificacao === filtro;
      const termo = busca.toLowerCase();
      const passaBusca =
        busca === "" ||
        f.ticker.toLowerCase().includes(termo) ||
        (f.nome ?? "").toLowerCase().includes(termo);
      return passaFiltro && passaBusca;
    });
  }, [query.data, filtro, busca]);

  const posicoes = useMemo(() => posicoesPorScore(query.data ?? []), [query.data]);

  return {
    fundos,
    posicoes,
    isLoading: query.isLoading,
    isError: query.isError,
    filtro,
    setFiltro,
    busca,
    setBusca,
  };
}
