import "@tanstack/react-table";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    align?: "left" | "right";
    hidden?: "md" | "lg" | "xl";
    /** Coluna visível apenas no mobile (escondida a partir de `md`). */
    mobileOnly?: boolean;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface TableMeta<TData> {
    /** Posição de cada fundo (por ticker) no ranking geral — ver lib/ranking. */
    posicoes?: Map<string, number>;
  }
}
