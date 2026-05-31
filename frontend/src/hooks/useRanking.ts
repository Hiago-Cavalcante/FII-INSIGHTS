import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getRanking, simularRanking } from "@/api/endpoints/ranking";
import { usePerfilStore } from "@/stores/perfilStore";
import type { RankingItem } from "@/types/ranking";
import type { Classificacao } from "@/types/domain";
import type { PesosPayload } from "@/types/ranking";

interface UseRankingResult {
  fundos: RankingItem[];
  isLoading: boolean;
  isError: boolean;
  filtro: Classificacao | "Todas";
  setFiltro: (f: Classificacao | "Todas") => void;
  busca: string;
  setBusca: (b: string) => void;
}

export function useRanking(): UseRankingResult {
  const tipo = usePerfilStore((s) => s.tipo);
  const pesosCustom = usePerfilStore((s) => s.pesosCustom);
  const [filtro, setFiltro] = useState<Classificacao | "Todas">("Todas");
  const [busca, setBusca] = useState("");

  const query = useQuery({
    queryKey: ["ranking", pesosCustom ?? tipo],
    queryFn: () =>
      // PesosIndicadores usa nomes curtos (liquidez, volatilidade, pl, cotistas)
      // PesosPayload usa nomes longos (liquidez_diaria, volatilidade_12m, etc.)
      // O alinhamento de chaves ocorre em task posterior; por ora cast via unknown
      pesosCustom ? simularRanking(pesosCustom as unknown as PesosPayload) : getRanking(tipo),
  });

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

  return {
    fundos,
    isLoading: query.isLoading,
    isError: query.isError,
    filtro,
    setFiltro,
    busca,
    setBusca,
  };
}
