import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { IndiceTours } from "./IndiceTours";
import { useTourStore } from "@/stores/tourStore";

beforeEach(() => useTourStore.setState({ tourAtivoId: null, tourPendenteId: null, vistos: [] }));

describe("IndiceTours", () => {
  it("lista todos os 10 tours como itens clicáveis", () => {
    render(
      <MemoryRouter>
        <IndiceTours />
      </MemoryRouter>
    );
    expect(screen.getAllByRole("button")).toHaveLength(10);
    expect(screen.getByText(/tela inicial/i)).toBeInTheDocument();
    expect(screen.getByText(/assistente de ia/i)).toBeInTheDocument();
  });
});
