import { apiClient } from "@/api/client";

export interface FundoRenda {
  ticker: string;
  renda_mensal: string;
  percentual: number;
  sem_dados: boolean;
}

export interface Dividendos {
  renda_mensal: string;
  renda_anual: string;
  yield_on_cost: number | null;
  por_fundo: FundoRenda[];
}

export async function getDividendos(): Promise<Dividendos> {
  const { data } = await apiClient.get<Dividendos>("/api/v1/carteira/dividendos");
  return data;
}
