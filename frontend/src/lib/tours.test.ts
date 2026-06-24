import { describe, it, expect } from "vitest";
import { TOURS, listarTours, obterTour, agruparPorAba } from "./tours";

describe("tours", () => {
  it("tem os 10 tours esperados", () => {
    expect(listarTours()).toHaveLength(10);
    const ids = TOURS.map((t) => t.id);
    expect(ids).toEqual([
      "inicio", "carteira-posicoes", "carteira-dividendos", "carteira-simulador",
      "carteira-recomendacoes", "analise-ranking", "analise-clusters",
      "analise-comparar", "ia", "perfil",
    ]);
  });
  it("todo tour tem ao menos 2 passos e título/descrição", () => {
    for (const t of TOURS) {
      expect(t.passos.length).toBeGreaterThanOrEqual(2);
      expect(t.titulo.length).toBeGreaterThan(0);
      expect(t.descricao.length).toBeGreaterThan(0);
      expect(t.rota.startsWith("/")).toBe(true);
    }
  });
  it("obterTour devolve null para id desconhecido", () => {
    expect(obterTour("inexistente")).toBeNull();
    expect(obterTour("inicio")?.id).toBe("inicio");
  });
  it("agruparPorAba agrupa preservando a ordem das abas", () => {
    const grupos = agruparPorAba();
    expect(grupos.map((g) => g.aba)).toEqual(["Inicio", "Carteira", "Analise", "IA", "Perfil"]);
    const carteira = grupos.find((g) => g.aba === "Carteira");
    expect(carteira?.tours).toHaveLength(4);
  });
});
