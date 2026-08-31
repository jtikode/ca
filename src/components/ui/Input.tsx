import type { InputHTMLAttributes } from "react";
import { clsx } from "@/lib/clsx";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx(
        "h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-white",
        "placeholder:text-slate-500",
        "focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20",
        className,
      )}
      {...props}
    />
  );
}
