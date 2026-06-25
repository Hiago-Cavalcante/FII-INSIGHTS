import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SimuladorView } from "./SimuladorView";
import { useSimuladorStore } from "@/stores/simuladorStore";

vi.mock("@/hooks/useCarteira", () => ({
  useCarteira: () => ({ resumo: { total_investido: "10000.00", por_classe: {}, num_posicoes: 1 } }),
}));
vi.mock("@/hooks/useDividendos", () => ({
  useDividendos: () => ({
    dividendos: { renda_mensal: "100.00", renda_anual: "1200.00", yield_on_cost: 0.12, por_fundo: [] },
    isLoading: false,
    isError: false,
  }),
}));

describe("SimuladorView", () => {
  beforeEach(() => useSimuladorStore.setState({ aporteMensal: 0, meses: 120, rendaAlvo: null }));

  it("renderiza a renda projetada e reage à mudança de aporte", () => {
    render(<SimuladorView />);
    expect(screen.getByText(/Renda mensal projetada/i)).toBeInTheDocument();
    const aporte = screen.getByLabelText("Aporte mensal");
    fireEvent.change(aporte, { target: { value: "2000" } });
    expect(useSimuladorStore.getState().aporteMensal).toBe(2000);
  });

  it("permite esvaziar o campo de aporte (não trava em 0)", () => {
    useSimuladorStore.setState({ aporteMensal: 2000 });
    render(<SimuladorView />);
    const aporte = screen.getByLabelText("Aporte mensal");
    fireEvent.change(aporte, { target: { value: "" } });
    // input numérico vazio reporta value null; o store guarda null (não 0).
    expect(aporte).toHaveValue(null);
    expect(useSimuladorStore.getState().aporteMensal).toBeNull();
  });
});
