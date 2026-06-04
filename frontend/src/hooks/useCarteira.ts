import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listarPosicoes,
  getResumo,
  criarAporte,
  removerPosicao,
  type Posicao,
  type ResumoCarteira,
} from "@/api/endpoints/carteira";

export function useCarteira() {
  const qc = useQueryClient();
  const posicoesQuery = useQuery({ queryKey: ["carteira", "posicoes"], queryFn: listarPosicoes });
  const resumoQuery = useQuery({ queryKey: ["carteira", "resumo"], queryFn: getResumo });

  const invalidar = () => qc.invalidateQueries({ queryKey: ["carteira"] });
  const aporte = useMutation({ mutationFn: criarAporte, onSuccess: invalidar });
  const remover = useMutation({ mutationFn: removerPosicao, onSuccess: invalidar });

  const posicoes: Posicao[] = posicoesQuery.data ?? [];
  const resumo: ResumoCarteira | undefined = resumoQuery.data;

  return {
    posicoes,
    resumo,
    isLoading: posicoesQuery.isLoading,
    isError: posicoesQuery.isError,
    aporte,
    remover,
  };
}
