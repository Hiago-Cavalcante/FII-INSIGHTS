import { apiClient } from "@/api/client";

export interface Posicao {
  id: number;
  ticker: string;
  nome: string | null;
  classe: string;
  quantidade: number;
  preco_medio: string;
  valor_investido: string;
}

export interface ResumoCarteira {
  total_investido: string;
  por_classe: Record<string, string>;
  num_posicoes: number;
}

export async function listarPosicoes(): Promise<Posicao[]> {
  const { data } = await apiClient.get<Posicao[]>("/api/v1/carteira/posicoes");
  return data;
}

export async function getResumo(): Promise<ResumoCarteira> {
  const { data } = await apiClient.get<ResumoCarteira>("/api/v1/carteira/resumo");
  return data;
}

export async function criarAporte(input: {
  ticker: string;
  quantidade: number;
  preco: string;
}): Promise<Posicao> {
  const { data } = await apiClient.post<Posicao>("/api/v1/carteira/posicoes", input);
  return data;
}

export async function removerPosicao(id: number): Promise<void> {
  await apiClient.delete(`/api/v1/carteira/posicoes/${id}`);
}
