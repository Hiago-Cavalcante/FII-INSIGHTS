import { create } from "zustand";
import { persist } from "zustand/middleware";

interface TourState {
  tourAtivoId: string | null;
  tourPendenteId: string | null;
  vistos: string[];
  setTourAtivo: (id: string | null) => void;
  setTourPendente: (id: string | null) => void;
  marcarVisto: (id: string) => void;
}

export const useTourStore = create<TourState>()(
  persist(
    (set) => ({
      tourAtivoId: null,
      tourPendenteId: null,
      vistos: [],
      setTourAtivo: (tourAtivoId) => set({ tourAtivoId }),
      setTourPendente: (tourPendenteId) => set({ tourPendenteId }),
      marcarVisto: (id) =>
        set((s) => (s.vistos.includes(id) ? s : { vistos: [...s.vistos, id] })),
    }),
    { name: "fii-tours-vistos", partialize: (s) => ({ vistos: s.vistos }) }
  )
);
