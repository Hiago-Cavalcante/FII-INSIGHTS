import { useState } from "react";
import { cn } from "@/lib/utils";
import { PosicoesView } from "@/components/carteira/PosicoesView";
import { DividendosView } from "@/components/carteira/DividendosView";
import { SimuladorView } from "@/components/carteira/SimuladorView";

type Sub = "posicoes" | "dividendos" | "simulador";

const ROTULOS: Record<Sub, string> = {
  posicoes: "Posições",
  dividendos: "Dividendos",
  simulador: "Simulador",
};

export function CarteiraPage() {
  const [sub, setSub] = useState<Sub>("posicoes");
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">Minha Carteira</h1>
      <div role="tablist" className="flex gap-2">
        {(["posicoes", "dividendos", "simulador"] as const).map((s) => (
          <button
            key={s}
            role="tab"
            aria-selected={sub === s}
            onClick={() => setSub(s)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium",
              sub === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}
          >
            {ROTULOS[s]}
          </button>
        ))}
      </div>
      {sub === "posicoes" && <PosicoesView />}
      {sub === "dividendos" && <DividendosView />}
      {sub === "simulador" && <SimuladorView />}
    </div>
  );
}
