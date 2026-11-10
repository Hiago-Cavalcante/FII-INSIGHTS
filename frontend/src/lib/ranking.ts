import type { Classificacao } from "@/types/domain";

/**
 * Posição de cada fundo no ranking geral (1 = maior score), calculada sobre a
 * lista completa — a posição não muda quando o usuário filtra ou busca.
 */
export function posicoesPorScore(
  fundos: ReadonlyArray<{ ticker: string; score: number }>
): Map<string, number> {
  const ordenados = [...fundos].sort((a, b) => b.score - a.score);
  return new Map(ordenados.map((f, i) => [f.ticker, i + 1]));
}

const ORDEM_CLASSIFICACAO: Record<Classificacao, number> = {
  Evitar: 0,
  Regular: 1,
  Bom: 2,
  Excelente: 3,
};

/** Comparador ordinal: Evitar < Regular < Bom < Excelente. */
export function compararClassificacao(a: Classificacao, b: Classificacao): number {
  return ORDEM_CLASSIFICACAO[a] - ORDEM_CLASSIFICACAO[b];
}

/** Texto do estado vazio do ranking, nomeando a causa real (busca ou filtro). */
export function mensagemRankingVazio(busca: string, filtro: Classificacao | "Todas"): string {
  const termo = busca.trim();
  if (termo) return `Nenhum fundo encontrado para “${termo}”.`;
  if (filtro !== "Todas") return `Nenhum fundo classificado como ${filtro}.`;
  return "Nenhum fundo disponível no momento.";
}
