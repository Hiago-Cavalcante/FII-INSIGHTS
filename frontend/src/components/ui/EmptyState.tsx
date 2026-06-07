import type { ReactNode } from "react";

interface Props {
  titulo: string;
  descricao: string;
  icone?: ReactNode;
}

export function EmptyState({ titulo, descricao, icone }: Props) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-6 text-center">
      {icone && <div className="text-4xl">{icone}</div>}
      <h2 className="text-lg font-semibold text-foreground">{titulo}</h2>
      <p className="max-w-xs text-sm text-muted-foreground">{descricao}</p>
    </div>
  );
}
