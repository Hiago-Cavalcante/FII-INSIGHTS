import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ClasseBadge } from "./ClasseBadge";

describe("ClasseBadge", () => {
  it("mostra FII", () => {
    render(<ClasseBadge classe="FII" />);
    expect(screen.getByText("FII")).toBeInTheDocument();
  });
  it("mostra FIAGRO", () => {
    render(<ClasseBadge classe="FIAGRO" />);
    expect(screen.getByText("FIAGRO")).toBeInTheDocument();
  });
});
