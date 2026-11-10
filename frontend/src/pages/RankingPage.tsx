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
import { useRegistrarTour } from "@/hooks/useRegistrarTour";
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
import { compararClassificacao, mensagemRankingVazio } from "@/lib/ranking";
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
  if (score >= 80) return "text-emerald-700 dark:text-emerald-400";
  if (score >= 60) return "text-blue-700 dark:text-blue-400";
  if (score >= 40) return "text-amber-700 dark:text-amber-400";
  return "text-red-700 dark:text-red-400";
}

const fmtNum = (casas: number) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

function fmt(v: number | null, suffix = "", decimals = 1): string {
  return v !== null ? `${fmtNum(decimals).format(v)}${suffix}` : "—";
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
    <ChevronsUpDown className="ml-1 inline h-3.5 w-3.5 text-muted-foreground/70" />
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
        className="-my-2 -ml-1 flex h-11 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
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
    cell: ({ row, table }) => (
      <span data-testid="posicao" className="text-xs tabular-nums text-muted-foreground">
        {table.options.meta?.posicoes?.get(row.original.ticker) ?? "—"}
      </span>
    ),
    enableSorting: false,
  }),

  // Ticker + Nome
  columnHelper.accessor("ticker", {
    header: "Ticker",
    cell: ({ row }) => (
      <div>
        <p className="font-mono font-semibold text-sm text-foreground">
          {row.original.ticker}
        </p>
        <p className="max-w-[104px] truncate text-xs text-muted-foreground sm:max-w-[160px]">
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
      <span className="text-sm text-muted-foreground">
        {getValue() ?? "—"}
      </span>
    ),
    meta: { hidden: "lg" },
  }),

  // Score
  columnHelper.accessor("score", {
    header: "Score",
    cell: ({ getValue, row }) => {
      const v = getValue();
      return (
        <div className="flex flex-col items-start gap-1">
          <span data-tour="ranking-score" className={cn("font-bold tabular-nums text-sm", scoreColor(v))}>
            {fmt(v)}
          </span>
          <ClassificacaoBadge classificacao={row.original.classificacao} className="md:hidden" />
        </div>
      );
    },
  }),

  // Classificação
  columnHelper.accessor("classificacao", {
    header: "Classificação",
    cell: ({ getValue }) => <ClassificacaoBadge classificacao={getValue()} />,
    sortingFn: (a, b, id) =>
      compararClassificacao(a.getValue(id), b.getValue(id)),
    meta: { hidden: "md" },
  }),

  // DY Atual
  columnHelper.accessor("dy_atual", {
    header: "DY Atual",
    cell: ({ getValue }) => (
      <span className="text-sm tabular-nums text-foreground">
        {fmt(getValue(), "%")}
      </span>
    ),
    meta: { align: "right", hidden: "md" },
  }),

  // P/VP
  columnHelper.accessor("p_vp", {
    header: "P/VP",
    cell: ({ getValue }) => (
      <span className="text-sm tabular-nums text-foreground">
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
      <span className="text-sm tabular-nums text-foreground">
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
      <span className="text-sm tabular-nums text-foreground">
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
  useRegistrarTour("analise-ranking");
  const { fundos, posicoes, filtro, setFiltro, busca, setBusca, isLoading, isError } = useRanking();

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
    meta: { posicoes },
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
          <Search aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            aria-label="Buscar fundo por ticker ou nome"
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPagination((prev) => ({ ...prev, pageIndex: 0 }));
            }}
            placeholder="Buscar ticker ou nome..."
            className={cn(
              "min-h-11 w-full sm:w-64 rounded-lg border py-2 pl-9 pr-3 text-sm outline-none transition-colors",
              "bg-card border-border",
              "text-foreground placeholder:text-muted-foreground",
              "focus:border-primary focus:ring-1 focus:ring-ring"
            )}
          />
        </div>
        <div
          role="group"
          aria-label="Filtrar por classificação"
          className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden"
        >
          {OPCOES_FILTRO.map(({ valor, rotulo }) => (
            <button
              key={valor}
              type="button"
              aria-pressed={filtro === valor}
              onClick={() => {
                setFiltro(valor as FiltroOpcao);
                setPagination((prev) => ({ ...prev, pageIndex: 0 }));
              }}
              className={cn(
                "min-h-11 shrink-0 rounded-full px-4 text-sm font-medium transition-colors",
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
                className="border-border hover:bg-transparent"
              >
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta;
                  const align = meta?.align;
                  const hidden = meta?.hidden;
                  const mobileOnly = meta?.mobileOnly;

                  const sorted = header.column.getIsSorted();
                  const conteudo = flexRender(header.column.columnDef.header, header.getContext());

                  return (
                    <TableHead
                      key={header.id}
                      aria-sort={
                        sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined
                      }
                      className={cn(
                        "text-xs font-medium text-muted-foreground select-none",
                        align === "right" && "text-right",
                        hidden === "md" && "hidden md:table-cell",
                        hidden === "lg" && "hidden lg:table-cell",
                        hidden === "xl" && "hidden xl:table-cell",
                        mobileOnly && "md:hidden"
                      )}
                    >
                      {header.column.getCanSort() ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="-mx-1 inline-flex min-h-11 items-center rounded px-1 hover:text-foreground"
                        >
                          {conteudo}
                          <SortIcon direction={sorted} />
                        </button>
                      ) : (
                        conteudo
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
                  className="py-16 text-center text-muted-foreground"
                >
                  {mensagemRankingVazio(busca, filtro)}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => {
                return (
                  <Fragment key={row.id}>
                    <TableRow className="border-border/60 transition-colors hover:bg-muted/40">
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
                      <TableRow className="border-border/60 hover:bg-transparent md:hidden">
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
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm text-muted-foreground">
          <p className="text-xs">
            Mostrando {firstRow}–{lastRow} de {totalRows} fundo
            {totalRows !== 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className={cn(
                "inline-flex min-h-11 items-center gap-1 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition-colors",
                table.getCanPreviousPage()
                  ? "hover:bg-muted"
                  : "cursor-not-allowed opacity-50"
              )}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Anterior
            </button>

            <span className="text-xs px-1">
              Página {pageIndex + 1} de {pageCount === 0 ? 1 : pageCount}
            </span>

            <button
              type="button"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className={cn(
                "inline-flex min-h-11 items-center gap-1 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition-colors",
                table.getCanNextPage()
                  ? "hover:bg-muted"
                  : "cursor-not-allowed opacity-50"
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
