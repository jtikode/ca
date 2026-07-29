import type { SelectHTMLAttributes } from "react";
import { clsx } from "@/lib/clsx";

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={clsx(
        "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm",
        "focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
