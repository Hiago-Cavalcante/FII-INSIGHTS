import { it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { IAPage } from "./IAPage";

vi.mock("@/hooks/useRanking", () => ({
  useRanking: () => ({
    fundos: [{ ticker: "HGLG11", nome: "CSHG Log", classe: "FII", score: 90, classificacao: "Excelente" }],
    isLoading: false,
    isError: false,
    filtro: "Todas",
    setFiltro: () => {},
    busca: "",
    setBusca: () => {},
  }),
}));

vi.mock("@/hooks/useAssistente", () => ({
  useAssistente: () => ({ mutate: vi.fn(), reset: vi.fn(), data: undefined, isPending: false, isError: false }),
}));

it("renderiza o assistente com seletor de fundo ancorado nos dados", () => {
  render(<IAPage />);
  expect(screen.getByPlaceholderText(/escolha um fundo/i)).toBeInTheDocument();
  expect(screen.getByText(/ancorado nos dados/i)).toBeInTheDocument();
});
