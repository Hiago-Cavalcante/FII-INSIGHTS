import { usePerfilStore } from "@/stores/perfilStore";
import type { TipoPerfil } from "@/types/domain";
import { cn } from "@/lib/utils";

const perfis: Array<{ tipo: TipoPerfil; rotulo: string; descricao: string }> = [
  { tipo: "conservador", rotulo: "Conservador", descricao: "foco em estabilidade" },
  { tipo: "moderado", rotulo: "Moderado", descricao: "equilíbrio risco/retorno" },
  { tipo: "arrojado", rotulo: "Arrojado", descricao: "foco em rentabilidade" },
];

export function PerfilBanner() {
  const { tipo, setTipo } = usePerfilStore();

  return (
    <div className="bg-muted/50 border-b px-6 py-2 flex items-center gap-4">
      <span className="text-sm text-muted-foreground">Perfil ativo:</span>
      <div className="flex items-center gap-2">
        {perfis.map(({ tipo: t, rotulo }) => (
          <button
            key={t}
            onClick={() => setTipo(t)}
            className={cn(
              "px-3 py-1 rounded-full text-sm font-medium transition-colors cursor-pointer",
              tipo === t
                ? "bg-primary text-primary-foreground"
                : "bg-background border hover:bg-accent text-foreground"
            )}
          >
            {rotulo}
          </button>
        ))}
      </div>
      <span className="text-xs text-muted-foreground">
        {perfis.find((p) => p.tipo === tipo)?.descricao}
      </span>
    </div>
  );
}
