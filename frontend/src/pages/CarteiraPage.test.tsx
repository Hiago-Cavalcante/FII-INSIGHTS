import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CarteiraPage } from "./CarteiraPage";

vi.mock("@/hooks/useCarteira", () => ({
  useCarteira: () => ({
    posicoes: [],
    resumo: { total_investido: "0.00", por_classe: {}, num_posicoes: 0 },
    isLoading: false,
    isError: false,
    aporte: { mutate: vi.fn(), isPending: false },
    remover: { mutate: vi.fn() },
    carregarExemplo: { mutate: vi.fn(), isPending: false },
    limpar: { mutate: vi.fn(), isPending: false },
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
vi.mock("@/components/carteira/SimuladorView", () => ({
  SimuladorView: () => <div>Renda mensal projetada</div>,
}));

describe("CarteiraPage abas", () => {
  it("troca para a aba Dividendos e mostra a renda mensal", () => {
    render(<MemoryRouter><CarteiraPage /></MemoryRouter>);
    expect(screen.getByText("Carregar carteira de exemplo")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Dividendos" }));
    expect(screen.getByText(/Renda mensal estimada/)).toBeInTheDocument();
  });

  it("troca para a aba Simulador", () => {
    render(<MemoryRouter><CarteiraPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole("tab", { name: "Simulador" }));
    expect(screen.getByText(/Renda mensal projetada/)).toBeInTheDocument();
  });
});
