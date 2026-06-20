import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useCarteira } from "./useCarteira";
import * as carteiraApi from "@/api/endpoints/carteira";
import { CARTEIRA_EXEMPLO } from "@/lib/carteiraExemplo";

vi.mock("@/api/endpoints/carteira");

function mockCarteiraVazia() {
  vi.mocked(carteiraApi.listarPosicoes).mockResolvedValue([]);
  vi.mocked(carteiraApi.getResumo).mockResolvedValue({
    total_investido: "0.00",
    por_classe: {},
    num_posicoes: 0,
  });
}

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => vi.resetAllMocks());

describe("useCarteira", () => {
  it("carrega posições e resumo", async () => {
    vi.mocked(carteiraApi.listarPosicoes).mockResolvedValue([
      { id: 1, ticker: "HGLG11", nome: "CSHG Log", classe: "FII", quantidade: 10, preco_medio: "100.00", valor_investido: "1000.00" },
    ]);
    vi.mocked(carteiraApi.getResumo).mockResolvedValue({
      total_investido: "1000.00", por_classe: { FII: "1000.00", FIAGRO: "0.00" }, num_posicoes: 1,
    });
    const { result } = renderHook(() => useCarteira(), { wrapper });
    await waitFor(() => expect(result.current.posicoes).toHaveLength(1));
    expect(result.current.posicoes[0].ticker).toBe("HGLG11");
  });

  it("carregarExemplo registra um aporte para cada fundo do exemplo", async () => {
    mockCarteiraVazia();
    vi.mocked(carteiraApi.criarAporte).mockResolvedValue({} as carteiraApi.Posicao);
    const { result } = renderHook(() => useCarteira(), { wrapper });

    result.current.carregarExemplo.mutate();

    await waitFor(() =>
      expect(carteiraApi.criarAporte).toHaveBeenCalledTimes(CARTEIRA_EXEMPLO.length)
    );
    expect(carteiraApi.criarAporte).toHaveBeenCalledWith(CARTEIRA_EXEMPLO[0]);
  });

  it("limpar remove todas as posições informadas", async () => {
    mockCarteiraVazia();
    vi.mocked(carteiraApi.removerPosicao).mockResolvedValue();
    const { result } = renderHook(() => useCarteira(), { wrapper });

    result.current.limpar.mutate([1, 2, 3]);

    await waitFor(() => expect(carteiraApi.removerPosicao).toHaveBeenCalledTimes(3));
    expect(carteiraApi.removerPosicao).toHaveBeenCalledWith(1);
  });
});
