import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-gradient min-h-screen text-foreground">
      <main className="mx-auto w-full max-w-md px-4 pb-20 pt-4">{children}</main>
      <BottomNav />
    </div>
  );
}
