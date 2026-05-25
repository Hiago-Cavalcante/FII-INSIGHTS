import { NavLink } from "react-router-dom";
import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { to: "/", label: "Dashboard" },
  { to: "/ranking", label: "Ranking" },
];

export function Header() {
  return (
    <header className="border-b bg-background">
      <div className="flex justify-between items-center px-6 h-14">
        <div className="flex items-center gap-2 font-bold text-lg">
          <TrendingUp className="h-5 w-5 text-primary" />
          <span>FII Insights</span>
        </div>
        <nav className="flex items-center gap-6">
          {navLinks.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                cn(
                  "text-sm transition-colors",
                  isActive
                    ? "font-medium text-foreground border-b-2 border-primary pb-0.5"
                    : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
