import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const cx = cn;

export const focusRing = [
  "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
];
