import type { Classificacao } from "@/types/domain";
import { cn } from "@/lib/utils";

const cores: Record<Classificacao, string> = {
  Excelente: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20",
  Bom: "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20",
  Regular: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20",
  Evitar: "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20",
};

interface Props {
  classificacao: Classificacao;
  className?: string;
}

export function ClassificacaoBadge({ classificacao, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        cores[classificacao],
        className
      )}
    >
      {classificacao}
    </span>
  );
}
