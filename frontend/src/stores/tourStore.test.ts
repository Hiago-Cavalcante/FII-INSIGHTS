import { describe, it, expect, beforeEach } from "vitest";
import { useTourStore } from "./tourStore";

beforeEach(() => {
  useTourStore.setState({ tourAtivoId: null, tourPendenteId: null, vistos: [] });
});

describe("tourStore", () => {
  it("define e limpa o tour ativo", () => {
    useTourStore.getState().setTourAtivo("inicio");
    expect(useTourStore.getState().tourAtivoId).toBe("inicio");
    useTourStore.getState().setTourAtivo(null);
    expect(useTourStore.getState().tourAtivoId).toBeNull();
  });
  it("define o tour pendente", () => {
    useTourStore.getState().setTourPendente("perfil");
    expect(useTourStore.getState().tourPendenteId).toBe("perfil");
  });
  it("marca visto sem duplicar", () => {
    useTourStore.getState().marcarVisto("inicio");
    useTourStore.getState().marcarVisto("inicio");
    useTourStore.getState().marcarVisto("perfil");
    expect(useTourStore.getState().vistos).toEqual(["inicio", "perfil"]);
  });
});
