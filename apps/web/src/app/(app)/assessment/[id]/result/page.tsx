"use client"
import React, { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { QuestionPaper } from "@/components/assessment/QuestionPaper"
import { ActionBar } from "@/components/assessment/ActionBar"
import { useApi, useApiToken } from "@/lib/use-api"
import type { GeneratedAssessment } from "@/types"
import { LoadingState, ErrorState } from "@/components/ui"
import confetti from "canvas-confetti"

function ResultPageContent() {
  const searchParams = useSearchParams()
  const assessmentId = searchParams.get("assessmentId")
  const api = useApi()
  const token = useApiToken()
  const [assessment, setAssessment] = useState<GeneratedAssessment | null>(null)
  const [showAnswers, setShowAnswers] = useState(false)
  const [loading, setLoading] = useState(true)
  const [celebrated, setCelebrated] = useState(false)

  useEffect(() => {
    if (!assessmentId || !token) return
    let active = true

    async function load() {
      setLoading(true)
      try {
        const data = await api.getAssessment(assessmentId!, showAnswers)
        if (!active) return
        setAssessment(data)
        if (!showAnswers && !celebrated) {
          setCelebrated(true)
          confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } })
        }
      } catch {
        /* handled by render */
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentId, showAnswers, token])

  if (!assessmentId) {
    return <ErrorState message="Assessment ID parameter is missing from the URL." />
  }

  return (
    <>
      <ActionBar
        assessmentId={assessmentId}
        showAnswers={showAnswers}
        onToggleAnswers={setShowAnswers}
      />

      <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6">
        {loading && !assessment ? (
          <LoadingState label="Loading question paper…" />
        ) : assessment ? (
          <div className="space-y-6 animate-slideUp">
            {showAnswers && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-6 py-4 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-sm print:hidden">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>Teacher mode — answer key visible. Students never see answers.</span>
                </div>
                <button
                  onClick={() => setShowAnswers(false)}
                  className="text-emerald-700 hover:text-emerald-900 underline font-bold cursor-pointer"
                >
                  Switch to student view
                </button>
              </div>
            )}
            <QuestionPaper assessment={assessment} showAnswers={showAnswers} />
          </div>
        ) : (
          <ErrorState message="Failed to load the question paper. Please refresh." />
        )}
      </div>
    </>
  )
}

export default function ResultPage() {
  return (
    <main className="min-h-screen pb-20">
      <Suspense fallback={<LoadingState label="Loading results…" />}>
        <ResultPageContent />
      </Suspense>
    </main>
  )
}
