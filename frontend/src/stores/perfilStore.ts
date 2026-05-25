import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TipoPerfil } from "@/types/domain";
import type { PesosIndicadores } from "@/lib/scoring";

interface PerfilState {
  tipo: TipoPerfil;
  pesosCustom: PesosIndicadores | null;
  setTipo: (tipo: TipoPerfil) => void;
  setPesosCustom: (pesos: PesosIndicadores | null) => void;
}

export const usePerfilStore = create<PerfilState>()(
  persist(
    (set) => ({
      tipo: "moderado",
      pesosCustom: null,
      setTipo: (tipo) => set({ tipo, pesosCustom: null }),
      setPesosCustom: (pesosCustom) => set({ pesosCustom }),
    }),
    { name: "fii-perfil-investidor" }
  )
);
