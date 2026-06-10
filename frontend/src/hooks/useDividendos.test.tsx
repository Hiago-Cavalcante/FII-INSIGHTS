import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useDividendos } from "./useDividendos";
import * as api from "@/api/endpoints/dividendos";

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("useDividendos", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("retorna a projeção de dividendos", async () => {
    vi.spyOn(api, "getDividendos").mockResolvedValue({
      renda_mensal: "11.00",
      renda_anual: "132.00",
      yield_on_cost: 0.132,
      por_fundo: [{ ticker: "HGLG11", renda_mensal: "11.00", percentual: 1, sem_dados: false }],
    });
    const { result } = renderHook(() => useDividendos(), { wrapper });
    await waitFor(() => expect(result.current.dividendos?.renda_mensal).toBe("11.00"));
  });
});
