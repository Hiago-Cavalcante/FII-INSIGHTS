import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";

vi.mock("@/pages/InicioPage", () => ({ InicioPage: () => <div>INICIO</div> }));
vi.mock("@/pages/LoginPage", () => ({ LoginPage: () => <div>LOGIN</div> }));
vi.mock("@/components/layout/BottomNav", () => ({ BottomNav: () => <nav /> }));

import { AppRoutes } from "./App";

function renderEm(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => useAuthStore.getState().logout());

describe("auth-everywhere", () => {
  it("rota raiz sem token redireciona para login", () => {
    renderEm("/");
    expect(screen.getByText("LOGIN")).toBeInTheDocument();
  });
  it("rota raiz com token mostra Início", () => {
    useAuthStore.getState().setAuth("t", { id: 1, email: "a@b.com" });
    renderEm("/");
    expect(screen.getByText("INICIO")).toBeInTheDocument();
  });
});
