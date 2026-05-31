import { Divider } from "@/components/ui/Divider";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { cn } from "@/lib/utils";
import { Cpu } from "lucide-react";
import { useClusters } from "@/hooks/useClusters";

const cardBase =
  "relative w-full rounded-lg border p-6 shadow-sm bg-white dark:bg-[#090E1A] border-gray-200 dark:border-gray-800";

const CORES_PERFIL: Record<string, { card: string; dot: string }> = {
  conservador: { card: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20", dot: "bg-emerald-500" },
  moderado:    { card: "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20", dot: "bg-blue-500" },
  arrojado:    { card: "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20", dot: "bg-amber-500" },
};

// O endpoint /clusters retorna frações cruas (ao contrário de /ranking); ×100 → percentual.
function fmtPct(v: number | null): string {
  return v !== null ? `${(v * 100).toFixed(1)}%` : "—";
}

export function ClustersPage() {
  const { clusters, isLoading, isError } = useClusters();

  if (isError && !isLoading) return <ErrorState message="Não foi possível carregar os clusters." />;

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">
            Clusters K-Means
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Segmentação automática de FIIs por perfil de risco e retorno
          </p>
        </div>
      </div>

      <Divider />

      <div className="mb-8">
        <div className={cn(cardBase)}>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-500/10">
              <Cpu className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-50">
                Algoritmo K-Means · k = 4 clusters
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Método do cotovelo + Silhouette Score para validação
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-4 text-sm">
            {[
              { label: "Features", value: "5 indicadores" },
              { label: "Padronização", value: "StandardScaler" },
              { label: "Clusters", value: "k = 4" },
              { label: "Amostra", value: "Top 50 FIIs" },
              { label: "Frequência", value: "Manual" },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-gray-400 dark:text-gray-500">{label}</p>
                <p className="font-medium text-gray-900 dark:text-gray-50">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
        Clusters identificados
      </h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full rounded-lg" />
            ))
          : clusters.map((c) => {
              const cor = CORES_PERFIL[c.perfil_risco] ?? CORES_PERFIL.moderado;
              return (
                <div key={c.id} className={cn("relative w-full rounded-lg border p-6 shadow-sm", cor.card)}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn("size-2 rounded-full", cor.dot)} />
                    <p className="font-semibold text-gray-900 dark:text-gray-50">{c.nome_interpretado}</p>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    Perfil {c.perfil_risco} · {c.num_fiis} FIIs
                  </span>
                  {c.descricao && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 my-3">{c.descricao}</p>
                  )}
                  <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                    <div><p className="text-gray-400 text-xs">DY médio</p><p className="font-medium">{fmtPct(c.dy_medio)}</p></div>
                    <div><p className="text-gray-400 text-xs">Volatilidade</p><p className="font-medium">{fmtPct(c.volatilidade_media)}</p></div>
                    <div><p className="text-gray-400 text-xs">P/VP médio</p><p className="font-medium">{c.p_vp_medio !== null ? c.p_vp_medio.toFixed(2) : "—"}</p></div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {c.tickers.map((t) => (
                      <span key={t} className="font-mono text-xs bg-white/60 dark:bg-gray-800/60 border border-current/10 rounded px-1.5 py-0.5">{t}</span>
                    ))}
                  </div>
                </div>
              );
            })}
      </div>
    </div>
  );
}
