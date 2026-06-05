import type { Question } from "@/types"
import { DifficultyBadge } from "./DifficultyBadge"
import React from "react"

interface QuestionCardProps {
  question: Question
  index: number
  showAnswers?: boolean
}

export function QuestionCard({ question, index, showAnswers = false }: QuestionCardProps) {
  return (
    <div className="py-5 border-b border-[var(--border)] last:border-none print:border-slate-200">
      <div className="flex items-start gap-4">
        <span className="text-[var(--text-3)] font-bold text-sm w-6 flex-shrink-0 pt-0.5 print:text-slate-800">
          Q{index}.
        </span>

        <div className="flex-1 space-y-3">
          <p className="text-[var(--text)] text-sm font-semibold leading-relaxed print:text-slate-900">
            {question.text}
          </p>

          {/* MCQ Options */}
          {question.type === "mcq" && question.options && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              {question.options.map((opt) => {
                const isCorrect = showAnswers && question.answer === opt.label
                return (
                  <div
                    key={opt.label}
                    className={[
                      "flex items-start gap-2.5 text-xs p-3 rounded-xl border transition-colors print:border-slate-200",
                      isCorrect
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300 font-bold print:border-slate-800"
                        : "bg-[var(--card-hi)] border-[var(--border)] text-[var(--text-2)]",
                    ].join(" ")}
                  >
                    <span className={[
                      "flex items-center justify-center font-bold w-5 h-5 rounded-md text-[10px]",
                      isCorrect ? "bg-emerald-500/20 text-emerald-300" : "bg-[var(--surface)] text-[var(--text-3)]",
                    ].join(" ")}>
                      {opt.label}
                    </span>
                    <span className="leading-normal pt-0.5">{opt.text}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* True / False */}
          {question.type === "true_false" && (
            <div className="flex gap-4 mt-2">
              {["True", "False"].map((val, idx) => {
                const label = idx === 0 ? "A" : "B"
                const isCorrect = showAnswers && question.answer === label
                return (
                  <div
                    key={val}
                    className={[
                      "flex items-center gap-2 border px-4 py-2 rounded-xl text-xs",
                      isCorrect
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300 font-bold"
                        : "border-[var(--border)] text-[var(--text-2)]",
                    ].join(" ")}
                  >
                    <span className="font-bold text-[10px]">{label}.</span>
                    <span>{val}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Fill blank / Short answer */}
          {(question.type === "short_answer" || question.type === "fill_blank") && !showAnswers && (
            <div className="mt-3 border-b border-dashed border-[var(--border-md)] w-full h-8 max-w-xl print:border-slate-400" />
          )}

          {/* Ruled lines for long answer */}
          {question.type === "long_answer" && !showAnswers && (
            <div className="mt-4 space-y-3.5 max-w-2xl print:block">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="border-b border-dashed border-[var(--border)] h-6 print:border-slate-300" />
              ))}
            </div>
          )}

          {/* Answer key */}
          {showAnswers && question.answer && (
            <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-3.5 mt-4 text-xs text-emerald-300 animate-fadeIn print:bg-transparent print:border-slate-300">
              <span className="font-bold uppercase tracking-wider text-[9px] text-emerald-400 block mb-1 print:text-slate-800">
                Correct Answer Key:
              </span>
              <p className="font-medium">{question.answer}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <span className="text-[10px] font-bold text-[var(--text-2)] bg-[var(--card-hi)] px-2 py-0.5 rounded border border-[var(--border)] print:border-slate-300">
            [{question.marks} {question.marks === 1 ? "Mark" : "Marks"}]
          </span>
          <DifficultyBadge difficulty={question.difficulty} />
        </div>
      </div>
    </div>
  )
}
