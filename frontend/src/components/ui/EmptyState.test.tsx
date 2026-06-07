import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("renderiza título e descrição", () => {
    render(<EmptyState titulo="Em breve" descricao="Assistente de IA" />);
    expect(screen.getByText("Em breve")).toBeInTheDocument();
    expect(screen.getByText("Assistente de IA")).toBeInTheDocument();
  });
});
