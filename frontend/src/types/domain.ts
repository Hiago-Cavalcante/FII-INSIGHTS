export type TipoPerfil = "conservador" | "moderado" | "arrojado";

export type Classificacao = "Excelente" | "Bom" | "Regular" | "Evitar";

export interface Fundo {
  id: number;
  ticker: string;
  nome: string;
  segmento: string | null;
  gestora: string | null;
}

export interface Indicador {
  id: number;
  fundo_id: number;
  data_referencia: string;
  dy_atual: number | null;
  dy_12m: number | null;
  p_vp: number | null;
  vacancia_fisica: number | null;
  vacancia_financeira: number | null;
  liquidez_diaria: number | null;
  volatilidade_12m: number | null;
  patrimonio_liquido: number | null;
  num_cotistas: number | null;
}

export interface ScoringHistorico {
  id: number;
  fundo_id: number;
  data_execucao: string;
  score: number;
  classificacao: Classificacao;
}

export interface Cluster {
  id: number;
  nome_interpretado: string;
  perfil_risco: TipoPerfil;
  descricao: string;
  dy_medio: number | null;
  volatilidade_media: number | null;
  p_vp_medio: number | null;
  num_fiis: number;
}

export interface FundoComIndicadores {
  id: number;
  ticker: string;
  nome: string;
  segmento: string | null;
  gestora: string | null;
  dy_atual: number | null;
  dy_12m: number | null;
  p_vp: number | null;
  vacancia_fisica: number | null;
  vacancia_financeira: number | null;
  liquidez_diaria: number | null;   // em milhões de R$
  volatilidade_12m: number | null;  // em percentual (ex: 8.5 = 8.5%)
  patrimonio_liquido: number | null; // em bilhões de R$
  num_cotistas: number | null;      // em milhares
}

export interface FundoRanqueado extends FundoComIndicadores {
  score: number;
  classificacao: Classificacao;
}

// Pesos do modelo (frações que somam 1.0). Chaves iguais às do backend.
export interface PesosIndicadores {
  dy_atual: number;
  dy_12m: number;
  p_vp: number;
  vacancia_fisica: number;
  vacancia_financeira: number;
  liquidez_diaria: number;
  volatilidade_12m: number;
  patrimonio_liquido: number;
  num_cotistas: number;
  segmento: number;
}
