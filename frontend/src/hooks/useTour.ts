import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import type { Tour } from "@/lib/tours";
import { useTourStore } from "@/stores/tourStore";

export function construirPassos(tour: Tour) {
  return tour.passos.map((p) => ({
    element: p.alvo,
    popover: { title: p.titulo, description: p.conteudo },
  }));
}

export function useTour() {
  const marcarVisto = useTourStore((s) => s.marcarVisto);

  function iniciarTour(tour: Tour) {
    const d = driver({
      showProgress: true,
      nextBtnText: "Próximo",
      prevBtnText: "Voltar",
      doneBtnText: "Concluir",
      progressText: "{{current}} de {{total}}",
      popoverClass: "fii-tour",
      steps: construirPassos(tour),
    });
    marcarVisto(tour.id);
    d.drive();
  }

  return { iniciarTour };
}
