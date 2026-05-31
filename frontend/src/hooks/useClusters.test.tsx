import { it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useClusters } from "./useClusters";
import * as clustersApi from "@/api/endpoints/clusters";

vi.mock("@/api/endpoints/clusters");

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => vi.resetAllMocks());

it("carrega clusters do backend", async () => {
  vi.mocked(clustersApi.getClusters).mockResolvedValue([
    {
      id: 1, nome_interpretado: "Tijolo Conservador", perfil_risco: "conservador",
      descricao: "desc", dy_medio: 0.08, volatilidade_media: 0.09,
      p_vp_medio: 0.9, num_fiis: 12, tickers: ["AAAA11", "BBBB11"],
    },
  ]);
  const { result } = renderHook(() => useClusters(), { wrapper });
  await waitFor(() => expect(result.current.clusters).toHaveLength(1));
  expect(result.current.clusters[0].nome_interpretado).toBe("Tijolo Conservador");
});
