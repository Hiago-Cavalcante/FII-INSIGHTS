import { HelpCircle } from "lucide-react";
import { obterTour } from "@/lib/tours";
import { useTourStore } from "@/stores/tourStore";
import { useTour } from "@/hooks/useTour";

export function BotaoAjuda() {
  const tourAtivoId = useTourStore((s) => s.tourAtivoId);
  const { iniciarTour } = useTour();
  if (!tourAtivoId) return null;

  function abrir() {
    const tour = tourAtivoId ? obterTour(tourAtivoId) : null;
    if (tour) iniciarTour(tour);
  }

  return (
    <button
      type="button"
      onClick={abrir}
      aria-label="Abrir guia desta tela"
      className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
    >
      <HelpCircle className="h-5 w-5" />
    </button>
  );
}
