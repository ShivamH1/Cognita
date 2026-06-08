"use client"

import React, { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useApi, useApiToken } from "@/lib/use-api"
import { useToast } from "@/components/ui/toast"
import { Button, Card, Textarea, Input, LoadingState, ErrorState, Badge } from "@/components/ui"
import { DifficultyBadge } from "@/components/assessment/DifficultyBadge"
import { questionTypeLabel } from "@/lib/utils"
import { cn } from "@/lib/utils"
import type { GeneratedAssessment, Question } from "@/types"
import { ArrowLeft, Send, Award, Clock, Loader2 } from "lucide-react"

export default function TakeAssessmentPage() {
  const { id } = useParams<{ id: string }>()
  const api = useApi()
  const token = useApiToken()
  const router = useRouter()
  const { toast } = useToast()

  const [assessment, setAssessment] = useState<GeneratedAssessment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!token || !id) return
    let active = true
    api
      .getAssessment(id, false)
      .then((data: any) => {
        if (!active) return
        // Enrollment gate: redirect non-approved students
        if (data.enrollment && data.enrollment.status !== "APPROVED") {
          router.replace(`/assessments/${id}`)
          return
        }
        setAssessment(data)
      })
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false))
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token])

  const allQuestions = useMemo(
    () => assessment?.sections.flatMap((s) => s.questions) ?? [],
    [assessment],
  )
  const answeredCount = allQuestions.filter((q) => answers[q.id]?.trim()).length

  function setAnswer(qid: string, value: string) {
    setAnswers((a) => ({ ...a, [qid]: value }))
  }

  async function submit() {
    if (!assessment) return
    if (answeredCount === 0) {
      toast("Answer at least one question before submitting.", "error")
      return
    }
    if (
      answeredCount < allQuestions.length &&
      !confirm(`You've answered ${answeredCount} of ${allQuestions.length}. Submit anyway?`)
    )
      return

    setSubmitting(true)
    try {
      const res = await api.createSubmission(id, answers)
      toast("Submitted! Grading in progress…", "success")
      router.push(`/results/${res.submissionId}`)
    } catch (e) {
      toast((e as Error).message || "Submission failed.", "error")
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingState label="Loading assessment…" />
  if (error || !assessment)
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <ErrorState message="Could not load this assessment. Check the ID and try again." />
        <div className="text-center mt-4">
          <Link href="/assessments"><Button variant="outline">Back</Button></Link>
        </div>
      </div>
    )

  return (
    <main className="pb-28 bg-[var(--bg)]">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 glass-strong border-b border-[var(--border)]">
        <div className="max-w-3xl mx-auto px-4 py-3.5 flex items-center justify-between gap-3">
          <Link
            href="/assessments"
            className="flex items-center gap-2 text-xs font-bold text-[var(--text-2)] hover:text-[var(--text)] uppercase tracking-widest transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Exit
          </Link>
          <div className="flex items-center gap-3 text-xs font-semibold text-[var(--text-2)]">
            <span className="inline-flex items-center gap-1.5">
              <Award className="w-4 h-4 text-brand-400" /> {assessment.totalMarks} marks
            </span>
            {assessment.duration && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-brand-400" /> {assessment.duration}
              </span>
            )}
            <Badge variant="brand">{answeredCount}/{allQuestions.length}</Badge>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-[var(--text)]">{assessment.title}</h1>
          <p className="text-sm text-[var(--text-2)] mt-1">
            {assessment.subject} · {assessment.topic} · {assessment.gradeLevel}
          </p>
        </div>

        {assessment.generalInstructions?.length > 0 && (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-2">Instructions</p>
            <ol className="list-decimal list-inside space-y-1 text-sm text-amber-300/80">
              {assessment.generalInstructions.map((ins, i) => (
                <li key={i}>{ins}</li>
              ))}
            </ol>
          </div>
        )}

        {assessment.sections.map((section) => (
          <div key={section.name} className="space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
              <h2 className="font-display text-base font-bold text-[var(--text)] uppercase tracking-wide">
                Section {section.name}
              </h2>
              <span className="text-xs text-[var(--text-3)] font-medium">
                {questionTypeLabel(section.questionType)} · {section.totalMarks} marks
              </span>
            </div>

            {section.questions.map((q) => (
              <Card key={q.id} className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <p className="text-sm font-semibold text-[var(--text)] leading-relaxed">
                    <span className="text-[var(--text-3)] mr-2">Q{q.number}.</span>
                    {q.text}
                  </p>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className="text-[10px] font-bold text-[var(--text-2)] bg-[var(--card-hi)] px-2 py-0.5 rounded border border-[var(--border)]">
                      [{q.marks}]
                    </span>
                    <DifficultyBadge difficulty={q.difficulty} />
                  </div>
                </div>
                <QuestionInput question={q} value={answers[q.id] ?? ""} onChange={(v) => setAnswer(q.id, v)} />
              </Card>
            ))}
          </div>
        ))}

        <div className="flex justify-end pt-2">
          <Button size="lg" onClick={submit} disabled={submitting} className="glow-brand">
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4" />}
            Submit for grading
          </Button>
        </div>
      </div>
    </main>
  )
}

function QuestionInput({ question, value, onChange }: { question: Question; value: string; onChange: (v: string) => void }) {
  if (question.type === "mcq" && question.options) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {question.options.map((opt) => {
          const selected = value === opt.label
          return (
            <button
              key={opt.label}
              type="button"
              onClick={() => onChange(opt.label)}
              className={cn(
                "flex items-start gap-2.5 text-sm p-3 rounded-xl border text-left transition-all duration-200",
                selected
                  ? "bg-brand-500/10 border-brand-500/40 ring-1 ring-brand-500/20 text-brand-300"
                  : "bg-[var(--input-bg)] border-[var(--border)] text-[var(--text-2)] hover:border-[var(--border-md)] hover:text-[var(--text)]",
              )}
            >
              <span className={cn(
                "flex items-center justify-center font-bold w-5 h-5 rounded-md text-[10px] flex-shrink-0",
                selected ? "bg-brand-500/20 text-brand-300" : "bg-[var(--card-hi)] text-[var(--text-3)]",
              )}>
                {opt.label}
              </span>
              <span className="pt-0.5">{opt.text}</span>
            </button>
          )
        })}
      </div>
    )
  }

  if (question.type === "true_false") {
    return (
      <div className="flex gap-3">
        {[{ label: "A", text: "True" }, { label: "B", text: "False" }].map((opt) => {
          const selected = value === opt.label
          return (
            <button
              key={opt.label}
              type="button"
              onClick={() => onChange(opt.label)}
              className={cn(
                "px-5 py-2.5 rounded-xl border text-sm font-semibold transition-all duration-200",
                selected
                  ? "bg-brand-500/10 border-brand-500/40 ring-1 ring-brand-500/20 text-brand-300"
                  : "border-[var(--border)] text-[var(--text-2)] hover:border-[var(--border-md)]",
              )}
            >
              {opt.text}
            </button>
          )
        })}
      </div>
    )
  }

  if (question.type === "fill_blank" || question.type === "short_answer") {
    return <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Your answer…" />
  }

  return <Textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder="Write your answer…" rows={5} />
}
