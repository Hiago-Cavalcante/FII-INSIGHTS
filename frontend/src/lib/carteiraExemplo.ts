/**
 * Carteira de DEMONSTRAÇÃO — dados de exemplo, NÃO refletem custódia real.
 *
 * Usada para popular a carteira em um clique no beta/demo, evitando entrada
 * manual que se passaria por posições reais. Os preços são valores ilustrativos
 * próximos da cotação de referência de cada fundo no catálogo.
 *
 * Mix proposital: 3 FIIs (logística, lajes, papel) + 1 FIAGRO (terras) — cobre
 * scoring por classe (FII × FIAGRO) e rebalanceamento entre classes.
 */
export interface AporteExemplo {
  ticker: string;
  quantidade: number;
  preco: string;
}

export const CARTEIRA_EXEMPLO: AporteExemplo[] = [
  { ticker: "HGLG11", quantidade: 30, preco: "151.40" }, // FII · Logística
  { ticker: "KNRI11", quantidade: 30, preco: "153.35" }, // FII · Lajes Corporativas
  { ticker: "MXRF11", quantidade: 500, preco: "9.66" }, // FII · Recebíveis (papel)
  { ticker: "RZTR11", quantidade: 50, preco: "89.70" }, // FIAGRO · Agro - Terras
];
