import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ClustersPage } from "./ClustersPage";
import * as clustersHook from "@/hooks/useClusters";

vi.mock("@/hooks/useClusters");
vi.mock("@/hooks/useRegistrarTour", () => ({ useRegistrarTour: () => undefined }));

const BASE = {
  descricao: "DY médio: 10.8%, P/VP médio: 0.96",
  perfil_risco: "conservador",
};

beforeEach(() => {
  vi.mocked(clustersHook.useClusters).mockReturnValue({
    clusters: [
      { ...BASE, id: 1, nome_interpretado: "Tijolo Conservador", dy_medio: 0.108, volatilidade_media: 0.094, p_vp_medio: 0.96, num_fiis: 17, tickers: ["HGLG11"] },
      { ...BASE, id: 2, nome_interpretado: "Papel Agressivo", perfil_risco: "arrojado", dy_medio: 0.555, volatilidade_media: 0.69, p_vp_medio: 0.25, num_fiis: 1, tickers: ["CACR11"] },
    ],
    isLoading: false,
    isError: false,
  } as unknown as ReturnType<typeof clustersHook.useClusters>);
});

describe("ClustersPage — metadados fiéis ao modelo", () => {
  it("informa 4 indicadores e a amostra real (soma dos grupos, FII e FIAGRO)", () => {
    render(<ClustersPage />);
    expect(screen.getByText("4 indicadores")).toBeInTheDocument();
    expect(screen.getByText("18 fundos (FII e FIAGRO)")).toBeInTheDocument();
    expect(screen.queryByText(/Top 50/)).not.toBeInTheDocument();
    expect(screen.queryByText(/5 indicadores/)).not.toBeInTheDocument();
  });

  it("conta fundos (não 'FIIs') e usa vírgula decimal", () => {
    render(<ClustersPage />);
    expect(screen.getByText(/17 fundos/)).toBeInTheDocument();
    expect(screen.getByText("10,8%")).toBeInTheDocument();
    expect(screen.getByText("0,96")).toBeInTheDocument();
  });
});
