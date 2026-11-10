import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ComparadorPage } from "./ComparadorPage";
import * as rankingHook from "@/hooks/useRanking";
import type { RankingItem } from "@/types/ranking";

vi.mock("@/hooks/useRanking");
vi.mock("@/hooks/useRegistrarTour", () => ({ useRegistrarTour: () => undefined }));

const FUNDO: RankingItem = {
  ticker: "KNRI11",
  nome: "Kinea Renda Imobiliária",
  segmento: "Lajes Corporativas",
  classe: "FII",
  score: 92,
  classificacao: "Excelente",
  dy_atual: 8,
  dy_12m: 9,
  p_vp: 0.94,
  vacancia_fisica: null,
  vacancia_financeira: null,
  liquidez_diaria: 10,
  volatilidade_12m: 8,
  patrimonio_liquido: 4,
  num_cotistas: 200,
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(rankingHook.useRankingDados).mockReturnValue({
    data: [FUNDO],
    isLoading: false,
    isError: false,
  } as unknown as ReturnType<typeof rankingHook.useRankingDados>);
});

describe("ComparadorPage — busca", () => {
  it("avisa quando a busca não encontra nenhum fundo", () => {
    render(<ComparadorPage />);
    fireEvent.change(screen.getByLabelText("Buscar fundo para comparar"), { target: { value: "zzzz" } });
    expect(screen.getByText("Nenhum fundo encontrado para “zzzz”.")).toBeInTheDocument();
  });

  it("o fundo selecionado vira um chip removível com nome acessível", () => {
    render(<ComparadorPage />);
    fireEvent.change(screen.getByLabelText("Buscar fundo para comparar"), { target: { value: "knri" } });
    fireEvent.click(screen.getByRole("option", { name: /KNRI11/ }));
    fireEvent.click(screen.getByRole("button", { name: "Remover KNRI11" }));
    expect(screen.queryByRole("button", { name: "Remover KNRI11" })).not.toBeInTheDocument();
  });
});
