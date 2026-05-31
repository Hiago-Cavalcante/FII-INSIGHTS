import { useQuery } from "@tanstack/react-query";
import { getClusters } from "@/api/endpoints/clusters";
import type { ClusterItem } from "@/types/ranking";

export function useClusters() {
  const query = useQuery({ queryKey: ["clusters"], queryFn: getClusters });
  return {
    clusters: (query.data ?? []) as ClusterItem[],
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
