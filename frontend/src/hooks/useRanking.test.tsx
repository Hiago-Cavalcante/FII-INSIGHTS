import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useRanking } from "./useRanking";
import * as rankingApi from "@/api/endpoints/ranking";
import type { RankingItem } from "@/types/ranking";

vi.mock("@/api/endpoints/ranking");

const ITEM: RankingItem = {
  ticker: "AAAA11", nome: "Fundo A", segmento: "Logística",
  score: 82.5, classificacao: "Excelente",
  dy_atual: 10, dy_12m: 10, p_vp: 0.92,
  vacancia_fisica: null, vacancia_financeira: null,
  liquidez_diaria: 18, volatilidade_12m: 8.5,
  patrimonio_liquido: 5, num_cotistas: 300,
};

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => vi.resetAllMocks());

describe("useRanking", () => {
  it("carrega o ranking do backend", async () => {
    vi.mocked(rankingApi.getRanking).mockResolvedValue([ITEM]);
    const { result } = renderHook(() => useRanking(), { wrapper });
    await waitFor(() => expect(result.current.fundos).toHaveLength(1));
    expect(result.current.fundos[0].ticker).toBe("AAAA11");
  });

  it("filtra por busca sem quebrar quando nome é null", async () => {
    vi.mocked(rankingApi.getRanking).mockResolvedValue([{ ...ITEM, nome: null }]);
    const { result } = renderHook(() => useRanking(), { wrapper });
    await waitFor(() => expect(result.current.fundos).toHaveLength(1));
    act(() => result.current.setBusca("zzz"));
    await waitFor(() => expect(result.current.fundos).toHaveLength(0));
  });

  it("expõe isError quando a API falha", async () => {
    vi.mocked(rankingApi.getRanking).mockRejectedValue(new Error("falhou"));
    const { result } = renderHook(() => useRanking(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("filtra por classificação", async () => {
    vi.mocked(rankingApi.getRanking).mockResolvedValue([
      ITEM,
      { ...ITEM, ticker: "BBBB11", classificacao: "Bom", score: 65 },
    ]);
    const { result } = renderHook(() => useRanking(), { wrapper });
    await waitFor(() => expect(result.current.fundos).toHaveLength(2));
    act(() => result.current.setFiltro("Bom"));
    await waitFor(() => expect(result.current.fundos).toHaveLength(1));
    expect(result.current.fundos[0].ticker).toBe("BBBB11");
  });
});
