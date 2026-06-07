import { formatMoeda } from "@/lib/formato";

interface Props {
  valor: string | number;
  className?: string;
}

export function MoneyValue({ valor, className }: Props) {
  return <span className={className}>{formatMoeda(valor)}</span>;
}
