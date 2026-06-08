import React from "react"
import { cn } from "@/lib/utils"

type BadgeStyle = {
  base: string
  dot: string
  pulse?: boolean
  label: string
}

const map: Record<string, BadgeStyle> = {
  // Document statuses
  PROCESSING: {
    base: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    dot: "bg-amber-400",
    pulse: true,
    label: "Processing",
  },
  READY: {
    base: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    dot: "bg-emerald-400",
    label: "Ready",
  },
  FAILED: {
    base: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
    dot: "bg-rose-400",
    label: "Failed",
  },

  // Assessment / job statuses (upper-case API)
  PENDING: {
    base: "bg-slate-500/10 text-slate-400 border border-slate-500/20",
    dot: "bg-slate-400",
    label: "Pending",
  },
  GENERATING: {
    base: "bg-neon-500/10 text-neon-400 border border-neon-500/20",
    dot: "bg-neon-400",
    pulse: true,
    label: "Generating",
  },
  COMPLETE: {
    base: "bg-brand-500/10 text-brand-400 border border-brand-500/20",
    dot: "bg-brand-400",
    label: "Complete",
  },

  // Lower-case variants
  pending: {
    base: "bg-slate-500/10 text-slate-400 border border-slate-500/20",
    dot: "bg-slate-400",
    label: "Pending",
  },
  generating: {
    base: "bg-neon-500/10 text-neon-400 border border-neon-500/20",
    dot: "bg-neon-400",
    pulse: true,
    label: "Generating",
  },
  complete: {
    base: "bg-brand-500/10 text-brand-400 border border-brand-500/20",
    dot: "bg-brand-400",
    label: "Complete",
  },
  failed: {
    base: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
    dot: "bg-rose-400",
    label: "Failed",
  },

  // Submission statuses
  submitted: {
    base: "bg-slate-500/10 text-slate-400 border border-slate-500/20",
    dot: "bg-slate-400",
    label: "Submitted",
  },
  grading: {
    base: "bg-neon-500/10 text-neon-400 border border-neon-500/20",
    dot: "bg-neon-400",
    pulse: true,
    label: "Grading",
  },
  graded: {
    base: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    dot: "bg-emerald-400",
    label: "Graded",
  },
}

const fallback: BadgeStyle = {
  base: "bg-slate-500/10 text-slate-400 border border-slate-500/20",
  dot: "bg-slate-400",
  label: "",
}

export function StatusBadge({ status }: { status: string }) {
  const cfg = map[status] ?? { ...fallback, label: status }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
        cfg.base,
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full flex-shrink-0",
          cfg.dot,
          cfg.pulse && "animate-pulse",
        )}
      />
      {cfg.label}
    </span>
  )
}
