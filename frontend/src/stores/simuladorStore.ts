import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SimuladorState {
  aporteMensal: number | null;
  meses: number;
  rendaAlvo: number | null;
  setAporte: (v: number | null) => void;
  setMeses: (v: number) => void;
  setRendaAlvo: (v: number | null) => void;
}

export const useSimuladorStore = create<SimuladorState>()(
  persist(
    (set) => ({
      aporteMensal: 0,
      meses: 120, // 10 anos
      rendaAlvo: null,
      setAporte: (aporteMensal) => set({ aporteMensal }),
      setMeses: (meses) => set({ meses }),
      setRendaAlvo: (rendaAlvo) => set({ rendaAlvo }),
    }),
    { name: "fii-simulador" }
  )
);
