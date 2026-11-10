import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { InicioPage } from "./InicioPage";

// Estado em que nada chegou ainda do servidor (carregando) e o ranking falhou.
vi.mock("@/hooks/useCarteira", () => ({
  useCarteira: () => ({ resumo: undefined, posicoes: [], isLoading: true, isError: false }),
}));
vi.mock("@/hooks/useDashboard", () => ({
  useDashboard: () => ({ topFiis: [], isLoading: false, isError: true }),
}));
vi.mock("@/hooks/useDividendos", () => ({
  useDividendos: () => ({ dividendos: undefined, isLoading: true, isError: false }),
}));

describe("InicioPage — estados de carregamento e erro", () => {
  it("não mostra R$ 0,00 enquanto o patrimônio ainda está carregando", () => {
    render(
      <MemoryRouter>
        <InicioPage />
      </MemoryRouter>
    );
    expect(screen.queryByText(/R\$\s*0,00/)).not.toBeInTheDocument();
    expect(screen.getAllByTestId("carregando").length).toBeGreaterThan(0);
  });

  it("avisa quando os destaques não puderam ser carregados", () => {
    render(
      <MemoryRouter>
        <InicioPage />
      </MemoryRouter>
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/destaques/i);
  });
});
