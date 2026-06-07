import { NavLink } from "react-router-dom";
import { Home, Wallet, BarChart3, Sparkles, User } from "lucide-react";
import { cn } from "@/lib/utils";

const ABAS = [
  { to: "/", label: "Início", Icon: Home, end: true },
  { to: "/carteira", label: "Carteira", Icon: Wallet, end: false },
  { to: "/analise", label: "Análise", Icon: BarChart3, end: false },
  { to: "/ia", label: "IA", Icon: Sparkles, end: false },
  { to: "/perfil", label: "Perfil", Icon: User, end: false },
];

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {ABAS.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px]",
                isActive ? "text-primary" : "text-muted-foreground"
              )
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
