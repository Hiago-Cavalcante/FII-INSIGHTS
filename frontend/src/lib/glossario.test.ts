import { describe, it, expect } from "vitest";
import { explicarIndicador, GLOSSARIO } from "./glossario";

describe("glossario", () => {
  it("retorna explicação de iniciante para DY", () => {
    const e = explicarIndicador("dy_atual");
    expect(e).not.toBeNull();
    expect(e!.titulo.toLowerCase()).toContain("dividend");
    expect(e!.simples.length).toBeGreaterThan(10);
  });
  it("retorna null para chave desconhecida", () => {
    expect(explicarIndicador("inexistente")).toBeNull();
  });
  it("cobre os indicadores principais", () => {
    for (const k of ["dy_atual", "p_vp", "vacancia_fisica", "liquidez_diaria", "volatilidade_12m"])
      expect(GLOSSARIO[k]).toBeDefined();
  });
});
