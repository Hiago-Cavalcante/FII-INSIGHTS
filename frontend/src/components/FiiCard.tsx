import type { Classificacao } from "@/types/domain";
import { ClassificacaoBadge } from "@/components/ClassificacaoBadge";
import { cn } from "@/lib/utils";

const scoreColors: Record<Classificacao, string> = {
  Excelente: "text-emerald-600 dark:text-emerald-400",
  Bom: "text-blue-600 dark:text-blue-400",
  Regular: "text-amber-600 dark:text-amber-400",
  Evitar: "text-red-600 dark:text-red-400",
};

interface Props {
  ticker: string;
  nome: string;
  segmento: string | null;
  score: number;
  classificacao: Classificacao;
}

export function FiiCard({ ticker, nome, segmento, score, classificacao }: Props) {
  return (
    <div
      className={cn(
        "relative w-full rounded-lg border p-5 text-left shadow-sm transition-shadow hover:shadow-md",
        "bg-card",
        "border-gray-200 dark:border-gray-800"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0 flex-1">
          <p className="font-mono font-bold text-base text-gray-900 dark:text-gray-50 leading-tight">
            {ticker}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">{nome}</p>
          {segmento && (
            <p className="text-xs text-gray-400 dark:text-gray-400 mt-0.5">{segmento}</p>
          )}
        </div>
        <ClassificacaoBadge classificacao={classificacao} className="shrink-0 mt-0.5" />
      </div>
      <div className="flex items-baseline gap-1">
        <span className={cn("text-3xl font-semibold tabular-nums", scoreColors[classificacao])}>
          {score.toFixed(1)}
        </span>
        <span className="text-sm text-gray-400 dark:text-gray-400">/ 100</span>
      </div>
    </div>
  );
}
