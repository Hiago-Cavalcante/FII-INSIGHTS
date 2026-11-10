import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  message?: string;
  /** Ação de recuperação; sem ela, o botão recarrega a tela. */
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Erro ao carregar dados",
  message = "Não foi possível falar com o servidor. Confira sua conexão e tente novamente.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-destructive/25",
        "bg-destructive/5 px-6 py-12 text-center",
        className
      )}
    >
      <AlertTriangle aria-hidden className="mb-3 h-10 w-10 text-destructive/70" />
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{message}</p>
      <button
        type="button"
        onClick={onRetry ?? (() => window.location.reload())}
        className="mt-4 min-h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Tentar novamente
      </button>
    </div>
  );
}
