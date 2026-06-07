import { EmptyState } from "@/components/ui/EmptyState";

export function IAPage() {
  return (
    <EmptyState
      icone={<span>✨</span>}
      titulo="Assistente de IA — em breve"
      descricao="Aqui você vai poder perguntar, em linguagem simples, por que um fundo recebeu cada nota — sempre ancorado nos dados que o sistema calculou."
    />
  );
}
