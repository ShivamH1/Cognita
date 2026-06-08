"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useApi, useApiToken } from "@/lib/use-api"
import { PageHeader } from "@/components/app-shell"
import { StatusBadge } from "@/components/status-badge"
import { Button, Card, LoadingState, ErrorState } from "@/components/ui"
import { cn } from "@/lib/utils"
import type { Submission } from "@/types"
import { Trophy, CheckCircle2, XCircle, ArrowLeft, MessageSquare, Loader2 } from "lucide-react"
import confetti from "canvas-confetti"

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>()
  const api = useApi()
  const token = useApiToken()

  const [submission, setSubmission] = useState<Submission | null>(null)
  const [error, setError] = useState(false)
  const [celebrated, setCelebrated] = useState(false)

  useEffect(() => {
    if (!token || !id) return
    let active = true
    let timer: ReturnType<typeof setTimeout>

    async function poll() {
      try {
        const data = await api.getSubmission(id)
        if (!active) return
        setSubmission(data)
        if (data.status === "graded" || data.status === "failed") {
          if (data.status === "graded" && !celebrated) {
            setCelebrated(true)
            confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 }, colors: ["#8b5cf6", "#22d3ee", "#fbbf24"] })
          }
          return
        }
        timer = setTimeout(poll, 2500)
      } catch {
        if (active) setError(true)
      }
    }

    poll()
    return () => { active = false; clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token])

  if (error) return <ErrorState message="Could not load this submission." />
  if (!submission) return <LoadingState label="Loading results…" />

  const grading = submission.status === "submitted" || submission.status === "grading"
  const pct =
    submission.maxScore && submission.maxScore > 0
      ? Math.round(((submission.totalScore ?? 0) / submission.maxScore) * 100)
      : null
  const label = pct !== null ? (pct >= 80 ? "Excellent" : pct >= 60 ? "Good" : pct >= 40 ? "Keep practising" : "Needs work") : null

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 lg:py-10">
      <PageHeader
        icon={<Trophy className="w-5 h-5" />}
        title="Results"
        subtitle={submission.assessment?.title ?? "Your submission"}
        action={
          <Link href="/assessments">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          </Link>
        }
      />

      {grading ? (
        <Card className="p-10 text-center">
          <div className="relative w-14 h-14 mx-auto mb-5">
            <div className="absolute inset-0 rounded-full border-2 border-brand-500/20" />
            <div className="absolute inset-0 rounded-full border-t-2 border-brand-400 animate-spin" />
            <div className="absolute inset-2 rounded-full bg-brand-500/10 animate-pulse" />
          </div>
          <h3 className="font-display text-lg font-bold text-[var(--text)]">AI is grading your answers…</h3>
          <p className="text-sm text-[var(--text-2)] mt-1">
            This usually takes a few moments. The page will update automatically.
          </p>
          <div className="mt-4 flex justify-center">
            <StatusBadge status={submission.status} />
          </div>
        </Card>
      ) : submission.status === "failed" ? (
        <Card className="p-10 text-center">
          <XCircle className="w-10 h-10 text-rose-400 mx-auto mb-4" />
          <h3 className="font-display text-lg font-bold text-[var(--text)]">Grading failed</h3>
          <p className="text-sm text-[var(--text-2)] mt-1">
            The grader could not process this submission. Please try again later.
          </p>
        </Card>
      ) : (
        <div className="space-y-6 animate-slideUp">
          {/* Score summary */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 p-6 text-white shadow-[var(--shadow-brand)]">
            <div className="absolute -top-12 -right-12 w-40 h-40 bg-neon-400/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-brand-400/30 rounded-full blur-2xl pointer-events-none" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-brand-200 text-xs font-bold uppercase tracking-widest">Your score</p>
                <p className="font-display text-5xl font-extrabold mt-1">
                  {submission.totalScore}
                  <span className="text-brand-300 text-2xl">/{submission.maxScore}</span>
                </p>
              </div>
              {pct !== null && (
                <div className="text-right">
                  <p className="font-display text-6xl font-extrabold">{pct}%</p>
                  <p className="text-brand-200 text-sm mt-1">{label}</p>
                </div>
              )}
            </div>
          </div>

          {/* Per-question feedback */}
          <div className="space-y-3">
            {(submission.grades ?? []).map((g, i) => {
              const correct = g.correct === true || (g.maxScore > 0 && g.score >= g.maxScore)
              return (
                <Card key={g.questionId} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      {correct ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                      )}
                      <p className="text-sm font-semibold text-[var(--text)]">Question {i + 1}</p>
                    </div>
                    <span className={cn(
                      "text-sm font-bold px-2.5 py-0.5 rounded-lg border",
                      correct
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-400 border-rose-500/20",
                    )}>
                      {g.score}/{g.maxScore}
                    </span>
                  </div>
                  {g.feedback && (
                    <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-[var(--card-hi)] border border-[var(--border)] p-3.5">
                      <MessageSquare className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-[var(--text-2)] leading-relaxed">{g.feedback}</p>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
