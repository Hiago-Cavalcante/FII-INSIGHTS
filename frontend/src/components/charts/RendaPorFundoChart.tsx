import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { FundoRenda } from "@/api/endpoints/dividendos";

export function RendaPorFundoChart({ porFundo }: { porFundo: FundoRenda[] }) {
  const dados = porFundo
    .filter((f) => !f.sem_dados)
    .map((f) => ({ ticker: f.ticker, renda: Number(f.renda_mensal) }));

  if (dados.length === 0)
    return <p className="text-xs text-muted-foreground">Sem dados de proventos para os fundos da carteira.</p>;

  return (
    <ResponsiveContainer width="100%" height={Math.max(120, dados.length * 40)}>
      <BarChart data={dados} layout="vertical" margin={{ left: 8, right: 8 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="ticker"
          width={64}
          className="text-muted-foreground"
          tick={{ fontSize: 12, fill: "currentColor" }}
        />
        <Tooltip
          cursor={{ fill: "#94a3b8", fillOpacity: 0.15 }}
          contentStyle={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "0.5rem",
            color: "var(--foreground)",
            fontSize: "0.75rem",
          }}
          labelStyle={{ color: "var(--foreground)" }}
          itemStyle={{ color: "var(--foreground)" }}
          formatter={(v: number | string | readonly (number | string)[]) =>
            `R$ ${Number(v).toFixed(2)}/mês`
          }
        />
        <Bar
          className="text-primary"
          dataKey="renda"
          fill="currentColor"
          radius={[0, 4, 4, 0]}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
