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
        <YAxis type="category" dataKey="ticker" width={64} tick={{ fontSize: 12 }} />
        <Tooltip
          formatter={(v: number | string | readonly (number | string)[]) =>
            `R$ ${Number(v).toFixed(2)}/mês`
          }
        />
        <Bar dataKey="renda" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
