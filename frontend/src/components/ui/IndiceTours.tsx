import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { agruparPorAba, obterTour, type Tour } from "@/lib/tours";
import { useTourStore } from "@/stores/tourStore";
import { useTour } from "@/hooks/useTour";
import { cn } from "@/lib/utils";

export function IndiceTours() {
  const grupos = agruparPorAba();
  const navigate = useNavigate();
  const location = useLocation();
  const vistos = useTourStore((s) => s.vistos);
  const setTourPendente = useTourStore((s) => s.setTourPendente);
  const { iniciarTour } = useTour();
  const [aberto, setAberto] = useState(false);

  const temNovo = grupos.some((g) => g.tours.some((t) => !vistos.includes(t.id)));

  function abrir(tour: Tour) {
    if (location.pathname === tour.rota) {
      const t = obterTour(tour.id);
      if (t) iniciarTour(t);
      return;
    }
    setTourPendente(tour.id);
    navigate(tour.rota, { state: { tab: tour.tab } });
  }

  return (
    <div className="rounded-2xl border border-border bg-accent/40 p-4">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          💡 Aprenda enquanto investe
          {temNovo && (
            <span aria-label="novo" className="h-2 w-2 shrink-0 rounded-full bg-primary" />
          )}
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            aberto && "rotate-180"
          )}
        />
      </button>

      {aberto && (
        <div className="mt-3 flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">
            Guias rápidos de cada tela. Toque para começar.
          </p>
          {grupos.map((g) => (
            <div key={g.aba}>
              <p className="mb-1 text-xs font-medium text-muted-foreground">{g.aba}</p>
              <ul className="flex flex-col gap-1">
                {g.tours.map((tour) => (
                  <li key={tour.id}>
                    <button
                      type="button"
                      onClick={() => abrir(tour)}
                      className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-left text-sm"
                    >
                      <span className="font-medium text-foreground">{tour.titulo}</span>
                      {!vistos.includes(tour.id) && (
                        <span
                          aria-label="novo"
                          className="ml-2 h-2 w-2 shrink-0 rounded-full bg-primary"
                        />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
