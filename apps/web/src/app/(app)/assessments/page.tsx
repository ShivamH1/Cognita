"use client"

import React, { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useApi, useApiToken } from "@/lib/use-api"
import { PageHeader } from "@/components/app-shell"
import { StatusBadge } from "@/components/status-badge"
import { Button, Card, Input, LoadingState, ErrorState, EmptyState, ConfirmModal } from "@/components/ui"
import { formatDate } from "@/lib/utils"
import { useToast } from "@/components/ui/toast"
import { FileStack, FilePlus2, GraduationCap, ArrowRight, Search, Trophy, Trash2 } from "lucide-react"

function TeacherAssessments() {
  const api = useApi()
  const token = useApiToken()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [search, setSearch] = useState("")

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["assignments"],
    queryFn: () => api.listAssignments(),
    enabled: !!token,
  })

  const filtered = useMemo(() => {
    if (!data) return []
    if (!search.trim()) return data
    const q = search.toLowerCase()
    return data.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.subject.toLowerCase().includes(q) ||
        a.topic.toLowerCase().includes(q),
    )
  }, [data, search])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.deleteAssignment(deleteTarget.id)
      queryClient.invalidateQueries({ queryKey: ["assignments"] })
      toast(`"${deleteTarget.title}" deleted.`, "success")
      setDeleteTarget(null)
    } catch (err: any) {
      toast(err.message || "Failed to delete.", "error")
    } finally {
      setDeleting(false)
    }
  }

  if (isLoading) return <LoadingState label="Loading assessments…" />
  if (isError || !data) return <ErrorState message="Could not load assessments." retry={() => refetch()} />

  return (
    <>
      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-3)]" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title, subject, or topic..."
          className="pl-10"
        />
      </div>

      {filtered.length === 0 ? (
        <Card className="p-2">
          <EmptyState
            icon={<FileStack className="w-6 h-6" />}
            title={search ? "No matching assessments" : "No assessments yet"}
            description={search ? "Try a different search term." : "Create your first AI-generated assessment."}
            action={
              !search ? (
                <Link href="/create">
                  <Button><FilePlus2 className="w-4 h-4" /> Create assessment</Button>
                </Link>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => {
            const status = a.assessment?.status ?? a.status
            const ready = a.assessment && status === "COMPLETE"
            const target = ready && a.assessment ? `/assessments/${a.assessment.id}` : `/assessment/${a.id}`
            return (
              <Card key={a.id} className="p-4 flex items-center gap-4 hover:border-[var(--border-md)] transition-colors">
                <div className="w-11 h-11 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center flex-shrink-0">
                  <FileStack className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[var(--text)] truncate">{a.title}</p>
                  <p className="text-xs text-[var(--text-3)]">
                    {a.subject} · {a.gradeLevel} · {a.totalMarks} marks · {formatDate(a.createdAt)}
                  </p>
                </div>
                <StatusBadge status={status} />
                <Link href={target}>
                  <Button variant={ready ? "primary" : "outline"} size="sm">
                    {ready ? "Open" : "Progress"} <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteTarget({ id: a.id, title: a.title })}
                  className="text-[var(--text-3)] hover:text-rose-400 px-2"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </Card>
            )
          })}
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete assessment?"
        description={`"${deleteTarget?.title}" and all its submissions will be permanently deleted.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  )
}

function StudentAssessments() {
  const api = useApi()
  const token = useApiToken()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")

  const { data: assessments, isLoading: loadingAssessments, isError: errAssessments, refetch: refetchAssessments } = useQuery({
    queryKey: ["assessments", "browse"],
    queryFn: () => api.listAssessments(),
    enabled: !!token,
  })

  const enrollMutation = useMutation({
    mutationFn: (id: string) => api.enrollAssessment(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assessments", "browse"] }),
  })

  const { data: subs, isLoading: loadingSubs } = useQuery({
    queryKey: ["submissions", "mine"],
    queryFn: () => api.listSubmissions(),
    enabled: !!token,
  })

  const filtered = useMemo(() => {
    if (!assessments) return []
    if (!search.trim()) return assessments
    const q = search.toLowerCase()
    return assessments.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.subject.toLowerCase().includes(q) ||
        a.topic.toLowerCase().includes(q),
    )
  }, [assessments, search])

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-lg font-bold text-[var(--text)] mb-4">Available Assessments</h2>
        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-3)]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, subject, or topic..."
            className="pl-10"
          />
        </div>

        {loadingAssessments ? (
          <LoadingState label="Loading assessments…" />
        ) : errAssessments ? (
          <ErrorState message="Could not load assessments." retry={() => refetchAssessments()} />
        ) : filtered.length === 0 ? (
          <Card className="p-2">
            <EmptyState
              icon={<GraduationCap className="w-6 h-6" />}
              title={search ? "No matching assessments" : "No assessments available"}
              description={search ? "Try a different search term." : "Ask your teacher to share an assessment."}
            />
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((a) => {
              const enrollment = a.enrollment
              const status = enrollment?.status
              const isApproved = status === "APPROVED"
              const isPending = status === "PENDING"
              const isRejected = status === "REJECTED"

              return (
                <Card key={a.id} className="p-4 flex items-center gap-4 hover:border-[var(--border-md)] transition-colors">
                  <div className="w-11 h-11 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center flex-shrink-0">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[var(--text)] truncate">{a.title}</p>
                    <p className="text-xs text-[var(--text-3)]">
                      {a.subject} · {a.topic} · {a.totalMarks} marks · {formatDate(a.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isApproved && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400">Enrolled</span>
                    )}
                    {isPending && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400">Pending approval</span>
                    )}
                    {isRejected && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">Rejected</span>
                    )}
                    {!status && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-3)] text-[var(--text-3)]">Not enrolled</span>
                    )}
                  </div>
                  {isApproved ? (
                    <Link href={`/assessments/${a.id}/take`}>
                      <Button variant="primary" size="sm">
                        Take test <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  ) : (
                    <Link href={`/assessments/${a.id}`}>
                      <Button variant="outline" size="sm">
                        {isPending ? "View" : isRejected ? "View" : "Request"} <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <div>
        <h2 className="font-display text-lg font-bold text-[var(--text)] mb-4">Your Submissions</h2>
        {loadingSubs ? (
          <LoadingState label="Loading submissions…" />
        ) : !subs || subs.length === 0 ? (
          <Card className="p-2">
            <EmptyState
              icon={<Trophy className="w-6 h-6" />}
              title="No submissions yet"
              description="Request access to an assessment above to take your first test."
            />
          </Card>
        ) : (
          <div className="space-y-3">
            {subs.map((s) => (
              <Card key={s.id} className="p-4 flex items-center gap-4 hover:border-[var(--border-md)] transition-colors">
                <div className="w-11 h-11 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center flex-shrink-0">
                  <Trophy className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[var(--text)] truncate">{s.assessment?.title ?? "Assessment"}</p>
                  <p className="text-xs text-[var(--text-3)]">{formatDate(s.createdAt)}</p>
                </div>
                {s.status === "graded" && s.maxScore ? (
                  <span className="text-sm font-bold text-[var(--text-2)]">{s.totalScore}/{s.maxScore}</span>
                ) : null}
                <StatusBadge status={s.status} />
                <Link href={`/results/${s.id}`}>
                  <Button variant="outline" size="sm">View <ArrowRight className="w-4 h-4" /></Button>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function AssessmentsPage() {
  const { data: session } = useSession()
  const isTeacher = session?.user?.role === "TEACHER"

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 lg:py-10">
      <PageHeader
        icon={<FileStack className="w-5 h-5" />}
        title={isTeacher ? "My Assessments" : "Assessments"}
        subtitle={isTeacher ? "Manage the assessments you've created and review submissions." : "Browse and request access to assessments."}
        action={
          isTeacher ? (
            <Link href="/create">
              <Button><FilePlus2 className="w-4 h-4" /> New</Button>
            </Link>
          ) : undefined
        }
      />
      {isTeacher ? <TeacherAssessments /> : <StudentAssessments />}
    </div>
  )
}
