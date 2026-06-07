import { useState } from "react";
import { cn } from "@/lib/utils";
import { RankingPage } from "./RankingPage";
import { ClustersPage } from "./ClustersPage";

type Sub = "ranking" | "clusters";

export function AnalisePage() {
  const [sub, setSub] = useState<Sub>("ranking");
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">Análise</h1>
      <div role="tablist" className="flex gap-2">
        {(["ranking", "clusters"] as const).map((s) => (
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
            {s === "ranking" ? "Ranking" : "Clusters"}
          </button>
        ))}
      </div>
      {sub === "ranking" ? <RankingPage /> : <ClustersPage />}
    </div>
  );
}
