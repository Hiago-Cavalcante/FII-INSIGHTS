import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TipoPerfil } from "@/types/domain";
import type { PesosIndicadores } from "@/types/domain";
import type { Horizonte, Objetivo, ResultadoPerfil } from "@/lib/perfilSuitability";

interface PerfilState {
  tipo: TipoPerfil;
  pesosCustom: PesosIndicadores | null;
  objetivo: Objetivo | null;
  horizonte: Horizonte | null;
  setTipo: (tipo: TipoPerfil) => void;
  setPesosCustom: (pesos: PesosIndicadores | null) => void;
  definirPerfil: (resultado: ResultadoPerfil) => void;
}

export const usePerfilStore = create<PerfilState>()(
  persist(
    (set) => ({
      tipo: "moderado",
      pesosCustom: null,
      objetivo: null,
      horizonte: null,
      setTipo: (tipo) => set({ tipo, pesosCustom: null }),
      setPesosCustom: (pesosCustom) => set({ pesosCustom }),
      definirPerfil: ({ tipo, objetivo, horizonte }) =>
        set({ tipo, objetivo, horizonte, pesosCustom: null }),
    }),
    { name: "fii-perfil-investidor" }
  )
);
