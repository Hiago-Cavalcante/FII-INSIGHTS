import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CarteiraPage } from "./CarteiraPage";

vi.mock("@/hooks/useCarteira", () => ({
  useCarteira: () => ({
    posicoes: [
      {
        id: 1,
        ticker: "HGLG11",
        nome: "CSHG Log",
        classe: "FII",
        quantidade: 10,
        preco_medio: "100.00",
        valor_investido: "1000.00",
      },
    ],
    resumo: {
      total_investido: "1000.00",
      por_classe: { FII: "1000.00", FIAGRO: "0.00" },
      num_posicoes: 1,
    },
    isLoading: false,
    isError: false,
    aporte: { mutate: vi.fn(), isPending: false },
    remover: { mutate: vi.fn(), isPending: false },
  }),
}));

describe("CarteiraPage", () => {
  it("lista a posição com ticker, quantidade e valor", () => {
    render(<CarteiraPage />);
    expect(screen.getByText("HGLG11")).toBeInTheDocument();
    expect(screen.getByText(/10 cotas/)).toBeInTheDocument();
    // o valor formatado (R$ 1.000,00) aparece no resumo e na posição — basta haver ao menos um
    expect(screen.getAllByText(/1\.000,00/).length).toBeGreaterThan(0);
  });

  it("mostra o formulário de aporte", () => {
    render(<CarteiraPage />);
    expect(screen.getByLabelText(/ticker/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/quantidade/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /adicionar/i })).toBeInTheDocument();
  });
});
