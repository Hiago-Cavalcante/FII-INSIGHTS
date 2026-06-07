import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MoneyValue } from "./MoneyValue";

describe("MoneyValue", () => {
  it("formata string decimal como R$ pt-BR", () => {
    render(<MoneyValue valor="1000.00" />);
    expect(screen.getByText("R$ 1.000,00")).toBeInTheDocument();
  });
});
