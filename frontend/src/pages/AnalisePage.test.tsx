import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AnalisePage } from "./AnalisePage";

vi.mock("./RankingPage", () => ({ RankingPage: () => <div>RANKING</div> }));
vi.mock("./ClustersPage", () => ({ ClustersPage: () => <div>CLUSTERS</div> }));
vi.mock("./ComparadorPage", () => ({ ComparadorPage: () => <div>COMPARADOR</div> }));

describe("AnalisePage", () => {
  it("mostra Ranking por padrão e troca para Clusters", () => {
    render(<AnalisePage />);
    expect(screen.getByText("RANKING")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /clusters/i }));
    expect(screen.getByText("CLUSTERS")).toBeInTheDocument();
  });

  it("troca para a aba Comparar", () => {
    render(<AnalisePage />);
    fireEvent.click(screen.getByRole("tab", { name: /comparar/i }));
    expect(screen.getByText("COMPARADOR")).toBeInTheDocument();
  });
});
