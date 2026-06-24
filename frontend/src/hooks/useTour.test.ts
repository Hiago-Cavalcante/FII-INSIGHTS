import { describe, it, expect } from "vitest";
import { construirPassos } from "./useTour";
import type { Tour } from "@/lib/tours";

const tour: Tour = {
  id: "x", titulo: "X", descricao: "d", aba: "Início", rota: "/",
  passos: [
    { titulo: "Intro", conteudo: "sem alvo" },
    { alvo: '[data-tour="y"]', titulo: "Y", conteudo: "com alvo" },
  ],
};

describe("construirPassos", () => {
  it("mapeia passo centrado (sem element) e passo com element", () => {
    const passos = construirPassos(tour);
    expect(passos[0].element).toBeUndefined();
    expect(passos[0].popover).toEqual({ title: "Intro", description: "sem alvo" });
    expect(passos[1].element).toBe('[data-tour="y"]');
    expect(passos[1].popover.title).toBe("Y");
  });
});
