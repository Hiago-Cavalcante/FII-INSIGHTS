import { useQuery } from "@tanstack/react-query";
import { getDividendos, type Dividendos } from "@/api/endpoints/dividendos";

export function useDividendos() {
  const query = useQuery({ queryKey: ["carteira", "dividendos"], queryFn: getDividendos });
  return {
    dividendos: query.data as Dividendos | undefined,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
