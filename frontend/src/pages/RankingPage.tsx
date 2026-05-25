import { useRanking } from "@/hooks/useRanking";
import { ClassificacaoBadge } from "@/components/ClassificacaoBadge";
import { Divider } from "@/components/ui/Divider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Classificacao } from "@/types/domain";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

type FiltroOpcao = Classificacao | "Todas";

const OPCOES_FILTRO: Array<{ valor: FiltroOpcao; rotulo: string }> = [
  { valor: "Todas", rotulo: "Todas" },
  { valor: "Excelente", rotulo: "Excelente" },
  { valor: "Bom", rotulo: "Bom" },
  { valor: "Regular", rotulo: "Regular" },
  { valor: "Evitar", rotulo: "Evitar" },
];

const SCORE_COLOR: Record<Classificacao, string> = {
  Excelente: "text-emerald-600 dark:text-emerald-400",
  Bom: "text-blue-600 dark:text-blue-400",
  Regular: "text-amber-600 dark:text-amber-400",
  Evitar: "text-red-600 dark:text-red-400",
};

function fmt(v: number | null, suffix = "", decimals = 1): string {
  return v !== null ? `${v.toFixed(decimals)}${suffix}` : "—";
}

export function RankingPage() {
  const { fundos, filtro, setFiltro, busca, setBusca } = useRanking();

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">
            Ranking de FIIs
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {fundos.length} fundo{fundos.length !== 1 ? "s" : ""} encontrado
            {fundos.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <Divider />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar ticker ou nome..."
            className={cn(
              "w-full sm:w-64 rounded-lg border py-2 pl-9 pr-3 text-sm outline-none transition-colors",
              "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
              "text-gray-900 dark:text-gray-50 placeholder:text-gray-400",
              "focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            )}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {OPCOES_FILTRO.map(({ valor, rotulo }) => (
            <button
              key={valor}
              onClick={() => setFiltro(valor as FiltroOpcao)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-medium transition-all",
                filtro === valor
                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
              )}
            >
              {rotulo}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#090E1A] shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-200 dark:border-gray-800 hover:bg-transparent">
              <TableHead className="w-10 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
                #
              </TableHead>
              <TableHead className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Ticker
              </TableHead>
              <TableHead className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Segmento
              </TableHead>
              <TableHead className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Score
              </TableHead>
              <TableHead className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Classificação
              </TableHead>
              <TableHead className="text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                DY Atual
              </TableHead>
              <TableHead className="text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                P/VP
              </TableHead>
              <TableHead className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 hidden lg:table-cell">
                Vacância
              </TableHead>
              <TableHead className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 hidden xl:table-cell">
                Volatilidade
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fundos.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center py-16 text-gray-400 dark:text-gray-500"
                >
                  Nenhum FII encontrado para esta classificação.
                </TableCell>
              </TableRow>
            ) : (
              fundos.map((fundo, i) => (
                <TableRow
                  key={fundo.ticker}
                  className="border-gray-100 dark:border-gray-800/60 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                >
                  <TableCell className="text-center text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                    {i + 1}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-mono font-semibold text-sm text-gray-900 dark:text-gray-50">
                        {fundo.ticker}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[120px]">
                        {fundo.nome}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500 dark:text-gray-400">
                    {fundo.segmento ?? "—"}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "font-bold tabular-nums text-sm",
                        SCORE_COLOR[fundo.classificacao]
                      )}
                    >
                      {fundo.score.toFixed(1)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <ClassificacaoBadge classificacao={fundo.classificacao} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm text-gray-700 dark:text-gray-300">
                    {fmt(fundo.dy_atual, "%")}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm text-gray-700 dark:text-gray-300">
                    {fmt(fundo.p_vp, "", 2)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm text-gray-700 dark:text-gray-300 hidden lg:table-cell">
                    {fundo.vacancia_fisica !== null
                      ? fmt(fundo.vacancia_fisica, "%")
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm text-gray-700 dark:text-gray-300 hidden xl:table-cell">
                    {fmt(fundo.volatilidade_12m, "%")}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
