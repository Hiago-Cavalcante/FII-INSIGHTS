import { describe, it, expect } from "vitest";
import { avaliarPerfil, PERGUNTAS } from "./perfilSuitability";

describe("perfilSuitability", () => {
  it("tem 4 perguntas com 3 opções cada", () => {
    expect(PERGUNTAS).toHaveLength(4);
    for (const p of PERGUNTAS) expect(p.opcoes).toHaveLength(3);
  });

  it("respostas mais conservadoras → conservador (+ horizonte/objetivo)", () => {
    const r = avaliarPerfil([0, 0, 0, 0]);
    expect(r.tipo).toBe("conservador");
    expect(r.horizonte).toBe("curto");
    expect(r.objetivo).toBe("renda");
  });

  it("respostas mais arrojadas → arrojado (+ horizonte/objetivo)", () => {
    const r = avaliarPerfil([2, 2, 2, 2]);
    expect(r.tipo).toBe("arrojado");
    expect(r.horizonte).toBe("longo");
    expect(r.objetivo).toBe("crescimento");
  });

  it("respeita as faixas (soma 6→cons, 7→mod, 9→mod, 10→arroj)", () => {
    expect(avaliarPerfil([0, 0, 0, 2]).tipo).toBe("conservador"); // 1+1+1+3 = 6
    expect(avaliarPerfil([0, 0, 1, 2]).tipo).toBe("moderado"); // 1+1+2+3 = 7
    expect(avaliarPerfil([2, 2, 1, 0]).tipo).toBe("moderado"); // 3+3+2+1 = 9
    expect(avaliarPerfil([2, 2, 2, 0]).tipo).toBe("arrojado"); // 3+3+3+1 = 10
  });
});
