import React from "react"
import { cn } from "@/lib/utils"

const accentMap = {
  default: {
    icon: "bg-brand-500/10 text-brand-400",
    border: "hover:border-brand-500/30",
    glow: "hover:shadow-brand-500/10",
  },
  emerald: {
    icon: "bg-emerald-500/10 text-emerald-400",
    border: "hover:border-emerald-500/30",
    glow: "hover:shadow-emerald-500/10",
  },
  amber: {
    icon: "bg-amber-500/10 text-amber-400",
    border: "hover:border-amber-500/30",
    glow: "hover:shadow-amber-500/10",
  },
  rose: {
    icon: "bg-rose-500/10 text-rose-400",
    border: "hover:border-rose-500/30",
    glow: "hover:shadow-rose-500/10",
  },
}

export function StatCard({
  label,
  value,
  icon,
  accent = "default",
  hint,
}: {
  label: string
  value: React.ReactNode
  icon: React.ReactNode
  accent?: "default" | "emerald" | "amber" | "rose"
  hint?: string
}) {
  const styles = accentMap[accent]

  return (
    <div
      className={cn(
        "glass rounded-2xl border border-[var(--border)] p-5 transition-all duration-300",
        "hover:-translate-y-0.5 hover:shadow-lg",
        styles.border,
        styles.glow,
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-3)]">{label}</p>
        <span
          className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0",
            styles.icon,
          )}
        >
          {icon}
        </span>
      </div>
      <p className="mt-3 text-3xl font-extrabold font-display text-[var(--text)] tracking-tight">
        {value}
      </p>
      {hint && <p className="text-xs text-[var(--text-3)] mt-1">{hint}</p>}
    </div>
  )
}
