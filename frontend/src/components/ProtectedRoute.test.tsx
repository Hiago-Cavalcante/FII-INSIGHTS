import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { useAuthStore } from "@/stores/authStore";

function renderEm(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/carteira" element={<div>Carteira privada</div>} />
        </Route>
        <Route path="/login" element={<div>Tela de login</div>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => useAuthStore.getState().logout());

describe("ProtectedRoute", () => {
  it("redireciona para /login sem token", () => {
    renderEm("/carteira");
    expect(screen.getByText("Tela de login")).toBeInTheDocument();
  });

  it("renderiza o conteúdo com token", () => {
    useAuthStore.getState().setAuth("tok", { id: 1, email: "a@b.com" });
    renderEm("/carteira");
    expect(screen.getByText("Carteira privada")).toBeInTheDocument();
  });
});
