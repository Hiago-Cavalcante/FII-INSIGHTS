import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listarPosicoes,
  getResumo,
  criarAporte,
  removerPosicao,
  type Posicao,
  type ResumoCarteira,
} from "@/api/endpoints/carteira";
import { CARTEIRA_EXEMPLO } from "@/lib/carteiraExemplo";

export function useCarteira() {
  const qc = useQueryClient();
  const posicoesQuery = useQuery({ queryKey: ["carteira", "posicoes"], queryFn: listarPosicoes });
  const resumoQuery = useQuery({ queryKey: ["carteira", "resumo"], queryFn: getResumo });

  const invalidar = () => qc.invalidateQueries({ queryKey: ["carteira"] });
  const aporte = useMutation({ mutationFn: criarAporte, onSuccess: invalidar });
  const remover = useMutation({ mutationFn: removerPosicao, onSuccess: invalidar });

  // Popula a carteira com os fundos de demonstração (um aporte por fundo).
  const carregarExemplo = useMutation({
    mutationFn: async () => {
      for (const a of CARTEIRA_EXEMPLO) {
        await criarAporte(a);
      }
    },
    onSuccess: invalidar,
  });

  // Remove todas as posições informadas (usado pelo "Limpar carteira").
  const limpar = useMutation({
    mutationFn: async (ids: number[]) => {
      for (const id of ids) {
        await removerPosicao(id);
      }
    },
    onSuccess: invalidar,
  });

  const posicoes: Posicao[] = posicoesQuery.data ?? [];
  const resumo: ResumoCarteira | undefined = resumoQuery.data;

  return {
    posicoes,
    resumo,
    isLoading: posicoesQuery.isLoading,
    isError: posicoesQuery.isError,
    aporte,
    remover,
    carregarExemplo,
    limpar,
  };
}
