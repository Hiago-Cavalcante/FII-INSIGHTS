import { useState, useRef, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Moon, Sun, TrendingUp, ChevronDown, Check, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDarkMode } from "@/hooks/useDarkMode";
import { usePerfilStore } from "@/stores/perfilStore";
import { useAuthStore } from "@/stores/authStore";
import type { TipoPerfil } from "@/types/domain";

const navLinks = [
  { to: "/", label: "Dashboard" },
  { to: "/ranking", label: "Ranking" },
  { to: "/clusters", label: "Clusters" },
  { to: "/carteira", label: "Carteira" },
  { to: "/perfil", label: "Perfil" },
];

const perfis: Array<{ tipo: TipoPerfil; rotulo: string; descricao: string }> = [
  { tipo: "conservador", rotulo: "Conservador", descricao: "Foco em estabilidade" },
  { tipo: "moderado", rotulo: "Moderado", descricao: "Equilíbrio risco/retorno" },
  { tipo: "arrojado", rotulo: "Arrojado", descricao: "Foco em rentabilidade" },
];

const perfilColors: Record<TipoPerfil, string> = {
  conservador: "text-emerald-600 dark:text-emerald-400",
  moderado: "text-blue-600 dark:text-blue-400",
  arrojado: "text-amber-600 dark:text-amber-400",
};

export function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark, toggle } = useDarkMode();
  const { tipo, setTipo } = usePerfilStore();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const perfilAtual = perfis.find((p) => p.tipo === tipo)!;

  return (
    <div className="sticky top-0 z-20 bg-white dark:bg-gray-950 shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 pt-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-500" strokeWidth={2.5} />
          <span className="font-semibold text-gray-900 dark:text-gray-50 tracking-tight">
            FII Insights
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={toggle}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 dark:text-gray-400",
              "hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            )}
            aria-label="Alternar tema"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setOpen((o) => !o)}
              className={cn(
                "flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium",
                "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              )}
            >
              <span className={cn("font-medium", perfilColors[tipo])}>
                {perfilAtual.rotulo}
              </span>
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 text-gray-400 transition-transform duration-200",
                  open && "rotate-180"
                )}
              />
            </button>

            {open && (
              <div
                className={cn(
                  "absolute right-0 top-full mt-1 w-52 rounded-lg border py-1 shadow-lg",
                  "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                )}
              >
                <p className="px-3 pt-1.5 pb-1 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  Perfil do Investidor
                </p>
                {perfis.map((p) => (
                  <button
                    key={p.tipo}
                    onClick={() => {
                      setTipo(p.tipo);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors",
                      "hover:bg-gray-50 dark:hover:bg-gray-800",
                      tipo === p.tipo
                        ? "text-gray-900 dark:text-gray-50"
                        : "text-gray-600 dark:text-gray-400"
                    )}
                  >
                    <Check
                      className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        tipo === p.tipo ? "text-blue-500" : "text-transparent"
                      )}
                    />
                    <div className="text-left">
                      <p className="font-medium">{p.rotulo}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {p.descricao}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="ml-1 flex items-center gap-2 border-l border-gray-200 pl-2 dark:border-gray-700">
            {user ? (
              <>
                <span className="hidden max-w-[10rem] truncate text-sm text-gray-600 dark:text-gray-300 sm:inline">
                  {user.email}
                </span>
                <button
                  onClick={() => {
                    logout();
                    navigate("/login");
                  }}
                  aria-label="Sair"
                  className={cn(
                    "flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium",
                    "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  )}
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sair</span>
                </button>
              </>
            ) : (
              <NavLink
                to="/login"
                className={cn(
                  "flex h-9 items-center rounded-lg px-3 text-sm font-medium",
                  "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                )}
              >
                Entrar
              </NavLink>
            )}
          </div>
        </div>
      </div>

      <nav className="mt-4">
        <div className="mx-auto flex w-full max-w-7xl items-center px-4 sm:px-6 border-b border-gray-200 dark:border-gray-800">
          {navLinks.map(({ to, label }) => {
            const isActive =
              to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);
            return (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={cn(
                  "flex shrink-0 items-center whitespace-nowrap border-b-2 px-3 pb-3 text-sm font-medium transition-all",
                  isActive
                    ? "border-blue-500 text-blue-500"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                )}
              >
                {label}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
