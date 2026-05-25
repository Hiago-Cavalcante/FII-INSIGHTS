import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { Classificacao } from "@/types/domain";

interface Props {
  distribuicao: Record<Classificacao, number>;
}

const segmentos: Array<{
  chave: Classificacao;
  barColor: string;
  dotColor: string;
  textColor: string;
}> = [
  {
    chave: "Excelente",
    barColor: "bg-emerald-500",
    dotColor: "bg-emerald-500",
    textColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    chave: "Bom",
    barColor: "bg-blue-500",
    dotColor: "bg-blue-500",
    textColor: "text-blue-600 dark:text-blue-400",
  },
  {
    chave: "Regular",
    barColor: "bg-amber-500",
    dotColor: "bg-amber-500",
    textColor: "text-amber-600 dark:text-amber-400",
  },
  {
    chave: "Evitar",
    barColor: "bg-red-500",
    dotColor: "bg-red-500",
    textColor: "text-red-600 dark:text-red-400",
  },
];

export function DistribuicaoBarra({ distribuicao }: Props) {
  const total = useMemo(
    () => Object.values(distribuicao).reduce((acc, v) => acc + v, 0),
    [distribuicao]
  );

  if (total === 0) return null;

  return (
    <div>
      <div className="flex h-2 w-full overflow-hidden rounded-full gap-0.5">
        {segmentos.map(({ chave, barColor }) => {
          const pct = (distribuicao[chave] / total) * 100;
          return pct > 0 ? (
            <div
              key={chave}
              className={cn("h-full transition-all duration-500", barColor)}
              style={{ width: `${pct}%` }}
              title={`${chave}: ${distribuicao[chave]}`}
            />
          ) : null;
        })}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        {segmentos.map(({ chave, dotColor, textColor }) => (
          <li key={chave} className="flex items-center gap-1.5">
            <span className={cn("size-2 shrink-0 rounded-sm", dotColor)} />
            <span className={cn("font-medium", textColor)}>{chave}</span>
            <span className="text-gray-500 dark:text-gray-400">
              {distribuicao[chave]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
