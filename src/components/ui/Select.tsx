import type { SelectHTMLAttributes } from "react";
import { clsx } from "@/lib/clsx";

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={clsx(
        "h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-white",
        "focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
