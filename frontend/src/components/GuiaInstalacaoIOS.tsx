import { Share, Plus, Check, X } from "lucide-react";

interface Props {
  aberto: boolean;
  onFechar: () => void;
}

const PASSOS = [
  {
    Icon: Share,
    titulo: "Toque em Compartilhar",
    desc: "Na barra do Safari, toque no ícone de compartilhar.",
  },
  {
    Icon: Plus,
    titulo: "Adicionar à Tela de Início",
    desc: "Role a lista e escolha esta opção.",
  },
  {
    Icon: Check,
    titulo: "Confirme em Adicionar",
    desc: "O FII Insights aparece como um app na sua tela.",
  },
] as const;

/**
 * Bottom-sheet com o passo-a-passo de instalação do PWA no iOS, onde não há
 * prompt nativo. Renderizado sobre um backdrop; fecha no backdrop ou em "Entendi".
 */
export function GuiaInstalacaoIOS({ aberto, onFechar }: Props) {
  if (!aberto) return null;
  return (
    <div
      role="dialog"
      aria-label="Como instalar no iPhone"
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-3"
      onClick={onFechar}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card p-4 pb-[calc(1rem+var(--sa-bottom))] shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Instalar no iPhone</p>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="p-1 text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <ol className="flex flex-col gap-3">
          {PASSOS.map(({ Icon, titulo, desc }, i) => (
            <li key={titulo} className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {i + 1}
              </span>
              <div className="flex-1">
                <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <Icon className="h-4 w-4 text-primary" aria-hidden /> {titulo}
                </p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={onFechar}
          className="mt-4 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Entendi
        </button>
      </div>
    </div>
  );
}
