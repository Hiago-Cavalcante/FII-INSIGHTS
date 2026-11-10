import { Moon, Sun } from "lucide-react";
import { useDarkMode } from "@/hooks/useDarkMode";

/**
 * Botão de alternância de tema (claro/escuro).
 *
 * Usa o hook `useDarkMode`, que sincroniza a classe `.dark` no <html> e
 * persiste a escolha em localStorage ("fii-theme"). O estado inicial respeita
 * a preferência do sistema operacional quando ainda não há escolha salva.
 */
export function ThemeToggle() {
  const { isDark, toggle } = useDarkMode();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Mudar para tema claro" : "Mudar para tema escuro"}
      title={isDark ? "Tema claro" : "Tema escuro"}
      className="group grid h-11 w-11 place-items-center rounded-full text-foreground"
    >
      <span className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card transition-colors group-hover:bg-muted">
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </span>
    </button>
  );
}
