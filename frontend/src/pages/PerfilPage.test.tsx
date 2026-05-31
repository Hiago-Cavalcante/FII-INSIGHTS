import { it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PerfilPage } from "./PerfilPage";
import * as rankingApi from "@/api/endpoints/ranking";

vi.mock("@/api/endpoints/ranking");

beforeEach(() => vi.resetAllMocks());

it("renderiza os 3 cards de perfil", () => {
  const qc = new QueryClient();
  vi.mocked(rankingApi.simularRanking).mockResolvedValue([]);
  render(
    <QueryClientProvider client={qc}>
      <PerfilPage />
    </QueryClientProvider>
  );
  expect(screen.getByText("Conservador")).toBeInTheDocument();
  expect(screen.getByText("Moderado")).toBeInTheDocument();
  expect(screen.getByText("Arrojado")).toBeInTheDocument();
});
