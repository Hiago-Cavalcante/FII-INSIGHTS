export type Direcao = "max" | "min";

/**
 * Índice do "melhor" valor numa lista: o maior se `dir === "max"`, o menor se
 * `dir === "min"`. Ignora nulos; retorna -1 se todos forem nulos; empate fica
 * com o primeiro. Usado para destacar o melhor fundo por métrica no comparador.
 */
export function indiceMelhor(valores: (number | null)[], dir: Direcao): number {
  let melhor = -1;
  for (let i = 0; i < valores.length; i++) {
    const v = valores[i];
    if (v == null) continue;
    if (melhor === -1) {
      melhor = i;
      continue;
    }
    const ref = valores[melhor] as number;
    if ((dir === "max" && v > ref) || (dir === "min" && v < ref)) {
      melhor = i;
    }
  }
  return melhor;
}
