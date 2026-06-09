import { useQuery } from "@tanstack/react-query";
import { getDividendos } from "@/api/endpoints/dividendos";

export function useDividendos() {
  const query = useQuery({ queryKey: ["carteira", "dividendos"], queryFn: getDividendos });
  return {
    dividendos: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
