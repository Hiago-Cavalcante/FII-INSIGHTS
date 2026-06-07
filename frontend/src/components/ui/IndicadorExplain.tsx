import { useState } from "react";
import { explicarIndicador } from "@/lib/glossario";

interface Props {
  chave: string;
  rotulo: string;
  valor: string;
}

export function IndicadorExplain({ chave, rotulo, valor }: Props) {
  const [aberto, setAberto] = useState(false);
  const exp = explicarIndicador(chave);
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{rotulo}</span>
        {exp && (
          <button
            type="button"
            aria-label={`Explicar ${rotulo}`}
            onClick={() => setAberto((a) => !a)}
            className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary"
          >
            ?
          </button>
        )}
      </div>
      <div className="text-lg font-semibold text-foreground">{valor}</div>
      {aberto && exp && (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{exp.simples}</p>
      )}
    </div>
  );
}
