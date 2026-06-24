import { describe, it, expect } from "vitest";
import { temConteudoADireita } from "./rolagem";

describe("temConteudoADireita", () => {
  it("true quando há conteúdo além da largura visível", () => {
    expect(temConteudoADireita(0, 300, 500)).toBe(true);
  });
  it("false quando já rolou até o fim (dentro da margem)", () => {
    expect(temConteudoADireita(200, 300, 500)).toBe(false);
  });
  it("false quando não há overflow", () => {
    expect(temConteudoADireita(0, 500, 500)).toBe(false);
  });
});
