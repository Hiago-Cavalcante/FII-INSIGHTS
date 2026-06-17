import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { OnboardingPage } from "./OnboardingPage";
import { usePerfilStore } from "@/stores/perfilStore";

beforeEach(() => {
  usePerfilStore.setState({ tipo: "moderado", objetivo: null, horizonte: null, pesosCustom: null });
});

describe("OnboardingPage", () => {
  it("classifica como conservador ao escolher as respostas mais cautelosas", () => {
    render(
      <MemoryRouter>
        <OnboardingPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText("Em até 2 anos"));
    fireEvent.click(screen.getByText("Renda mensal estável e previsível"));
    fireEvent.click(screen.getByText("Venderia para evitar perdas maiores"));
    fireEvent.click(screen.getByText("Estou começando agora"));
    fireEvent.click(screen.getByRole("button", { name: "Ver meu perfil" }));

    expect(screen.getByText("Conservador")).toBeInTheDocument();
    expect(usePerfilStore.getState().tipo).toBe("conservador");
    expect(usePerfilStore.getState().horizonte).toBe("curto");
    expect(usePerfilStore.getState().objetivo).toBe("renda");
  });
});
