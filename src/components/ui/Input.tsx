import type { InputHTMLAttributes } from "react";
import { clsx } from "@/lib/clsx";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx(
        "h-10 w-full rounded-lg border border-slate-300 px-3 text-sm",
        "placeholder:text-slate-400",
        "focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200",
        className,
      )}
      {...props}
    />
  );
}
