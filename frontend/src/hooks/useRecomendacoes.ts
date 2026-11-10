import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getRecomendacoes } from "@/api/endpoints/recomendacoes";

/** Recomendações da carteira (preço-teto + rebalanceamento) com parâmetros editáveis. */
export function useRecomendacoes() {
  const [yieldFii, setYieldFii] = useState(0.08);
  const [yieldFiagro, setYieldFiagro] = useState(0.13);
  const [alvoFii, setAlvoFii] = useState(0.8);

  const query = useQuery({
    queryKey: ["carteira", "recomendacoes", yieldFii, yieldFiagro, alvoFii],
    queryFn: () => getRecomendacoes({ yieldFii, yieldFiagro, alvoFii }),
    // Cada tecla muda a chave da query; sem isso a view inteira volta a "Carregando…"
    // e desmonta os campos, roubando o foco e o teclado no meio da digitação.
    placeholderData: keepPreviousData,
  });

  return {
    recomendacoes: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    yieldFii,
    setYieldFii,
    yieldFiagro,
    setYieldFiagro,
    alvoFii,
    setAlvoFii,
  };
}
