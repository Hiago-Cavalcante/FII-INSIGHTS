import { describe, it, expect } from "vitest";
import { formatMoeda, formatPercent, formatNumero } from "./formato";

describe("formato pt-BR", () => {
  it("moeda a partir de string decimal", () => {
    expect(formatMoeda("1000.00")).toBe("R$ 1.000,00");
    expect(formatMoeda(2200.5)).toBe("R$ 2.200,50");
  });
  it("percentual com 1 casa", () => {
    expect(formatPercent(9.2)).toBe("9,2%");
  });
  it("numero com separador de milhar", () => {
    expect(formatNumero(12400)).toBe("12.400");
  });
});
