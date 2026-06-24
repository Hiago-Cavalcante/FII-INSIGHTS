import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { IndiceTours } from "./IndiceTours";
import { useTourStore } from "@/stores/tourStore";

beforeEach(() => useTourStore.setState({ tourAtivoId: null, tourPendenteId: null, vistos: [] }));

function renderIndice() {
  render(
    <MemoryRouter>
      <IndiceTours />
    </MemoryRouter>
  );
}

describe("IndiceTours", () => {
  it("começa colapsado: os tours não aparecem", () => {
    renderIndice();
    expect(screen.queryByText(/tela inicial/i)).toBeNull();
    expect(
      screen.getByRole("button", { name: /aprenda enquanto investe/i })
    ).toBeInTheDocument();
  });

  it("expande ao tocar no cabeçalho e lista os 10 tours", () => {
    renderIndice();
    fireEvent.click(screen.getByRole("button", { name: /aprenda enquanto investe/i }));
    expect(screen.getByText(/tela inicial/i)).toBeInTheDocument();
    expect(screen.getByText(/assistente de ia/i)).toBeInTheDocument();
    // 1 cabeçalho + 10 tours
    expect(screen.getAllByRole("button")).toHaveLength(11);
  });
});
