import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PosicoesView } from "./PosicoesView";
import * as carteiraHook from "@/hooks/useCarteira";

vi.mock("@/hooks/useCarteira");
vi.mock("@/hooks/useRegistrarTour", () => ({ useRegistrarTour: () => undefined }));

type MutateOpts = { onSuccess?: () => void; onError?: (e: unknown) => void };

function mutacao(impl: (input: unknown, opts?: MutateOpts) => void = () => undefined) {
  return { mutate: vi.fn(impl), isPending: false };
}

function mockCarteira(aporteImpl: (input: unknown, opts?: MutateOpts) => void) {
  vi.mocked(carteiraHook.useCarteira).mockReturnValue({
    posicoes: [],
    resumo: undefined,
    isLoading: false,
    isError: false,
    aporte: mutacao(aporteImpl),
    remover: mutacao(),
    carregarExemplo: mutacao(),
    limpar: mutacao(),
  } as unknown as ReturnType<typeof carteiraHook.useCarteira>);
}

function preencherEEnviar() {
  fireEvent.change(screen.getByLabelText("Ticker"), { target: { value: "xxxx11" } });
  fireEvent.change(screen.getByLabelText("Quantidade"), { target: { value: "10" } });
  fireEvent.change(screen.getByLabelText("Preço"), { target: { value: "100" } });
  fireEvent.click(screen.getByRole("button", { name: "Adicionar" }));
}

beforeEach(() => vi.resetAllMocks());

describe("PosicoesView — cadastro manual", () => {
  it("mostra o erro da API e mantém o que foi digitado quando o ticker não existe", () => {
    mockCarteira((_input, opts) =>
      opts?.onError?.({ response: { data: { detail: "Ticker não encontrado no catálogo" } } })
    );
    render(<PosicoesView />);
    preencherEEnviar();

    expect(screen.getByRole("alert")).toHaveTextContent("Ticker não encontrado no catálogo");
    expect(screen.getByLabelText("Ticker")).toHaveValue("xxxx11");
  });

  it("limpa o formulário só depois que o aporte dá certo", () => {
    mockCarteira((_input, opts) => opts?.onSuccess?.());
    render(<PosicoesView />);
    preencherEEnviar();

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Ticker")).toHaveValue("");
  });
});
