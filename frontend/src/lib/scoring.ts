import type { FundoComIndicadores, TipoPerfil, Classificacao } from "@/types/domain";

export interface PesosIndicadores {
  dy_atual: number;
  dy_12m: number;
  p_vp: number;
  vacancia_fisica: number;
  vacancia_financeira: number;
  liquidez: number;
  volatilidade: number;
  pl: number;
  cotistas: number;
  segmento: number;
}

const PESOS: Record<TipoPerfil, PesosIndicadores> = {
  moderado: {
    dy_atual: 0.20,
    dy_12m: 0.10,
    p_vp: 0.15,
    vacancia_fisica: 0.10,
    vacancia_financeira: 0.10,
    liquidez: 0.10,
    volatilidade: 0.10,
    pl: 0.05,
    cotistas: 0.05,
    segmento: 0.05,
  },
  conservador: {
    dy_atual: 0.10,
    dy_12m: 0.15,
    p_vp: 0.10,
    vacancia_fisica: 0.15,
    vacancia_financeira: 0.15,
    liquidez: 0.10,
    volatilidade: 0.15,
    pl: 0.05,
    cotistas: 0.05,
    segmento: 0.00,
  },
  arrojado: {
    dy_atual: 0.25,
    dy_12m: 0.05,
    p_vp: 0.20,
    vacancia_fisica: 0.10,
    vacancia_financeira: 0.05,
    liquidez: 0.10,
    volatilidade: 0.05,
    pl: 0.05,
    cotistas: 0.05,
    segmento: 0.10,
  },
};

export function calcularPontuacaoDY(valor: number): number {
  if (valor <= 6) return 1;
  if (valor <= 8) return 3;
  if (valor <= 10) return 5;
  if (valor <= 12) return 4;
  return 2;
}

export function calcularPontuacaoPVP(valor: number): number {
  if (valor < 0.80) return 5;
  if (valor < 0.95) return 4;
  if (valor < 1.05) return 3;
  if (valor < 1.20) return 2;
  return 1;
}

export function calcularPontuacaoVacancia(valor: number): number {
  if (valor < 5) return 5;
  if (valor < 10) return 4;
  if (valor < 15) return 3;
  if (valor < 25) return 2;
  return 1;
}

export function calcularPontuacaoLiquidez(valor: number): number {
  if (valor < 0.1) return 1;
  if (valor < 0.5) return 2;
  if (valor < 1) return 3;
  if (valor < 5) return 4;
  return 5;
}

export function calcularPontuacaoVolatilidade(valor: number): number {
  if (valor < 10) return 5;
  if (valor < 15) return 4;
  if (valor < 20) return 3;
  if (valor < 30) return 2;
  return 1;
}

export function calcularPontuacaoPL(valor: number): number {
  if (valor < 0.5) return 1;
  if (valor < 1) return 2;
  if (valor < 3) return 3;
  if (valor < 5) return 4;
  return 5;
}

export function calcularPontuacaoCotistas(valor: number): number {
  if (valor < 50) return 1;
  if (valor < 100) return 2;
  if (valor < 200) return 3;
  if (valor < 400) return 4;
  return 5;
}

export function calcularPontuacaoSegmento(segmento: string | null): number {
  if (segmento === "Logística") return 5;
  if (segmento === "Recebíveis" || segmento === "Shoppings") return 4;
  if (
    segmento === "Escritórios" ||
    segmento === "Híbrido" ||
    segmento === "Fundo de Fundos"
  )
    return 3;
  return 2;
}

export function classificar(score: number): Classificacao {
  if (score >= 80) return "Excelente";
  if (score >= 60) return "Bom";
  if (score >= 40) return "Regular";
  return "Evitar";
}

export function calcularScore(
  fundo: FundoComIndicadores,
  perfil: TipoPerfil
): number {
  const pesos = { ...PESOS[perfil] };

  // Redistribui peso da vacância física quando nula dentro da dimensão Risco
  // (liquidez e volatilidade absorvem proporcionalmente)
  if (fundo.vacancia_fisica === null) {
    const pesoLiberado = pesos.vacancia_fisica;
    const totalRiscoRestante = pesos.vacancia_financeira + pesos.liquidez + pesos.volatilidade;
    if (totalRiscoRestante > 0) {
      pesos.vacancia_financeira += pesoLiberado * (pesos.vacancia_financeira / totalRiscoRestante);
      pesos.liquidez += pesoLiberado * (pesos.liquidez / totalRiscoRestante);
      pesos.volatilidade += pesoLiberado * (pesos.volatilidade / totalRiscoRestante);
    }
    pesos.vacancia_fisica = 0;
  }

  // Redistribui peso da vacância financeira quando nula dentro da dimensão Risco
  if (fundo.vacancia_financeira === null) {
    const pesoLiberado = pesos.vacancia_financeira;
    const totalRiscoRestante = pesos.vacancia_fisica + pesos.liquidez + pesos.volatilidade;
    if (totalRiscoRestante > 0) {
      pesos.vacancia_fisica += pesoLiberado * (pesos.vacancia_fisica / totalRiscoRestante);
      pesos.liquidez += pesoLiberado * (pesos.liquidez / totalRiscoRestante);
      pesos.volatilidade += pesoLiberado * (pesos.volatilidade / totalRiscoRestante);
    }
    pesos.vacancia_financeira = 0;
  }

  let soma = 0;

  if (fundo.dy_atual !== null) {
    soma += pesos.dy_atual * calcularPontuacaoDY(fundo.dy_atual);
  }
  if (fundo.dy_12m !== null) {
    soma += pesos.dy_12m * calcularPontuacaoDY(fundo.dy_12m);
  }
  if (fundo.p_vp !== null) {
    soma += pesos.p_vp * calcularPontuacaoPVP(fundo.p_vp);
  }
  if (fundo.vacancia_fisica !== null) {
    soma += pesos.vacancia_fisica * calcularPontuacaoVacancia(fundo.vacancia_fisica);
  }
  if (fundo.vacancia_financeira !== null) {
    soma += pesos.vacancia_financeira * calcularPontuacaoVacancia(fundo.vacancia_financeira);
  }
  if (fundo.liquidez_diaria !== null) {
    soma += pesos.liquidez * calcularPontuacaoLiquidez(fundo.liquidez_diaria);
  }
  if (fundo.volatilidade_12m !== null) {
    soma += pesos.volatilidade * calcularPontuacaoVolatilidade(fundo.volatilidade_12m);
  }
  if (fundo.patrimonio_liquido !== null) {
    soma += pesos.pl * calcularPontuacaoPL(fundo.patrimonio_liquido);
  }
  if (fundo.num_cotistas !== null) {
    soma += pesos.cotistas * calcularPontuacaoCotistas(fundo.num_cotistas);
  }
  soma += pesos.segmento * calcularPontuacaoSegmento(fundo.segmento);

  return (soma / 5) * 100;
}

export function calcularScoreComPesos(
  fundo: FundoComIndicadores,
  pesos: PesosIndicadores
): number {
  const p = { ...pesos };

  if (fundo.vacancia_fisica === null) {
    const lib = p.vacancia_fisica;
    const tot = p.vacancia_financeira + p.liquidez + p.volatilidade;
    if (tot > 0) {
      p.vacancia_financeira += lib * (p.vacancia_financeira / tot);
      p.liquidez            += lib * (p.liquidez / tot);
      p.volatilidade        += lib * (p.volatilidade / tot);
    }
    p.vacancia_fisica = 0;
  }

  if (fundo.vacancia_financeira === null) {
    const lib = p.vacancia_financeira;
    const tot = p.vacancia_fisica + p.liquidez + p.volatilidade;
    if (tot > 0) {
      p.vacancia_fisica  += lib * (p.vacancia_fisica / tot);
      p.liquidez         += lib * (p.liquidez / tot);
      p.volatilidade     += lib * (p.volatilidade / tot);
    }
    p.vacancia_financeira = 0;
  }

  let soma = 0;
  if (fundo.dy_atual            !== null) soma += p.dy_atual             * calcularPontuacaoDY(fundo.dy_atual);
  if (fundo.dy_12m              !== null) soma += p.dy_12m               * calcularPontuacaoDY(fundo.dy_12m);
  if (fundo.p_vp                !== null) soma += p.p_vp                 * calcularPontuacaoPVP(fundo.p_vp);
  if (fundo.vacancia_fisica     !== null) soma += p.vacancia_fisica      * calcularPontuacaoVacancia(fundo.vacancia_fisica);
  if (fundo.vacancia_financeira !== null) soma += p.vacancia_financeira  * calcularPontuacaoVacancia(fundo.vacancia_financeira);
  if (fundo.liquidez_diaria     !== null) soma += p.liquidez             * calcularPontuacaoLiquidez(fundo.liquidez_diaria);
  if (fundo.volatilidade_12m    !== null) soma += p.volatilidade         * calcularPontuacaoVolatilidade(fundo.volatilidade_12m);
  if (fundo.patrimonio_liquido  !== null) soma += p.pl                   * calcularPontuacaoPL(fundo.patrimonio_liquido);
  if (fundo.num_cotistas        !== null) soma += p.cotistas             * calcularPontuacaoCotistas(fundo.num_cotistas);
  soma += p.segmento * calcularPontuacaoSegmento(fundo.segmento);

  return (soma / 5) * 100;
}
