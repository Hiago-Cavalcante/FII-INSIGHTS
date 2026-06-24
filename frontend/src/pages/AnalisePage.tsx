import { useState } from "react";
import { useLocation } from "react-router-dom";
import { lerTabDoEstado } from "@/lib/navTab";
import { cn } from "@/lib/utils";
import { RankingPage } from "./RankingPage";
import { ClustersPage } from "./ClustersPage";
import { ComparadorPage } from "./ComparadorPage";

type Sub = "ranking" | "clusters" | "comparar";

const SUBS: readonly Sub[] = ["ranking", "clusters", "comparar"];

const ROTULOS: Record<Sub, string> = {
  ranking: "Ranking",
  clusters: "Clusters",
  comparar: "Comparar",
};

export function AnalisePage() {
  const location = useLocation();
  const [sub, setSub] = useState<Sub>(
    () => (lerTabDoEstado(location.state, SUBS) as Sub | null) ?? "ranking"
  );
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">Análise</h1>
      <div role="tablist" className="flex gap-2">
        {(["ranking", "clusters", "comparar"] as const).map((s) => (
          <button
            key={s}
            role="tab"
            aria-selected={sub === s}
            onClick={() => setSub(s)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium",
              sub === s
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            {ROTULOS[s]}
          </button>
        ))}
      </div>
      {sub === "ranking" && <RankingPage />}
      {sub === "clusters" && <ClustersPage />}
      {sub === "comparar" && <ComparadorPage />}
    </div>
  );
}
