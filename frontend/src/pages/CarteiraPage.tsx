import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { lerTabDoEstado } from "@/lib/navTab";
import { temConteudoADireita } from "@/lib/rolagem";
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
  recomendacoes: "Sugestões",
};

export function CarteiraPage() {
  const location = useLocation();
  const [sub, setSub] = useState<Sub>(
    () => (lerTabDoEstado(location.state, SUBS) as Sub | null) ?? "posicoes"
  );

  // Degradê de rolagem nas abas: aparece só quando há mais conteúdo à direita
  // (some ao chegar no fim, para não cobrir a última aba).
  const tablistEl = useRef<HTMLDivElement | null>(null);
  const [fadeDireita, setFadeDireita] = useState(false);
  const medir = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    setFadeDireita(temConteudoADireita(el.scrollLeft, el.clientWidth, el.scrollWidth));
  }, []);
  const refTablist = useCallback(
    (el: HTMLDivElement | null) => {
      tablistEl.current = el;
      medir(el);
    },
    [medir]
  );
  useEffect(() => {
    const aoRedimensionar = () => medir(tablistEl.current);
    window.addEventListener("resize", aoRedimensionar);
    return () => window.removeEventListener("resize", aoRedimensionar);
  }, [medir]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">Minha Carteira</h1>
      <div className="relative -mx-4">
        <div
          role="tablist"
          ref={refTablist}
          onScroll={() => medir(tablistEl.current)}
          className="flex gap-2 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
        {fadeDireita && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent"
          />
        )}
      </div>
      {sub === "posicoes" && <PosicoesView />}
      {sub === "dividendos" && <DividendosView />}
      {sub === "simulador" && <SimuladorView />}
      {sub === "recomendacoes" && <RecomendacoesView />}
    </div>
  );
}
