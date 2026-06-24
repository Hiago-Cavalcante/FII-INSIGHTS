import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LoginPage } from "./LoginPage";

const loginMock = vi.fn();
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ login: loginMock }) }));

beforeEach(() => loginMock.mockReset());

function renderPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  );
}

describe("LoginPage", () => {
  it("envia e-mail e senha ao logar", async () => {
    loginMock.mockResolvedValue(undefined);
    renderPage();
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: "segredo123" } });
    fireEvent.click(screen.getByRole("button", { name: /entrar/i }));
    await waitFor(() => expect(loginMock).toHaveBeenCalledWith("a@b.com", "segredo123"));
  });

  it("desabilita o botão e mostra 'Entrando…' enquanto o login está pendente", async () => {
    let resolver: () => void = () => {};
    loginMock.mockReturnValue(
      new Promise<void>((res) => {
        resolver = res;
      })
    );
    renderPage();
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: "segredo123" } });
    fireEvent.click(screen.getByRole("button", { name: /entrar/i }));

    await waitFor(() => expect(screen.getByRole("button")).toBeDisabled());
    expect(screen.getByRole("button")).toHaveTextContent(/entrando/i);

    await act(async () => {
      resolver();
    });
  });

  // O caminho de erro (alerta quando o login falha) NÃO é coberto aqui por uma
  // incompatibilidade React 19 + Vitest 4: uma Promise rejeitada consumida dentro de
  // um event handler é surfaceada pelo runner como erro do teste MESMO estando tratada
  // (confirmado que não é unhandled rejection — try/catch, .catch pré-anexado, act async
  // e dangerouslyIgnoreUnhandledErrors não resolvem). O componente trata o erro e exibe
  // <p role="alert">; essa UX é validada no smoke e2e (T23). Reavaliar com user-event.
});
