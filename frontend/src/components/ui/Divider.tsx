import { cn } from "@/lib/utils";

interface DividerProps {
  className?: string;
}

export function Divider({ className }: DividerProps) {
  return (
    <div
      className={cn(
        "my-6 h-px w-full bg-gray-200 dark:bg-gray-800",
        className
      )}
    />
  );
}
