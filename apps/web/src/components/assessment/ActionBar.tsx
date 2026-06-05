"use client"
import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { RefreshCw, Download, ArrowLeft, Eye, EyeOff } from "lucide-react"
import { Button } from "../ui"
import { exportToPDF } from "@/lib/pdf-export"
import { useApi, useApiToken } from "@/lib/use-api"
import { useToast } from "@/components/ui/toast"

interface ActionBarProps {
  assessmentId: string
  showAnswers: boolean
  onToggleAnswers: (val: boolean) => void
}

export function ActionBar({ assessmentId, showAnswers, onToggleAnswers }: ActionBarProps) {
  const router = useRouter()
  const api = useApi()
  const token = useApiToken()
  const { toast } = useToast()
  const [regenerating, setRegenerating] = useState(false)
  const [exportingStudent, setExportingStudent] = useState(false)
  const [exportingTeacher, setExportingTeacher] = useState(false)

  async function handleRegenerate() {
    if (!confirm("Regenerate this question paper? This will queue a new AI job.")) return

    setRegenerating(true)
    try {
      const data = await api.regenerateAssessment(assessmentId)
      router.push(`/assessment/${data.assignmentId}`)
    } catch (error) {
      toast((error as Error).message || "Failed to regenerate.", "error")
      setRegenerating(false)
    }
  }

  async function handleDownloadPDF(teacherKey: boolean) {
    if (teacherKey) setExportingTeacher(true)
    else setExportingStudent(true)

    try {
      await exportToPDF(assessmentId, teacherKey, token)
    } catch {
      toast("Failed to export PDF.", "error")
    } finally {
      setExportingTeacher(false)
      setExportingStudent(false)
    }
  }

  return (
    <div className="sticky top-0 z-20 glass-strong border-b border-[var(--border)] print:hidden">
      <div className="max-w-4xl mx-auto px-4 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

        {/* Back navigation */}
        <button
          onClick={() => router.push("/assessments")}
          className="flex items-center gap-2 text-xs font-bold text-[var(--text-2)] hover:text-[var(--text)] uppercase tracking-widest transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-[var(--text-3)]" />
          All Assessments
        </button>

        {/* Action groups */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* Answer Toggle */}
          <Button
            onClick={() => onToggleAnswers(!showAnswers)}
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5"
          >
            {showAnswers ? (
              <>
                <EyeOff className="w-4 h-4 text-slate-500" />
                Hide Answers
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 text-slate-500" />
                Show Answers
              </>
            )}
          </Button>

          {/* Regenerate */}
          <Button
            onClick={handleRegenerate}
            disabled={regenerating}
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${regenerating ? "animate-spin" : ""}`} />
            {regenerating ? "Queuing..." : "Regenerate"}
          </Button>

          {/* Download Student version */}
          <Button
            onClick={() => handleDownloadPDF(false)}
            disabled={exportingStudent || exportingTeacher}
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5 border-brand-500/30 hover:bg-brand-500/10 text-brand-400"
          >
            <Download className="w-4 h-4" />
            {exportingStudent ? "Exporting..." : "Student PDF"}
          </Button>

          {/* Download Teacher Key */}
          <Button
            onClick={() => handleDownloadPDF(true)}
            disabled={exportingStudent || exportingTeacher}
            variant="primary"
            size="sm"
            className="flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-brand-200" />
            {exportingTeacher ? "Exporting..." : "Teacher Key"}
          </Button>

        </div>
      </div>
    </div>
  )
}
