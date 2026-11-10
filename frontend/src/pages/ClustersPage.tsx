import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { cn } from "@/lib/utils";
import { Cpu } from "lucide-react";
import { useClusters } from "@/hooks/useClusters";
import { useRegistrarTour } from "@/hooks/useRegistrarTour";
import { formatPercent } from "@/lib/formato";

const cardBase =
  "relative w-full rounded-xl border border-border p-6 shadow-sm bg-card";

const CORES_PERFIL: Record<string, { card: string; dot: string }> = {
  conservador: { card: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20", dot: "bg-emerald-500" },
  moderado:    { card: "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20", dot: "bg-blue-500" },
  arrojado:    { card: "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20", dot: "bg-amber-500" },
};

// O endpoint /clusters retorna frações cruas (ao contrário de /ranking); ×100 → percentual.
function fmtPct(v: number | null): string {
  return v !== null ? formatPercent(v * 100) : "—";
}

const fmtPvp = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function ClustersPage() {
  useRegistrarTour("analise-clusters");
  const { clusters, isLoading, isError } = useClusters();

  if (isError && !isLoading) return <ErrorState message="Não foi possível carregar os clusters." />;

  // Amostra real = fundos efetivamente agrupados (o K-Means usa todos os elegíveis, FII e FIAGRO).
  const totalFundos = clusters.reduce((soma, c) => soma + c.num_fiis, 0);

  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">
        Segmentação automática de FIIs e FIAGROs por perfil de risco e retorno (K-Means)
      </p>

      <div className="mb-8">
        <div className={cn(cardBase)}>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-500/10">
              <Cpu className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Algoritmo K-Means · k = 4 clusters
              </p>
              <p className="text-xs text-muted-foreground">
                k fixado em 4 para facilitar a leitura; cotovelo e silhueta calculados como apoio
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-4 text-sm">
            {[
              { label: "Variáveis", value: "4 indicadores" },
              { label: "Padronização", value: "StandardScaler" },
              { label: "Clusters", value: "k = 4" },
              { label: "Amostra", value: isLoading ? "…" : `${totalFundos} fundos (FII e FIAGRO)` },
              { label: "Atualização", value: "Manual" },
            ].map(({ label, value }) => (
              <div key={label} className="min-w-0">
                <p className="text-muted-foreground">{label}</p>
                <p className="break-words font-medium text-foreground">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
        Clusters identificados
      </h2>

      <div data-tour="clusters-grupos" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                    <p className="font-semibold text-foreground">{c.nome_interpretado}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Perfil {c.perfil_risco} · {c.num_fiis} {c.num_fiis === 1 ? "fundo" : "fundos"}
                  </span>
                  {/* A descrição textual repetia as três médias abaixo (e em formato decimal inglês). */}
                  <div className="my-3 grid grid-cols-3 gap-2 text-sm">
                    <div><p className="text-xs text-muted-foreground">DY médio</p><p className="font-medium tabular-nums">{fmtPct(c.dy_medio)}</p></div>
                    <div><p className="text-xs text-muted-foreground">Volatilidade</p><p className="font-medium tabular-nums">{fmtPct(c.volatilidade_media)}</p></div>
                    <div><p className="text-xs text-muted-foreground">P/VP médio</p><p className="font-medium tabular-nums">{c.p_vp_medio !== null ? fmtPvp.format(c.p_vp_medio) : "—"}</p></div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {c.tickers.map((t) => (
                      <span key={t} className="rounded border border-border/60 bg-card/60 px-1.5 py-0.5 font-mono text-xs text-foreground">{t}</span>
                    ))}
                  </div>
                </div>
              );
            })}
      </div>
    </div>
  );
}
