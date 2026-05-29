"use client"

import React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "@/components/providers"
import { cn } from "@/lib/utils"

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme()
  const isDark = theme === "dark"

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer",
        "border border-[var(--border-md)] hover:border-[var(--border-hi)]",
        "bg-[var(--card-hi)] hover:bg-[var(--card)]",
        "text-[var(--text-2)] hover:text-[var(--text)]",
        className,
      )}
    >
      <Sun
        className={cn(
          "w-4 h-4 absolute transition-all duration-300",
          isDark ? "opacity-0 rotate-90 scale-50" : "opacity-100 rotate-0 scale-100",
        )}
      />
      <Moon
        className={cn(
          "w-4 h-4 absolute transition-all duration-300",
          isDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-50",
        )}
      />
    </button>
  )
}
