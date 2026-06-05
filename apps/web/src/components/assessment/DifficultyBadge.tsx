import type { Difficulty } from "@/types"
import { cn } from "@/lib/utils"

const config: Record<Difficulty, { label: string; className: string }> = {
  easy:   { label: "Easy",     className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 print:text-emerald-800 print:bg-transparent" },
  medium: { label: "Moderate", className: "bg-amber-500/10 text-amber-400 border-amber-500/20 print:text-amber-800 print:bg-transparent" },
  hard:   { label: "Hard",     className: "bg-rose-500/10 text-rose-400 border-rose-500/20 print:text-rose-800 print:bg-transparent" },
}

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const { label, className } = config[difficulty]
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border tracking-wide select-none print:border-slate-300",
      className
    )}>
      {label}
    </span>
  )
}
