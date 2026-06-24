import { describe, it, expect } from "vitest";
import { lerTabDoEstado } from "./navTab";

const validas = ["posicoes", "dividendos"] as const;

describe("lerTabDoEstado", () => {
  it("retorna a tab quando presente e válida", () => {
    expect(lerTabDoEstado({ tab: "dividendos" }, validas)).toBe("dividendos");
  });
  it("retorna null quando ausente", () => {
    expect(lerTabDoEstado(null, validas)).toBeNull();
    expect(lerTabDoEstado({}, validas)).toBeNull();
  });
  it("retorna null quando inválida ou não-string", () => {
    expect(lerTabDoEstado({ tab: "xpto" }, validas)).toBeNull();
    expect(lerTabDoEstado({ tab: 123 }, validas)).toBeNull();
  });
});
