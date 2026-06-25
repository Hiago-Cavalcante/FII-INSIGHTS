import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { IAPage } from "./IAPage";

const mutateMock = vi.fn();
vi.mock("@/hooks/useAssistente", () => ({
  useAssistente: () => ({ mutate: mutateMock, isPending: false }),
}));

beforeEach(() => mutateMock.mockReset());

describe("IAPage (chat)", () => {
  it("mostra o aviso de beta", () => {
    render(<IAPage />);
    expect(screen.getByText(/beta/i)).toBeInTheDocument();
  });

  it("envia a pergunta chamando o assistente com historico e nivel", () => {
    render(<IAPage />);
    fireEvent.change(screen.getByPlaceholderText(/pergunte sobre fiis/i), {
      target: { value: "O que é DY?" },
    });
    fireEvent.click(screen.getByRole("button", { name: /enviar/i }));
    expect(mutateMock).toHaveBeenCalledTimes(1);
    expect(mutateMock.mock.calls[0][0]).toEqual({
      mensagem: "O que é DY?",
      historico: [],
      nivel: "iniciante",
    });
    expect(screen.getByText("O que é DY?")).toBeInTheDocument();
  });

  it("rola para o input ao focar (teclado nao cobre)", () => {
    const scrollSpy = vi.fn();
    // jsdom nao implementa scrollIntoView; instala um mock no protótipo.
    Element.prototype.scrollIntoView = scrollSpy;
    render(<IAPage />);
    // Descarta a chamada do efeito de montagem para isolar o comportamento do focus.
    scrollSpy.mockClear();
    fireEvent.focus(screen.getByPlaceholderText(/pergunte sobre fiis/i));
    expect(scrollSpy).toHaveBeenCalled();
  });
});
