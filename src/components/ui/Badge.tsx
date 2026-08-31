import type { HTMLAttributes } from "react";
import { clsx } from "@/lib/clsx";

type Tone = "success" | "warning" | "neutral" | "info" | "danger";

const TONE_CLASSES: Record<Tone, string> = {
  success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  warning: "border-amber-500/20 bg-amber-500/10 text-amber-400",
  neutral: "border-slate-700 bg-slate-800/60 text-slate-400",
  info: "border-blue-500/20 bg-blue-500/10 text-blue-400",
  danger: "border-rose-500/20 bg-rose-500/10 text-rose-400",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold",
        TONE_CLASSES[tone],
        className,
      )}
      {...props}
    />
  );
}
