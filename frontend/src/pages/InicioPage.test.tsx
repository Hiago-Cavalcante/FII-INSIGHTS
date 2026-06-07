import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { InicioPage } from "./InicioPage";

vi.mock("@/hooks/useCarteira", () => ({
  useCarteira: () => ({
    resumo: {
      total_investido: "12400.00",
      por_classe: { FII: "9400.00", FIAGRO: "3000.00" },
      num_posicoes: 4,
    },
    posicoes: [],
    isLoading: false,
    isError: false,
    aporte: { mutate: vi.fn() },
    remover: { mutate: vi.fn() },
  }),
}));
vi.mock("@/hooks/useDashboard", () => ({
  useDashboard: () => ({
    scoreMedio: 70,
    totalFiis: 50,
    topFiis: [
      { ticker: "HGLG11", nome: "CSHG Log", segmento: "Logística", score: 72, classificacao: "Bom" },
    ],
    distribuicao: { Excelente: 5, Bom: 20, Regular: 15, Evitar: 10 },
    isLoading: false,
    isError: false,
  }),
}));

describe("InicioPage", () => {
  it("mostra patrimônio e um destaque do ranking", () => {
    render(
      <MemoryRouter>
        <InicioPage />
      </MemoryRouter>
    );
    expect(screen.getByText("R$ 12.400,00")).toBeInTheDocument();
    expect(screen.getByText("HGLG11")).toBeInTheDocument();
  });
});
