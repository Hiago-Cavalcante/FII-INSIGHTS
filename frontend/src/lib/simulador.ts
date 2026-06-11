export interface SimuladorParams {
  capitalInicial: number; // R$
  aporteMensal: number; // R$/mês
  taxaMensal: number; // fração (0.008 = 0,8%/mês)
  meses: number; // horizonte
  rendaAlvo?: number | null; // R$/mês (meta, opcional)
}

export interface PontoProjecao {
  mes: number;
  renda: number;
  patrimonio: number;
}

export interface ResultadoSimulacao {
  serie: PontoProjecao[];
  rendaFinal: number;
  patrimonioFinal: number;
  mesMeta: number | null;
}

/**
 * Projeta a renda mensal futura pela bola de neve: a cada mês soma o aporte,
 * calcula a renda gerada (principal × taxa) e a reinveste no principal.
 * Premissas: dividendos reinvestidos, taxa constante, sem valorização de cota.
 */
export function projetarRenda(params: SimuladorParams): ResultadoSimulacao {
  const { capitalInicial, aporteMensal, taxaMensal, meses, rendaAlvo = null } = params;

  const serie: PontoProjecao[] = [];
  let principal = capitalInicial;
  let mesMeta: number | null = null;

  for (let mes = 1; mes <= meses; mes++) {
    principal += aporteMensal;
    const renda = principal * taxaMensal;
    principal += renda;
    serie.push({ mes, renda, patrimonio: principal });
    if (mesMeta === null && rendaAlvo != null && rendaAlvo > 0 && renda >= rendaAlvo) {
      mesMeta = mes;
    }
  }

  const ultimo = serie[serie.length - 1];
  return {
    serie,
    rendaFinal: ultimo ? ultimo.renda : 0,
    patrimonioFinal: ultimo ? ultimo.patrimonio : capitalInicial,
    mesMeta,
  };
}
