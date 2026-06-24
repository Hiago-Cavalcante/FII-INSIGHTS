import { useEffect } from "react";
import { obterTour } from "@/lib/tours";
import { useTourStore } from "@/stores/tourStore";
import { useTour } from "./useTour";

/**
 * Registra o tour da tela/sub-view atual e, se houver um tour pendente
 * (disparado pelo índice em outra tela), inicia-o uma única vez ao montar.
 */
export function useRegistrarTour(tourId: string): void {
  const setTourAtivo = useTourStore((s) => s.setTourAtivo);
  const tourPendenteId = useTourStore((s) => s.tourPendenteId);
  const setTourPendente = useTourStore((s) => s.setTourPendente);
  const { iniciarTour } = useTour();

  useEffect(() => {
    setTourAtivo(tourId);
    return () => setTourAtivo(null);
  }, [tourId, setTourAtivo]);

  useEffect(() => {
    if (tourPendenteId !== tourId) return;
    const tour = obterTour(tourId);
    setTourPendente(null);
    if (tour) iniciarTour(tour);
    // iniciarTour/obterTour são estáveis o suficiente; dependemos do par (pendente,id).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourPendenteId, tourId]);
}
