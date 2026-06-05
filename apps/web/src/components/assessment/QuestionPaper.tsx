import React from "react"
import type { GeneratedAssessment } from "@/types"
import { StudentInfoSection } from "./StudentInfoSection"
import { PaperSection } from "./PaperSection"
import { Calendar, Award, Hourglass, BookOpen } from "lucide-react"

interface QuestionPaperProps {
  assessment: GeneratedAssessment
  showAnswers?: boolean
}

export function QuestionPaper({ assessment, showAnswers = false }: QuestionPaperProps) {
  return (
    <div
      className="glass rounded-3xl overflow-hidden border border-[var(--border)] print:shadow-none print:border-none print:bg-transparent"
      id="question-paper"
    >
      {/* Header */}
      <div className="border-b border-[var(--border)] p-8 text-center bg-[var(--surface)] relative print:bg-transparent print:border-slate-800">
        <div className="max-w-2xl mx-auto space-y-2">
          <h1 className="font-display text-2xl font-black text-[var(--text)] tracking-wide uppercase print:text-slate-900">
            {assessment.title}
          </h1>
          <p className="text-sm font-semibold text-[var(--text-2)] uppercase tracking-widest print:text-slate-700">
            {assessment.subject} — {assessment.topic}
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 mt-6 text-xs font-bold text-[var(--text-3)] uppercase tracking-wider print:text-slate-800">
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-brand-400 print:hidden" />
            <span>Grade: {assessment.gradeLevel}</span>
          </div>
          {assessment.duration && (
            <div className="flex items-center gap-1.5">
              <Hourglass className="w-4 h-4 text-brand-400 print:hidden" />
              <span>Time Allowed: {assessment.duration}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Award className="w-4 h-4 text-brand-400 print:hidden" />
            <span>Total Marks: {assessment.totalMarks}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-brand-400 print:hidden" />
            <span>Due: {new Date(assessment.dueDate).toLocaleDateString(undefined, { dateStyle: "medium" })}</span>
          </div>
        </div>
      </div>

      {/* General Instructions */}
      {assessment.generalInstructions && assessment.generalInstructions.length > 0 && (
        <div className="px-8 py-5 bg-amber-500/5 border-b border-amber-500/10 print:bg-transparent print:border-slate-400">
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2.5 print:text-slate-900">
            General Instructions:
          </h3>
          <ol className="list-decimal list-inside space-y-1.5">
            {assessment.generalInstructions.map((inst, i) => (
              <li key={i} className="text-xs text-amber-300/80 leading-relaxed font-medium print:text-slate-800">
                {inst}
              </li>
            ))}
          </ol>
        </div>
      )}

      <StudentInfoSection />

      <div className="divide-y divide-[var(--border)] print:divide-slate-300">
        {assessment.sections.map((section) => (
          <PaperSection key={section.name} section={section} showAnswers={showAnswers} />
        ))}
      </div>
    </div>
  )
}
