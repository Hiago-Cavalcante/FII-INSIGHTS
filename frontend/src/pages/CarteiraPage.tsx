import { useState } from "react";
import { useLocation } from "react-router-dom";
import { lerTabDoEstado } from "@/lib/navTab";
import { cn } from "@/lib/utils";
import { PosicoesView } from "@/components/carteira/PosicoesView";
import { DividendosView } from "@/components/carteira/DividendosView";
import { SimuladorView } from "@/components/carteira/SimuladorView";
import { RecomendacoesView } from "@/components/carteira/RecomendacoesView";

type Sub = "posicoes" | "dividendos" | "simulador" | "recomendacoes";

const SUBS: readonly Sub[] = ["posicoes", "dividendos", "simulador", "recomendacoes"];

const ROTULOS: Record<Sub, string> = {
  posicoes: "Posições",
  dividendos: "Dividendos",
  simulador: "Simulador",
  recomendacoes: "Recomendações",
};

export function CarteiraPage() {
  const location = useLocation();
  const [sub, setSub] = useState<Sub>(
    () => (lerTabDoEstado(location.state, SUBS) as Sub | null) ?? "posicoes"
  );
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">Minha Carteira</h1>
      <div
        role="tablist"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {(["posicoes", "dividendos", "simulador", "recomendacoes"] as const).map((s) => (
          <button
            key={s}
            role="tab"
            aria-selected={sub === s}
            onClick={() => setSub(s)}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium",
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
      {sub === "recomendacoes" && <RecomendacoesView />}
    </div>
  );
}
