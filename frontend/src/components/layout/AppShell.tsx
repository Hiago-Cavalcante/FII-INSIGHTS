import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { BotaoAjuda } from "@/components/ui/BotaoAjuda";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-gradient flex min-h-[100dvh] flex-col text-foreground">
      <header className="sticky top-0 z-30 mx-auto flex w-full max-w-md items-center justify-between px-4 py-2 pt-[calc(0.5rem+var(--sa-top))]">
        <span className="text-sm font-bold tracking-tight text-foreground/80">
          FII <span className="text-primary">Insights</span>
        </span>
        <div className="flex items-center gap-1">
          <BotaoAjuda />
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto flex w-full min-h-0 max-w-md flex-1 flex-col px-4 pt-1 pb-[calc(5rem+var(--sa-bottom))]">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
