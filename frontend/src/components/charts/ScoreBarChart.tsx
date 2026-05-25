import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { Classificacao } from "@/types/domain";

interface Props {
  distribuicao: Record<Classificacao, number>;
}

const DADOS_ORDEM: Array<{ chave: Classificacao; cor: string }> = [
  { chave: "Excelente", cor: "#10b981" },
  { chave: "Bom",       cor: "#3b82f6" },
  { chave: "Regular",   cor: "#f59e0b" },
  { chave: "Evitar",    cor: "#ef4444" },
];

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 shadow-lg text-sm">
      <p className="font-medium text-gray-900 dark:text-gray-50">{label}</p>
      <p className="text-gray-500 dark:text-gray-400">{payload[0].value} FIIs</p>
    </div>
  );
}

export function ScoreBarChart({ distribuicao }: Props) {
  const dados = DADOS_ORDEM.map(({ chave, cor }) => ({
    nome: chave,
    valor: distribuicao[chave],
    cor,
  }));

  return (
    <ResponsiveContainer width="100%" height={120}>
      <BarChart data={dados} barSize={32} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
        <XAxis
          dataKey="nome"
          tick={{ fontSize: 11, fill: "currentColor" }}
          axisLine={false}
          tickLine={false}
          className="text-gray-500 dark:text-gray-400"
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: "currentColor" }}
          axisLine={false}
          tickLine={false}
          className="text-gray-500 dark:text-gray-400"
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "transparent" }} />
        <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
          {dados.map((entry) => (
            <Cell key={entry.nome} fill={entry.cor} opacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
