import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CarteiraPage } from "./CarteiraPage";

vi.mock("@/hooks/useCarteira", () => ({
  useCarteira: () => ({
    posicoes: [],
    resumo: { total_investido: "0.00", por_classe: {}, num_posicoes: 0 },
    isLoading: false,
    isError: false,
    aporte: { mutate: vi.fn(), isPending: false },
    remover: { mutate: vi.fn() },
  }),
}));
vi.mock("@/hooks/useDividendos", () => ({
  useDividendos: () => ({
    dividendos: {
      renda_mensal: "11.00",
      renda_anual: "132.00",
      yield_on_cost: 0.132,
      por_fundo: [
        { ticker: "HGLG11", renda_mensal: "11.00", percentual: 1, sem_dados: false },
      ],
    },
    isLoading: false,
    isError: false,
  }),
}));

describe("CarteiraPage abas", () => {
  it("troca para a aba Dividendos e mostra a renda mensal", () => {
    render(<CarteiraPage />);
    expect(screen.getByText("Registrar aporte")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Dividendos" }));
    expect(screen.getByText(/Renda mensal estimada/)).toBeInTheDocument();
  });
});
