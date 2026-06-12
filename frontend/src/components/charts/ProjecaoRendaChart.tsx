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
          tick={{ fontSize: 10 }}
          tickFormatter={(m: number) => `${Math.round(m / 12)}a`}
          interval="preserveStartEnd"
        />
        <YAxis hide />
        <Tooltip
          formatter={(v: number | string | readonly (number | string)[]) => `R$ ${Number(v).toFixed(2)}/mês`}
          labelFormatter={(m: number) => `Mês ${m}`}
        />
        {rendaAlvo != null && rendaAlvo > 0 && (
          <ReferenceLine
            y={rendaAlvo}
            stroke="hsl(var(--accent-foreground))"
            strokeDasharray="4 4"
            label={{ value: "meta", position: "insideTopRight", fontSize: 10 }}
          />
        )}
        <Area dataKey="renda" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.18} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
