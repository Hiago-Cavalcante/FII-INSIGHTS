import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RecomendacoesView } from "./RecomendacoesView";

vi.mock("@/hooks/useRecomendacoes", () => ({
  useRecomendacoes: () => ({
    recomendacoes: {
      precos_teto: [],
      rebalanceamento: {
        classes: [{ classe: "FII", sugestao: "Equilibrado", atual_pct: 0.5, alvo_pct: 0.5 }],
      },
    },
    isLoading: false,
    isError: false,
    yieldFii: 0.08,
    setYieldFii: vi.fn(),
    yieldFiagro: 0.13,
    setYieldFiagro: vi.fn(),
    alvoFii: 0.8,
    setAlvoFii: vi.fn(),
  }),
}));

describe("RecomendacoesView (PercentInput)", () => {
  it("permite esvaziar o campo de percentual (Alvo em FII)", () => {
    render(<RecomendacoesView />);
    const alvo = screen.getByRole("spinbutton", { name: /alvo em fii/i });
    fireEvent.change(alvo, { target: { value: "" } });
    // campo numérico vazio reporta value null; não pode travar no número.
    expect(alvo).toHaveValue(null);
  });
});
