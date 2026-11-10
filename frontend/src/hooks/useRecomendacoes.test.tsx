import { it, expect, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useRecomendacoes } from "./useRecomendacoes";
import * as api from "@/api/endpoints/recomendacoes";

vi.mock("@/api/endpoints/recomendacoes");

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const RESPOSTA = {
  precos_teto: [],
  rebalanceamento: { total: "100.00", classes: [] },
} as unknown as Awaited<ReturnType<typeof api.getRecomendacoes>>;

beforeEach(() => vi.resetAllMocks());

it("mantém os dados anteriores enquanto recalcula com novos parâmetros (inputs não somem ao digitar)", async () => {
  vi.mocked(api.getRecomendacoes).mockResolvedValue(RESPOSTA);
  const { result } = renderHook(() => useRecomendacoes(), { wrapper });
  await waitFor(() => expect(result.current.recomendacoes).toBeDefined());

  act(() => result.current.setAlvoFii(0.85));

  // Logo após a troca do parâmetro, a tela não pode voltar ao estado "carregando".
  expect(result.current.isLoading).toBe(false);
  expect(result.current.recomendacoes).toBeDefined();
});
