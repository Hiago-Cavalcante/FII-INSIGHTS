import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Search } from "lucide-react";
import { getRanking } from "@/api/endpoints/ranking";
import { usePerfilStore } from "@/stores/perfilStore";
import { ClasseBadge } from "@/components/ui/ClasseBadge";
import { ClassificacaoBadge } from "@/components/ClassificacaoBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { indiceMelhor, type Direcao } from "@/lib/comparador";
import { cn } from "@/lib/utils";
import type { RankingItem } from "@/types/ranking";

const MAX_FUNDOS = 4;

interface Metrica {
  label: string;
  dir: Direcao;
  get: (f: RankingItem) => number | null;
  fmt: (v: number) => string;
}

const num = (v: number, casas: number) => v.toFixed(casas).replace(".", ",");
const pctFmt = (v: number) => `${num(v, 1)}%`;

const METRICAS: Metrica[] = [
  { label: "Score", dir: "max", get: (f) => f.score, fmt: (v) => num(v, 1) },
  { label: "DY atual", dir: "max", get: (f) => f.dy_atual, fmt: pctFmt },
  { label: "DY 12m", dir: "max", get: (f) => f.dy_12m, fmt: pctFmt },
  { label: "P/VP", dir: "min", get: (f) => f.p_vp, fmt: (v) => num(v, 2) },
  { label: "Vacância", dir: "min", get: (f) => f.vacancia_fisica, fmt: pctFmt },
  { label: "Liquidez (R$ mi)", dir: "max", get: (f) => f.liquidez_diaria, fmt: (v) => num(v, 1) },
  { label: "Volatilidade", dir: "min", get: (f) => f.volatilidade_12m, fmt: pctFmt },
  { label: "PL (R$ bi)", dir: "max", get: (f) => f.patrimonio_liquido, fmt: (v) => num(v, 2) },
  { label: "Cotistas (mil)", dir: "max", get: (f) => f.num_cotistas, fmt: (v) => num(v, 0) },
];

export function ComparadorPage() {
  const tipo = usePerfilStore((s) => s.tipo);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["ranking", tipo],
    queryFn: () => getRanking(tipo),
  });

  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [busca, setBusca] = useState("");

  const fundos = useMemo(() => data ?? [], [data]);

  const selecionadosFundos = useMemo(
    () => selecionados.map((t) => fundos.find((f) => f.ticker === t)).filter((f): f is RankingItem => f != null),
    [selecionados, fundos]
  );

  const sugestoes = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (termo === "") return [];
    return fundos
      .filter(
        (f) =>
          !selecionados.includes(f.ticker) &&
          (f.ticker.toLowerCase().includes(termo) || (f.nome ?? "").toLowerCase().includes(termo))
      )
      .slice(0, 6);
  }, [busca, fundos, selecionados]);

  const adicionar = (ticker: string) => {
    if (selecionados.length >= MAX_FUNDOS || selecionados.includes(ticker)) return;
    setSelecionados((s) => [...s, ticker]);
    setBusca("");
  };
  const remover = (ticker: string) => setSelecionados((s) => s.filter((t) => t !== ticker));

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (isError) return <ErrorState message="Não foi possível carregar os fundos para comparar." />;

  return (
    <div className="flex flex-col gap-4">
      {/* Seleção */}
      <div className="flex flex-col gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            disabled={selecionados.length >= MAX_FUNDOS}
            placeholder={
              selecionados.length >= MAX_FUNDOS ? `Máximo de ${MAX_FUNDOS} fundos` : "Buscar ticker ou nome…"
            }
            className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-ring disabled:opacity-50"
          />
          {sugestoes.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-border bg-card shadow-lg">
              {sugestoes.map((f) => (
                <li key={f.ticker}>
                  <button
                    type="button"
                    onClick={() => adicionar(f.ticker)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
                  >
                    <span className="font-mono font-semibold text-foreground">{f.ticker}</span>
                    <span className="truncate pl-2 text-xs text-muted-foreground">{f.nome}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {selecionadosFundos.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selecionadosFundos.map((f) => (
              <span
                key={f.ticker}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
              >
                {f.ticker}
                <button type="button" onClick={() => remover(f.ticker)} aria-label={`Remover ${f.ticker}`}>
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Comparação */}
      {selecionadosFundos.length < 2 ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Selecione ao menos 2 fundos para comparar lado a lado (até {MAX_FUNDOS}).
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="p-3 text-left text-xs font-medium text-muted-foreground">Métrica</th>
                {selecionadosFundos.map((f) => (
                  <th key={f.ticker} className="p-3 text-right">
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-mono font-semibold text-foreground">{f.ticker}</span>
                      <ClasseBadge classe={f.classe} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/60">
                <td className="p-3 text-muted-foreground">Classificação</td>
                {selecionadosFundos.map((f) => (
                  <td key={f.ticker} className="p-3 text-right">
                    <ClassificacaoBadge classificacao={f.classificacao} />
                  </td>
                ))}
              </tr>
              {METRICAS.map((m) => {
                const valores = selecionadosFundos.map((f) => m.get(f));
                const melhor = indiceMelhor(valores, m.dir);
                return (
                  <tr key={m.label} className="border-b border-border/60 last:border-0">
                    <td className="p-3 text-muted-foreground">{m.label}</td>
                    {valores.map((v, i) => (
                      <td
                        key={selecionadosFundos[i].ticker}
                        className={cn(
                          "p-3 text-right tabular-nums",
                          i === melhor ? "font-bold text-primary" : "text-foreground"
                        )}
                      >
                        {v != null ? m.fmt(v) : "—"}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
