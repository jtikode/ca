import type { ButtonHTMLAttributes } from "react";
import { clsx } from "@/lib/clsx";

type Variant = "primary" | "secondary" | "danger" | "outline";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-amber-500 text-slate-950 shadow-[0_0_20px_-6px_rgba(245,158,11,0.5)] hover:bg-amber-400 active:bg-amber-600",
  secondary: "bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 active:bg-slate-600",
  danger: "bg-rose-600 text-white hover:bg-rose-500 active:bg-rose-700",
  outline: "bg-transparent text-slate-200 border border-slate-700 hover:bg-slate-800",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        "h-10 px-4 rounded-lg text-sm font-semibold shadow-sm transition-colors",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    />
  );
}
