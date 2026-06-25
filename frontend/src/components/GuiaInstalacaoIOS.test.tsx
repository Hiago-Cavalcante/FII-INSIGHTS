import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GuiaInstalacaoIOS } from "./GuiaInstalacaoIOS";

describe("GuiaInstalacaoIOS", () => {
  it("nao renderiza quando fechado", () => {
    render(<GuiaInstalacaoIOS aberto={false} onFechar={() => {}} />);
    expect(screen.queryByText(/adicionar à tela de início/i)).not.toBeInTheDocument();
  });

  it("mostra os 3 passos quando aberto", () => {
    render(<GuiaInstalacaoIOS aberto onFechar={() => {}} />);
    // Strings exatas dos títulos (únicas) para evitar colisão com as descrições.
    expect(screen.getByText("Toque em Compartilhar")).toBeInTheDocument();
    expect(screen.getByText("Adicionar à Tela de Início")).toBeInTheDocument();
    expect(screen.getByText("Confirme em Adicionar")).toBeInTheDocument();
  });

  it("chama onFechar ao tocar em Entendi", () => {
    const onFechar = vi.fn();
    render(<GuiaInstalacaoIOS aberto onFechar={onFechar} />);
    fireEvent.click(screen.getByRole("button", { name: /entendi/i }));
    expect(onFechar).toHaveBeenCalledTimes(1);
  });
});
