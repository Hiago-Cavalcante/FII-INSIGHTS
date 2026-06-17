import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RankingPage } from "./RankingPage";
import * as rankingHook from "@/hooks/useRanking";
import type { RankingItem } from "@/types/ranking";

vi.mock("@/hooks/useRanking");

const ITEM: RankingItem = {
  ticker: "HGLG11",
  nome: "CSHG Logística",
  segmento: "Logística",
  classe: "FII",
  score: 97,
  classificacao: "Excelente",
  dy_atual: 8.7,
  dy_12m: 9.9,
  p_vp: 0.91,
  vacancia_fisica: null,
  vacancia_financeira: null,
  liquidez_diaria: 18,
  volatilidade_12m: 7.6,
  patrimonio_liquido: 7.2,
  num_cotistas: 300,
};

function mockRanking(fundos: RankingItem[]) {
  vi.mocked(rankingHook.useRanking).mockReturnValue({
    fundos,
    isLoading: false,
    isError: false,
    filtro: "Todas",
    setFiltro: vi.fn(),
    busca: "",
    setBusca: vi.fn(),
  });
}

beforeEach(() => vi.resetAllMocks());

describe("RankingPage — detalhe expansível no mobile", () => {
  it("esconde métricas extras (DY 12m) até a linha ser expandida", () => {
    mockRanking([ITEM]);
    render(<RankingPage />);

    // Colapsado: o painel de detalhe não está renderizado.
    expect(screen.queryByText(/DY 12m/i)).not.toBeInTheDocument();

    // Expande a linha.
    fireEvent.click(screen.getByRole("button", { name: /detalhes de HGLG11/i }));
    expect(screen.getByText(/DY 12m/i)).toBeInTheDocument();

    // Recolhe novamente.
    fireEvent.click(screen.getByRole("button", { name: /detalhes de HGLG11/i }));
    expect(screen.queryByText(/DY 12m/i)).not.toBeInTheDocument();
  });

  it("expande cada linha de forma independente", () => {
    mockRanking([ITEM, { ...ITEM, ticker: "BBBB11", nome: "Fundo B" }]);
    render(<RankingPage />);

    fireEvent.click(screen.getByRole("button", { name: /detalhes de HGLG11/i }));

    expect(screen.getByTestId("detalhe-HGLG11")).toBeInTheDocument();
    expect(screen.queryByTestId("detalhe-BBBB11")).not.toBeInTheDocument();
  });
});
