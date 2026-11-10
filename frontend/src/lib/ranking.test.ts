import { describe, it, expect } from "vitest";
import { posicoesPorScore, compararClassificacao, mensagemRankingVazio } from "./ranking";

describe("posicoesPorScore", () => {
  it("numera do maior para o menor score, independente da ordem de entrada", () => {
    const pos = posicoesPorScore([
      { ticker: "BBBB11", score: 70 },
      { ticker: "AAAA11", score: 90 },
      { ticker: "CCCC11", score: 50 },
    ]);
    expect(pos.get("AAAA11")).toBe(1);
    expect(pos.get("BBBB11")).toBe(2);
    expect(pos.get("CCCC11")).toBe(3);
  });

  it("lista vazia gera mapa vazio", () => {
    expect(posicoesPorScore([]).size).toBe(0);
  });
});

describe("compararClassificacao", () => {
  it("ordena por qualidade (Evitar < Regular < Bom < Excelente), não alfabeticamente", () => {
    const ordem = ["Bom", "Excelente", "Evitar", "Regular"] as const;
    const ordenado = [...ordem].sort(compararClassificacao);
    expect(ordenado).toEqual(["Evitar", "Regular", "Bom", "Excelente"]);
  });
});

describe("mensagemRankingVazio", () => {
  it("cita a busca quando há termo digitado", () => {
    expect(mensagemRankingVazio("zzzz", "Todas")).toBe("Nenhum fundo encontrado para “zzzz”.");
  });

  it("cita a classificação quando o filtro está ativo e não há busca", () => {
    expect(mensagemRankingVazio("", "Evitar")).toBe("Nenhum fundo classificado como Evitar.");
  });

  it("mensagem genérica sem busca nem filtro", () => {
    expect(mensagemRankingVazio("  ", "Todas")).toBe("Nenhum fundo disponível no momento.");
  });
});
