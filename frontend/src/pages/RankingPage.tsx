import { useState, useMemo, useEffect, Fragment, type ReactNode } from "react";
import {
  createColumnHelper,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getExpandedRowModel,
  useReactTable,
  flexRender,
  type SortingState,
  type PaginationState,
} from "@tanstack/react-table";
import { useRanking } from "@/hooks/useRanking";
import { ClassificacaoBadge } from "@/components/ClassificacaoBadge";
import { ClasseBadge } from "@/components/ui/ClasseBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Classificacao } from "@/types/domain";
import type { RankingItem } from "@/types/ranking";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
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

/**
 * Métricas exibidas no painel de detalhe (mobile): as colunas que ficam
 * escondidas no celular + indicadores extras que nem aparecem na tabela.
 */
function detalhesMobile(f: RankingItem): Array<{ label: string; value: ReactNode }> {
  return [
    { label: "Classe", value: <ClasseBadge classe={f.classe} /> },
    { label: "Segmento", value: f.segmento ?? "—" },
    { label: "DY atual", value: fmt(f.dy_atual, "%") },
    { label: "DY 12m", value: fmt(f.dy_12m, "%") },
    { label: "P/VP", value: fmt(f.p_vp, "", 2) },
    { label: "Vacância", value: fmt(f.vacancia_fisica, "%") },
    { label: "Volatilidade", value: fmt(f.volatilidade_12m, "%") },
    { label: "Liquidez (R$ mi)", value: fmt(f.liquidez_diaria, "", 1) },
  ];
}

// ---------------------------------------------------------------------------
// Column helper
// ---------------------------------------------------------------------------

const columnHelper = createColumnHelper<RankingItem>();

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
  // Expander — só no mobile. Abre o painel de detalhe com as métricas que
  // ficam escondidas no celular (DY 12m, Liquidez, etc.).
  columnHelper.display({
    id: "expander",
    header: () => null,
    cell: ({ row }) => (
      <button
        type="button"
        aria-label={`Detalhes de ${row.original.ticker}`}
        aria-expanded={row.getIsExpanded()}
        onClick={row.getToggleExpandedHandler()}
        className="flex items-center justify-center rounded-md p-1 text-gray-400 hover:bg-gray-100 dark:text-gray-500 dark:hover:bg-gray-800"
      >
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform",
            row.getIsExpanded() && "rotate-180"
          )}
        />
      </button>
    ),
    enableSorting: false,
    meta: { mobileOnly: true },
  }),

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

  // Classe (FII / FIAGRO) — evidencia o scoring diferenciado por classe (RF-14)
  columnHelper.accessor("classe", {
    header: "Classe",
    cell: ({ getValue }) => <ClasseBadge classe={getValue()} />,
    meta: { hidden: "md" },
  }),

  // Segmento
  columnHelper.accessor("segmento", {
    header: "Segmento",
    cell: ({ getValue }) => (
      <span className="text-sm text-gray-500 dark:text-gray-400">
        {getValue() ?? "—"}
      </span>
    ),
    meta: { hidden: "lg" },
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
    meta: { align: "right", hidden: "md" },
  }),

  // P/VP
  columnHelper.accessor("p_vp", {
    header: "P/VP",
    cell: ({ getValue }) => (
      <span className="text-sm tabular-nums text-gray-700 dark:text-gray-300">
        {fmt(getValue(), "", 2)}
      </span>
    ),
    meta: { align: "right", hidden: "md" },
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
  const { fundos, filtro, setFiltro, busca, setBusca, isLoading, isError } = useRanking();

  const [sorting, setSorting] = useState<SortingState>([
    { id: "score", desc: true },
  ]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  // Reseta para a primeira página quando o conjunto de fundos muda (ex: troca de perfil)
  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [fundos]);

  // Memoiza colunas para evitar recriação a cada render
  const memoColumns = useMemo(() => columns, []);

  // eslint-disable-next-line react-hooks/incompatible-library -- API do TanStack Table não é memoizável; uso intencional
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
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => true,
  });

  // Informações de paginação para exibição
  const { pageIndex, pageSize } = table.getState().pagination;
  const totalRows = table.getFilteredRowModel().rows.length;
  const firstRow = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
  const lastRow = Math.min((pageIndex + 1) * pageSize, totalRows);
  const pageCount = table.getPageCount();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }
  if (isError) {
    return <ErrorState message="Não foi possível carregar o ranking." />;
  }

  return (
    <div>
      {/* contagem (o título "Análise" vem da aba que envolve esta página) */}
      <p className="mb-3 text-sm text-muted-foreground">
        {fundos.length} fundo{fundos.length !== 1 ? "s" : ""} encontrado
        {fundos.length !== 1 ? "s" : ""}
      </p>

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
              "bg-card border-border",
              "text-foreground placeholder:text-muted-foreground",
              "focus:border-primary focus:ring-1 focus:ring-ring"
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
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground border border-border hover:bg-muted"
              )}
            >
              {rotulo}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="border-gray-200 dark:border-gray-800 hover:bg-transparent"
              >
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta;
                  const align = meta?.align;
                  const hidden = meta?.hidden;
                  const mobileOnly = meta?.mobileOnly;

                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        "text-xs font-medium text-gray-500 dark:text-gray-400 select-none",
                        align === "right" && "text-right",
                        hidden === "md" && "hidden md:table-cell",
                        hidden === "lg" && "hidden lg:table-cell",
                        hidden === "xl" && "hidden xl:table-cell",
                        mobileOnly && "md:hidden",
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
                  Nenhum fundo encontrado para esta classificação.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => {
                return (
                  <Fragment key={row.id}>
                    <TableRow className="border-gray-100 dark:border-gray-800/60 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                      {row.getVisibleCells().map((cell) => {
                        const meta = cell.column.columnDef.meta;
                        const align = meta?.align;
                        const hidden = meta?.hidden;
                        const mobileOnly = meta?.mobileOnly;

                        return (
                          <TableCell
                            key={cell.id}
                            className={cn(
                              align === "right" && "text-right",
                              hidden === "md" && "hidden md:table-cell",
                              hidden === "lg" && "hidden lg:table-cell",
                              hidden === "xl" && "hidden xl:table-cell",
                              mobileOnly && "md:hidden"
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

                    {/* Painel de detalhe — só no mobile (no desktop as colunas já aparecem) */}
                    {row.getIsExpanded() && (
                      <TableRow className="border-gray-100 dark:border-gray-800/60 hover:bg-transparent md:hidden">
                        <TableCell colSpan={row.getVisibleCells().length} className="bg-muted/30 p-0">
                          <dl
                            data-testid={`detalhe-${row.original.ticker}`}
                            className="grid grid-cols-2 gap-x-6 gap-y-2.5 px-4 py-3"
                          >
                            {detalhesMobile(row.original).map(({ label, value }) => (
                              <div
                                key={label}
                                className="flex items-center justify-between gap-2 text-sm"
                              >
                                <dt className="text-muted-foreground">{label}</dt>
                                <dd className="font-medium tabular-nums text-foreground">
                                  {value}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
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
