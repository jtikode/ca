import type { ButtonHTMLAttributes } from "react";
import { clsx } from "@/lib/clsx";

type Variant = "primary" | "secondary" | "danger" | "outline";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-blue-700 text-white hover:bg-blue-800 active:bg-blue-900",
  secondary: "bg-slate-700 text-white hover:bg-slate-800 active:bg-slate-900",
  danger: "bg-red-700 text-white hover:bg-red-800 active:bg-red-900",
  outline: "bg-white text-slate-900 border border-slate-300 hover:bg-slate-50",
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
