import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { BottomNav } from "./BottomNav";

describe("BottomNav", () => {
  it("renderiza as 5 abas", () => {
    render(
      <MemoryRouter>
        <BottomNav />
      </MemoryRouter>
    );
    for (const t of ["Início", "Carteira", "Análise", "IA", "Perfil"])
      expect(screen.getByText(t)).toBeInTheDocument();
  });
});
