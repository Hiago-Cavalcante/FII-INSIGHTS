import { describe, it, expect } from "vitest";
import { mensagemErroApi } from "./erros";

describe("mensagemErroApi", () => {
  it("usa o detail textual devolvido pela API", () => {
    const err = { response: { data: { detail: "Ticker não encontrado no catálogo" } } };
    expect(mensagemErroApi(err, "Falhou")).toBe("Ticker não encontrado no catálogo");
  });

  it("cai no texto padrão quando o detail não é texto (ex.: lista de validação 422)", () => {
    const err = { response: { data: { detail: [{ msg: "x" }] } } };
    expect(mensagemErroApi(err, "Falhou")).toBe("Falhou");
  });

  it("cai no texto padrão para erros sem resposta (rede)", () => {
    expect(mensagemErroApi(new Error("Network Error"), "Falhou")).toBe("Falhou");
    expect(mensagemErroApi(undefined, "Falhou")).toBe("Falhou");
  });
});
