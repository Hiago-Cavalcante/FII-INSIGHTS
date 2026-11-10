import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorState } from "./ErrorState";

describe("ErrorState", () => {
  it("usa linguagem de usuário final (sem falar de backend)", () => {
    render(<ErrorState />);
    expect(screen.queryByText(/backend/i)).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/conexão/i);
  });

  it("sempre oferece uma forma de tentar de novo, chamando onRetry quando informado", () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("sem onRetry, o botão continua disponível (recarrega a tela)", () => {
    render(<ErrorState />);
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument();
  });
});
