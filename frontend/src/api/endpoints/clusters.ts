import { apiClient } from "@/api/client";
import type { ClusterItem } from "@/types/ranking";

export async function getClusters(): Promise<ClusterItem[]> {
  const { data } = await apiClient.get<ClusterItem[]>("/api/v1/clusters");
  return data;
}
