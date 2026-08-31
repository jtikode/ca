import type { HTMLAttributes } from "react";
import { clsx } from "@/lib/clsx";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl shadow-black/20",
        className,
      )}
      {...props}
    />
  );
}
