import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BotaoAjuda } from "./BotaoAjuda";
import { useTourStore } from "@/stores/tourStore";

beforeEach(() => useTourStore.setState({ tourAtivoId: null, tourPendenteId: null, vistos: [] }));

describe("BotaoAjuda", () => {
  it("não renderiza nada quando não há tour para a tela", () => {
    render(<BotaoAjuda />);
    expect(screen.queryByRole("button", { name: /ajuda|guia/i })).toBeNull();
  });
  it("renderiza o botão de ajuda quando há tour ativo registrado", () => {
    useTourStore.setState({ tourAtivoId: "inicio" });
    render(<BotaoAjuda />);
    expect(screen.getByRole("button", { name: /ajuda|guia/i })).toBeInTheDocument();
  });
});
