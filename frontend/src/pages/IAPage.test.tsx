import { it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { IAPage } from "./IAPage";

it("anuncia o assistente em breve", () => {
  render(<IAPage />);
  expect(screen.getByText(/em breve/i)).toBeInTheDocument();
});
