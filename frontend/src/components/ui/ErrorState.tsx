import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Erro ao carregar dados",
  message = "Não foi possível conectar com o servidor. Verifique se o backend está rodando.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-red-200 dark:border-red-500/20",
        "bg-red-50 dark:bg-red-500/5 py-12 px-6 text-center",
        className
      )}
    >
      <AlertTriangle className="h-10 w-10 text-red-400 mb-3" />
      <p className="font-medium text-red-900 dark:text-red-300">{title}</p>
      <p className="text-sm text-red-600 dark:text-red-400 mt-1 max-w-sm">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}
