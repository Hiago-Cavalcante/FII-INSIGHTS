import { useState, useMemo } from "react";
import {
  createColumnHelper,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
  flexRender,
  type SortingState,
  type PaginationState,
} from "@tanstack/react-table";
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
import type { Classificacao, FundoRanqueado } from "@/types/domain";
import { cn } from "@/lib/utils";
import {
  Search,
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Tipos e constantes
// ---------------------------------------------------------------------------

type FiltroOpcao = Classificacao | "Todas";

const OPCOES_FILTRO: Array<{ valor: FiltroOpcao; rotulo: string }> = [
  { valor: "Todas", rotulo: "Todas" },
  { valor: "Excelente", rotulo: "Excelente" },
  { valor: "Bom", rotulo: "Bom" },
  { valor: "Regular", rotulo: "Regular" },
  { valor: "Evitar", rotulo: "Evitar" },
];

function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-blue-600 dark:text-blue-400";
  if (score >= 40) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function fmt(v: number | null, suffix = "", decimals = 1): string {
  return v !== null ? `${v.toFixed(decimals)}${suffix}` : "—";
}

// ---------------------------------------------------------------------------
// Column helper
// ---------------------------------------------------------------------------

const columnHelper = createColumnHelper<FundoRanqueado>();

// ---------------------------------------------------------------------------
// SortIcon — ícone de ordenação no cabeçalho
// ---------------------------------------------------------------------------

function SortIcon({ direction }: { direction: "asc" | "desc" | false }) {
  if (direction === "asc")
    return <ChevronUp className="ml-1 inline h-3.5 w-3.5" />;
  if (direction === "desc")
    return <ChevronDown className="ml-1 inline h-3.5 w-3.5" />;
  return (
    <ChevronsUpDown className="ml-1 inline h-3.5 w-3.5 text-gray-400 dark:text-gray-600" />
  );
}

// ---------------------------------------------------------------------------
// Colunas
// ---------------------------------------------------------------------------

const columns = [
  // Coluna de posição (display column)
  columnHelper.display({
    id: "posicao",
    header: "#",
    cell: ({ row, table }) => {
      const sortedRows = table.getSortedRowModel().rows;
      const pos = sortedRows.indexOf(row) + 1;
      return (
        <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
          {pos}
        </span>
      );
    },
    enableSorting: false,
  }),

  // Ticker + Nome
  columnHelper.accessor("ticker", {
    header: "Ticker",
    cell: ({ row }) => (
      <div>
        <p className="font-mono font-semibold text-sm text-gray-900 dark:text-gray-50">
          {row.original.ticker}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[120px]">
          {row.original.nome}
        </p>
      </div>
    ),
  }),

  // Segmento
  columnHelper.accessor("segmento", {
    header: "Segmento",
    cell: ({ getValue }) => (
      <span className="text-sm text-gray-500 dark:text-gray-400">
        {getValue() ?? "—"}
      </span>
    ),
  }),

  // Score
  columnHelper.accessor("score", {
    header: "Score",
    cell: ({ getValue }) => {
      const v = getValue();
      return (
        <span className={cn("font-bold tabular-nums text-sm", scoreColor(v))}>
          {v.toFixed(1)}
        </span>
      );
    },
  }),

  // Classificação
  columnHelper.accessor("classificacao", {
    header: "Classificação",
    cell: ({ getValue }) => <ClassificacaoBadge classificacao={getValue()} />,
  }),

  // DY Atual
  columnHelper.accessor("dy_atual", {
    header: "DY Atual",
    cell: ({ getValue }) => (
      <span className="text-sm tabular-nums text-gray-700 dark:text-gray-300">
        {fmt(getValue(), "%")}
      </span>
    ),
    meta: { align: "right" },
  }),

  // P/VP
  columnHelper.accessor("p_vp", {
    header: "P/VP",
    cell: ({ getValue }) => (
      <span className="text-sm tabular-nums text-gray-700 dark:text-gray-300">
        {fmt(getValue(), "", 2)}
      </span>
    ),
    meta: { align: "right" },
  }),

  // Vacância Física (hidden < lg)
  columnHelper.accessor("vacancia_fisica", {
    id: "vacancia_fisica",
    header: "Vacância",
    cell: ({ getValue }) => (
      <span className="text-sm tabular-nums text-gray-700 dark:text-gray-300">
        {getValue() !== null ? fmt(getValue(), "%") : "—"}
      </span>
    ),
    meta: { align: "right", hidden: "lg" },
  }),

  // Volatilidade (hidden < xl)
  columnHelper.accessor("volatilidade_12m", {
    id: "volatilidade_12m",
    header: "Volatilidade",
    cell: ({ getValue }) => (
      <span className="text-sm tabular-nums text-gray-700 dark:text-gray-300">
        {fmt(getValue(), "%")}
      </span>
    ),
    meta: { align: "right", hidden: "xl" },
  }),
];

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function RankingPage() {
  const { fundos, filtro, setFiltro, busca, setBusca } = useRanking();

  const [sorting, setSorting] = useState<SortingState>([
    { id: "score", desc: true },
  ]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  // Memoiza colunas para evitar recriação a cada render
  const memoColumns = useMemo(() => columns, []);

  const table = useReactTable({
    data: fundos,
    columns: memoColumns,
    state: { sorting, pagination },
    onSortingChange: (updater) => {
      setSorting(updater);
      // Volta à primeira página ao reordenar
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      sorting: [{ id: "score", desc: true }],
      pagination: { pageIndex: 0, pageSize: 10 },
    },
  });

  // Informações de paginação para exibição
  const { pageIndex, pageSize } = table.getState().pagination;
  const totalRows = table.getFilteredRowModel().rows.length;
  const firstRow = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
  const lastRow = Math.min((pageIndex + 1) * pageSize, totalRows);
  const pageCount = table.getPageCount();

  return (
    <div>
      {/* Cabeçalho da página */}
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

      {/* Busca e filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPagination((prev) => ({ ...prev, pageIndex: 0 }));
            }}
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
              onClick={() => {
                setFiltro(valor as FiltroOpcao);
                setPagination((prev) => ({ ...prev, pageIndex: 0 }));
              }}
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

      {/* Tabela */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#090E1A] shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="border-gray-200 dark:border-gray-800 hover:bg-transparent"
              >
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta as
                    | { align?: string; hidden?: string }
                    | undefined;
                  const align = meta?.align;
                  const hidden = meta?.hidden;

                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        "text-xs font-medium text-gray-500 dark:text-gray-400 select-none",
                        align === "right" && "text-right",
                        hidden === "lg" && "hidden lg:table-cell",
                        hidden === "xl" && "hidden xl:table-cell",
                        header.column.getCanSort() &&
                          "cursor-pointer hover:text-gray-900 dark:hover:text-gray-100"
                      )}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {header.column.getCanSort() && (
                        <SortIcon
                          direction={header.column.getIsSorted()}
                        />
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center py-16 text-gray-400 dark:text-gray-500"
                >
                  Nenhum FII encontrado para esta classificação.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => {
                return (
                  <TableRow
                    key={row.id}
                    className="border-gray-100 dark:border-gray-800/60 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => {
                      const meta = cell.column.columnDef.meta as
                        | { align?: string; hidden?: string }
                        | undefined;
                      const align = meta?.align;
                      const hidden = meta?.hidden;

                      return (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            align === "right" && "text-right",
                            hidden === "lg" && "hidden lg:table-cell",
                            hidden === "xl" && "hidden xl:table-cell"
                          )}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginação */}
      {totalRows > 0 && (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm text-gray-500 dark:text-gray-400">
          <p className="text-xs">
            Mostrando {firstRow}–{lastRow} de {totalRows} fundo
            {totalRows !== 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                "border-gray-200 dark:border-gray-700",
                table.getCanPreviousPage()
                  ? "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                  : "bg-gray-50 dark:bg-gray-800/50 text-gray-300 dark:text-gray-600 cursor-not-allowed"
              )}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Anterior
            </button>

            <span className="text-xs px-1">
              Página {pageIndex + 1} de {pageCount === 0 ? 1 : pageCount}
            </span>

            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                "border-gray-200 dark:border-gray-700",
                table.getCanNextPage()
                  ? "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                  : "bg-gray-50 dark:bg-gray-800/50 text-gray-300 dark:text-gray-600 cursor-not-allowed"
              )}
            >
              Próxima
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
