"use client"
import React, { useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useGenerationStore } from "@/store/generation.store"
import { GenerationProgress } from "@/components/assessment/GenerationProgress"

export default function AssessmentPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { connect, status, assessmentId, disconnect } = useGenerationStore()

  useEffect(() => {
    if (id) {
      connect(id)
    }
    return () => disconnect()
  }, [id, connect, disconnect])

  // Redirect to result page once complete
  useEffect(() => {
    if (status === "complete" && assessmentId && id) {
      router.push(`/assessment/${id}/result?assessmentId=${assessmentId}`)
    }
  }, [status, assessmentId, id, router])

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg)]">
      <div className="max-w-xl w-full">
        <GenerationProgress />
      </div>
    </main>
  )
}
