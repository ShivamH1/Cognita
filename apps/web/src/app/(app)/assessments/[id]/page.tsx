"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { QuestionPaper } from "@/components/assessment/QuestionPaper"
import { ActionBar } from "@/components/assessment/ActionBar"
import { useApi, useApiToken } from "@/lib/use-api"
import { StatusBadge } from "@/components/status-badge"
import { Button, Card, LoadingState, ErrorState, EmptyState, Badge } from "@/components/ui"
import { formatDateTime, formatDate } from "@/lib/utils"
import type { GeneratedAssessment } from "@/types"
import { Users, Copy, Check, GraduationCap, ArrowRight, Clock, XCircle, UserPlus, Ban } from "lucide-react"
import { useToast } from "@/components/ui/toast"

export default function AssessmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: session } = useSession()
  const isTeacher = session?.user?.role === "TEACHER"
  const api = useApi()
  const token = useApiToken()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [assessment, setAssessment] = useState<GeneratedAssessment | null>(null)
  const [enrollment, setEnrollment] = useState<{ id: string; status: string } | null | undefined>(undefined)
  const [showAnswers, setShowAnswers] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!token || !id) return
    let active = true
    setLoading(true)
    setError(false)
    api
      .getAssessment(id, showAnswers)
      .then((data: any) => {
        if (!active) return
        setAssessment(data)
        if (!isTeacher && data.enrollment !== undefined) {
          setEnrollment(data.enrollment)
        }
      })
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false))
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token, showAnswers])

  const { data: submissions } = useQuery({
    queryKey: ["submissions", id],
    queryFn: () => api.listSubmissions(id),
    enabled: !!token && isTeacher,
  })

  const { data: enrollments, refetch: refetchEnrollments } = useQuery({
    queryKey: ["assessment", id, "enrollments"],
    queryFn: () => api.listAssessmentEnrollments(id),
    enabled: !!token && isTeacher,
  })

  const enrollMutation = useMutation({
    mutationFn: () => api.enrollAssessment(id),
    onSuccess: (res) => {
      setEnrollment({ id: res.enrollmentId, status: res.status })
      toast("Enrollment request submitted.", "success")
    },
  })

  const approveMutation = useMutation({
    mutationFn: (eid: string) => api.approveAssessmentEnrollment(id, eid),
    onSuccess: () => { refetchEnrollments(); toast("Enrollment approved.", "success") },
  })

  const rejectMutation = useMutation({
    mutationFn: (eid: string) => api.rejectAssessmentEnrollment(id, eid),
    onSuccess: () => { refetchEnrollments(); toast("Enrollment rejected.", "success") },
  })

  function copyId() {
    navigator.clipboard.writeText(id)
    setCopied(true)
    toast("Assessment ID copied — share it with students.", "success")
    setTimeout(() => setCopied(false), 1500)
  }

  if (loading && !assessment) return <LoadingState label="Loading assessment…" />
  if (error || !assessment)
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <ErrorState message="Could not load this assessment." />
        <div className="text-center mt-4">
          <Link href="/assessments"><Button variant="outline">Back to assessments</Button></Link>
        </div>
      </div>
    )

  const enrollmentStatus = enrollment?.status
  const isApproved = enrollmentStatus === "APPROVED"
  const isPending = enrollmentStatus === "PENDING"
  const isRejected = enrollmentStatus === "REJECTED"
  const hasAccess = isTeacher || isApproved

  return (
    <main className="pb-20 bg-[var(--bg)]">
      {isTeacher && (
        <ActionBar assessmentId={id} showAnswers={showAnswers} onToggleAnswers={setShowAnswers} />
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Teacher: share + submissions + enrollments */}
        {isTeacher && (
          <Card className="p-5 print:hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-3)]">Share with students</p>
                <button
                  onClick={copyId}
                  className="mt-1 inline-flex items-center gap-2 font-mono text-sm text-[var(--text-2)] hover:text-brand-400 cursor-pointer transition-colors"
                >
                  {id}
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-[var(--text-3)]" />}
                </button>
              </div>
              <Badge variant="brand">
                <Users className="w-3.5 h-3.5" />
                {submissions?.length ?? 0} submission{(submissions?.length ?? 0) === 1 ? "" : "s"}
              </Badge>
            </div>

            {/* Enrollment management */}
            {enrollments && enrollments.length > 0 && (
              <div className="mt-5 border-t border-[var(--border)] pt-4">
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-3)] mb-3">
                  Enrollments ({enrollments.length})
                </p>
                <div className="space-y-2">
                  {enrollments.map((e) => (
                    <div key={e.id} className="flex items-center gap-3 p-2 rounded-lg bg-[var(--bg-2)]">
                      <div className="w-8 h-8 rounded-full bg-[var(--bg-3)] flex items-center justify-center text-xs font-medium text-[var(--text-2)]">
                        {(e.student.name || e.student.email)?.[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[var(--text)] truncate">{e.student.name || e.student.email}</p>
                        <p className="text-xs text-[var(--text-3)] truncate">{e.student.email}</p>
                      </div>
                      {e.status === "PENDING" ? (
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => approveMutation.mutate(e.id)}
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                          >
                            <Check className="w-3.5 h-3.5" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => rejectMutation.mutate(e.id)}
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                          >
                            <Ban className="w-3.5 h-3.5" /> Reject
                          </Button>
                        </div>
                      ) : e.status === "APPROVED" ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400">Approved</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">Rejected</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {submissions && submissions.length > 0 && (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wider text-[var(--text-3)] border-b border-[var(--border)]">
                      <th className="py-2 pr-4 font-bold">Student</th>
                      <th className="py-2 pr-4 font-bold">Status</th>
                      <th className="py-2 pr-4 font-bold">Score</th>
                      <th className="py-2 pr-4 font-bold">Submitted</th>
                      <th className="py-2 font-bold"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((s) => (
                      <tr key={s.id} className="border-b border-[var(--border)] last:border-none">
                        <td className="py-2.5 pr-4">
                          <p className="font-semibold text-[var(--text)]">{s.student?.name ?? "Student"}</p>
                          <p className="text-xs text-[var(--text-3)]">{s.student?.email}</p>
                        </td>
                        <td className="py-2.5 pr-4"><StatusBadge status={s.status} /></td>
                        <td className="py-2.5 pr-4 font-semibold text-[var(--text-2)]">
                          {s.status === "graded" && s.maxScore ? `${s.totalScore}/${s.maxScore}` : "—"}
                        </td>
                        <td className="py-2.5 pr-4 text-xs text-[var(--text-3)]">{formatDateTime(s.createdAt)}</td>
                        <td className="py-2.5">
                          <Link
                            href={`/results/${s.id}`}
                            className="text-brand-400 hover:text-brand-300 font-semibold inline-flex items-center gap-1 transition-colors"
                          >
                            View <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* Student: enrollment status banner */}
        {!isTeacher && (
          <Card className="p-4 print:hidden">
            {isApproved ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-green-400">
                  <Check className="w-5 h-5" />
                  <span className="text-sm font-medium">You are enrolled. Ready to take this assessment!</span>
                </div>
                <Link href={`/assessments/${id}/take`}>
                  <Button><GraduationCap className="w-4 h-4" /> Start</Button>
                </Link>
              </div>
            ) : isPending ? (
              <div className="flex items-center gap-3 text-yellow-400">
                <Clock className="w-5 h-5" />
                <span className="text-sm font-medium">Enrollment request pending teacher approval.</span>
              </div>
            ) : isRejected ? (
              <div className="flex items-center gap-3 text-red-400">
                <XCircle className="w-5 h-5" />
                <span className="text-sm font-medium">Your enrollment request was not approved.</span>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UserPlus className="w-5 h-5 text-[var(--text-3)]" />
                  <span className="text-sm text-[var(--text-2)]">You are not enrolled in this assessment.</span>
                </div>
                <Button
                  onClick={() => enrollMutation.mutate()}
                  disabled={enrollMutation.isPending}
                >
                  {enrollMutation.isPending ? "Requesting..." : "Request enrollment"}
                </Button>
              </div>
            )}
          </Card>
        )}

        {assessment.sections?.length ? (
          <QuestionPaper assessment={assessment} showAnswers={isTeacher && showAnswers} />
        ) : !hasAccess && !isTeacher ? (
          <Card className="p-6 text-center">
            <p className="text-sm text-[var(--text-2)]">Enroll in this assessment to view the questions.</p>
          </Card>
        ) : (
          <EmptyState title="Paper not ready" description="This assessment is still being generated." />
        )}
      </div>
    </main>
  )
}
