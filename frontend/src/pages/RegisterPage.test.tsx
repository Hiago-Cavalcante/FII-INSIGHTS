import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { RegisterPage } from "./RegisterPage";

const registerMock = vi.fn();
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ register: registerMock }) }));

beforeEach(() => registerMock.mockReset());

function renderPage() {
  return render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>
  );
}

function preencher() {
  fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: "Hiago" } });
  fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: "a@b.com" } });
  fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: "segredo123" } });
}

describe("RegisterPage", () => {
  it("desabilita o botão e mostra 'Cadastrando…' enquanto o cadastro está pendente", async () => {
    let resolver: () => void = () => {};
    registerMock.mockReturnValue(
      new Promise<void>((res) => {
        resolver = res;
      })
    );
    renderPage();
    preencher();
    fireEvent.click(screen.getByRole("button", { name: /cadastrar/i }));

    await waitFor(() => expect(screen.getByRole("button")).toBeDisabled());
    expect(screen.getByRole("button")).toHaveTextContent(/cadastrando/i);

    await act(async () => {
      resolver();
    });
  });
});
