import React from "react"
import { cn } from "@/lib/utils"

export function Logo({ className, mark = false }: { className?: string; mark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      {/* Spark icon: violet gradient circle with a glowing dot */}
      <span className="relative inline-flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 shadow-sm shadow-brand-500/40 flex-shrink-0">
        {/* Inner glow ring */}
        <span className="absolute inset-0 rounded-xl bg-gradient-to-br from-brand-400/40 to-transparent opacity-60" />
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-white relative" fill="none">
          <path
            d="M12 3L3.5 7.5 12 12l8.5-4.5L12 3z"
            fill="currentColor"
            opacity="0.97"
          />
          <path
            d="M5 10.5v4.2c0 .5.27.95.7 1.18L12 19l6.3-3.12c.43-.23.7-.68.7-1.18v-4.2"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity="0.55"
          />
          {/* Spark dot in center */}
          <circle cx="12" cy="9" r="1.5" fill="white" opacity="0.9" />
        </svg>
      </span>

      {!mark && (
        <span
          className="font-display font-extrabold text-lg tracking-tight text-[var(--text)]"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          Cognita
        </span>
      )}
    </span>
  )
}
