import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useDashboard } from "./useDashboard";
import * as rankingApi from "@/api/endpoints/ranking";
import type { RankingItem } from "@/types/ranking";

vi.mock("@/api/endpoints/ranking");

const mk = (
  ticker: string,
  score: number,
  cls: RankingItem["classificacao"],
): RankingItem => ({
  ticker, nome: ticker, segmento: "Logística", classe: "FII", score, classificacao: cls,
  dy_atual: 10, dy_12m: 10, p_vp: 0.9,
  vacancia_fisica: null, vacancia_financeira: null,
  liquidez_diaria: 10, volatilidade_12m: 9,
  patrimonio_liquido: 3, num_cotistas: 200,
});

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => vi.resetAllMocks());

describe("useDashboard", () => {
  it("deriva média, distribuição e top 6", async () => {
    vi.mocked(rankingApi.getRanking).mockResolvedValue([
      mk("A", 90, "Excelente"), mk("B", 50, "Regular"),
    ]);
    const { result } = renderHook(() => useDashboard(), { wrapper });
    await waitFor(() => expect(result.current.totalFiis).toBe(2));
    expect(result.current.scoreMedio).toBe(70);
    expect(result.current.distribuicao.Excelente).toBe(1);
    expect(result.current.distribuicao.Regular).toBe(1);
    expect(result.current.topFiis[0].ticker).toBe("A");
  });

  it("expõe isError quando a API falha", async () => {
    vi.mocked(rankingApi.getRanking).mockRejectedValue(new Error("falhou"));
    const { result } = renderHook(() => useDashboard(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
