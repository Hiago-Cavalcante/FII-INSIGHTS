import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { PontoProjecao } from "@/lib/simulador";

interface Props {
  serie: PontoProjecao[];
  rendaAlvo?: number | null;
}

export function ProjecaoRendaChart({ serie, rendaAlvo }: Props) {
  if (serie.length === 0)
    return <p className="text-xs text-muted-foreground">Ajuste os parâmetros para ver a projeção.</p>;

  const dados = serie.map((p) => ({ mes: p.mes, renda: p.renda }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={dados} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <XAxis
          dataKey="mes"
          className="text-muted-foreground"
          tick={{ fontSize: 10, fill: "currentColor" }}
          tickFormatter={(m: number) => `${Math.round(m / 12)}a`}
          interval="preserveStartEnd"
        />
        <YAxis hide />
        <Tooltip
          contentStyle={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "0.5rem",
            color: "var(--foreground)",
            fontSize: "0.75rem",
          }}
          labelStyle={{ color: "var(--foreground)" }}
          itemStyle={{ color: "var(--foreground)" }}
          formatter={(v: number | string | readonly (number | string)[]) => `R$ ${Number(v).toFixed(2)}/mês`}
          labelFormatter={(m: number) => `Mês ${m}`}
        />
        {rendaAlvo != null && rendaAlvo > 0 && (
          <ReferenceLine
            y={rendaAlvo}
            stroke="#f59e0b"
            strokeDasharray="4 4"
            label={{ value: "meta", position: "insideTopRight", fontSize: 10, fill: "#b45309" }}
          />
        )}
        <Area
          className="text-primary"
          dataKey="renda"
          stroke="currentColor"
          fill="currentColor"
          fillOpacity={0.2}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
