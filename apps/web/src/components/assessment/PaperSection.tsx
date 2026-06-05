import type { AssessmentSection } from "@/types"
import { QuestionCard } from "./QuestionCard"
import React from "react"

interface PaperSectionProps {
  section: AssessmentSection
  showAnswers?: boolean
}

export function PaperSection({ section, showAnswers = false }: PaperSectionProps) {
  return (
    <div className="p-8 last:border-none border-b border-[var(--border)] print:border-slate-200">
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-3.5 mb-6 print:border-slate-400">
        <div>
          <h2 className="font-display text-base font-extrabold text-[var(--text)] tracking-wider uppercase print:text-slate-900">
            {section.name}
          </h2>
          <p className="text-xs text-[var(--text-3)] font-medium mt-0.5 uppercase tracking-wide print:text-slate-600">
            Type: {section.questionType.replace("_", " ")} • {section.instructions}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <span className="text-xs font-bold text-[var(--text-2)] bg-[var(--card-hi)] border border-[var(--border)] px-3 py-1.5 rounded-xl select-none print:border-slate-300">
            Section Weight: {section.totalMarks} Marks
          </span>
        </div>
      </div>

      <div className="divide-y divide-[var(--border)] print:divide-slate-200">
        {section.questions.map((question) => (
          <QuestionCard key={question.id} question={question} index={question.number} showAnswers={showAnswers} />
        ))}
      </div>
    </div>
  )
}
