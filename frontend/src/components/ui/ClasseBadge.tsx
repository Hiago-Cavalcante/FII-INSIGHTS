interface Props {
  classe: string;
}

export function ClasseBadge({ classe }: Props) {
  const isFiagro = classe === "FIAGRO";
  const cor = isFiagro
    ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
    : "bg-primary/10 text-primary";
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${cor}`}>
      {classe}
    </span>
  );
}
