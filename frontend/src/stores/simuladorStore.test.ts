import { describe, it, expect, beforeEach } from "vitest";
import { useSimuladorStore } from "./simuladorStore";

describe("simuladorStore", () => {
  beforeEach(() => {
    useSimuladorStore.setState({ aporteMensal: 0, meses: 120, rendaAlvo: null });
  });

  it("tem defaults sensatos (10 anos, sem meta)", () => {
    const s = useSimuladorStore.getState();
    expect(s.meses).toBe(120);
    expect(s.aporteMensal).toBe(0);
    expect(s.rendaAlvo).toBeNull();
  });

  it("setters atualizam o estado", () => {
    useSimuladorStore.getState().setAporte(1000);
    useSimuladorStore.getState().setMeses(60);
    useSimuladorStore.getState().setRendaAlvo(3000);
    const s = useSimuladorStore.getState();
    expect(s.aporteMensal).toBe(1000);
    expect(s.meses).toBe(60);
    expect(s.rendaAlvo).toBe(3000);
  });
});
