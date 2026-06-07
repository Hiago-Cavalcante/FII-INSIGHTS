import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { IndicadorExplain } from "./IndicadorExplain";

describe("IndicadorExplain", () => {
  it("mostra rótulo e valor; explicação só após clicar", () => {
    render(<IndicadorExplain chave="dy_atual" rotulo="DY" valor="9,2%" />);
    expect(screen.getByText("DY")).toBeInTheDocument();
    expect(screen.getByText("9,2%")).toBeInTheDocument();
    expect(screen.queryByText(/rendimento por ano/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /explicar dy/i }));
    expect(screen.getByText(/rendimento por ano/i)).toBeInTheDocument();
  });
});
