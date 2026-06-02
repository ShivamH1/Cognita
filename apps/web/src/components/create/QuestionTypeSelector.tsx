"use client"
import React from "react"
import type { QuestionType } from "@/types"
import { CheckSquare, AlignLeft, AlignRight, CheckCircle2, Type } from "lucide-react"
import { cn } from "@/lib/utils"

interface QuestionTypeSelectorProps {
  value: QuestionType
  onChange: (type: QuestionType) => void
}

const OPTIONS: { value: QuestionType; label: string; desc: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "mcq",          label: "Multiple Choice",     desc: "Single correct option with A–D choices", icon: CheckSquare },
  { value: "true_false",   label: "True / False",        desc: "Binary choice validation statements",    icon: CheckCircle2 },
  { value: "fill_blank",   label: "Fill in Blanks",      desc: "Sentences with missing blanks",           icon: Type },
  { value: "short_answer", label: "Short Answer",        desc: "Conceptual 1–3 sentence answers",         icon: AlignLeft },
  { value: "long_answer",  label: "Long Answer",         desc: "In-depth essay questions",                icon: AlignRight },
]

export function QuestionTypeSelector({ value, onChange }: QuestionTypeSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
      {OPTIONS.map((opt) => {
        const Icon = opt.icon
        const isSelected = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all duration-200 cursor-pointer",
              isSelected
                ? "border-brand-500/40 bg-brand-500/10 text-brand-300 ring-1 ring-brand-500/20"
                : "border-[var(--border)] bg-[var(--card-hi)] hover:border-[var(--border-md)] text-[var(--text-2)]",
            )}
          >
            <div className={cn(
              "p-2.5 rounded-lg mb-2",
              isSelected ? "bg-brand-500/20 text-brand-400" : "bg-[var(--surface)] text-[var(--text-3)]",
            )}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold truncate w-full">{opt.label}</p>
            <p className="text-[10px] text-[var(--text-3)] mt-0.5 leading-snug hidden sm:line-clamp-2">{opt.desc}</p>
          </button>
        )
      })}
    </div>
  )
}
