import { describe, it, expect } from "vitest";
import { indiceMelhor } from "./comparador";

describe("indiceMelhor", () => {
  it("acha o maior (max)", () => {
    expect(indiceMelhor([1, 3, 2], "max")).toBe(1);
  });

  it("acha o menor (min)", () => {
    expect(indiceMelhor([3, 1, 2], "min")).toBe(1);
  });

  it("ignora valores nulos", () => {
    expect(indiceMelhor([null, 5, null], "max")).toBe(1);
  });

  it("todos nulos retorna -1", () => {
    expect(indiceMelhor([null, null], "max")).toBe(-1);
  });

  it("empate fica com o primeiro", () => {
    expect(indiceMelhor([2, 2], "max")).toBe(0);
  });
});
