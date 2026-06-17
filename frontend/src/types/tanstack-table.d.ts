import "@tanstack/react-table";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    align?: "left" | "right";
    hidden?: "md" | "lg" | "xl";
    /** Coluna visível apenas no mobile (escondida a partir de `md`). */
    mobileOnly?: boolean;
  }
}
