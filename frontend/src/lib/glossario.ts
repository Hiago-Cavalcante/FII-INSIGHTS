export interface ExplicacaoIndicador {
  titulo: string;
  simples: string; // linguagem de iniciante (P1)
}

export const GLOSSARIO: Record<string, ExplicacaoIndicador> = {
  dy_atual: {
    titulo: "Dividend Yield (DY)",
    simples:
      "Quanto o fundo paga de rendimento por ano em relação ao preço da cota. Quanto maior, mais renda — mas DY muito alto pode indicar risco.",
  },
  dy_12m: {
    titulo: "DY 12 meses",
    simples:
      "A média do rendimento pago nos últimos 12 meses. Mostra a consistência dos pagamentos.",
  },
  p_vp: {
    titulo: "P/VP",
    simples:
      "Compara o preço da cota com o valor patrimonial. Abaixo de 1 significa que está 'mais barato' que o patrimônio.",
  },
  vacancia_fisica: {
    titulo: "Vacância física",
    simples:
      "Percentual dos imóveis do fundo que estão desocupados. Quanto menor, melhor.",
  },
  vacancia_financeira: {
    titulo: "Vacância financeira",
    simples:
      "Percentual da receita de aluguéis que o fundo deixa de receber por inadimplência ou desocupação.",
  },
  liquidez_diaria: {
    titulo: "Liquidez diária",
    simples:
      "Quanto é negociado por dia. Alta liquidez facilita comprar e vender sem afetar muito o preço.",
  },
  volatilidade_12m: {
    titulo: "Volatilidade 12M",
    simples:
      "O quanto o preço da cota oscila. Menor volatilidade costuma significar menos sustos.",
  },
  patrimonio_liquido: {
    titulo: "Patrimônio líquido",
    simples: "O tamanho do fundo. Fundos maiores tendem a ser mais estáveis.",
  },
  num_cotistas: {
    titulo: "Número de cotistas",
    simples:
      "Quantas pessoas investem no fundo. Mais cotistas costuma indicar mais liquidez e pulverização.",
  },
  duration: {
    titulo: "Duration",
    simples:
      "Prazo médio dos recebíveis de um FIAGRO/FII de papel. Duration maior é mais sensível a juros.",
  },
};

export function explicarIndicador(chave: string): ExplicacaoIndicador | null {
  return GLOSSARIO[chave] ?? null;
}
