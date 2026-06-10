"use client"

import React, { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useApi, useApiToken } from "@/lib/use-api"
import { useRoadmapProgressStore } from "@/store/roadmap.store"
import { PageHeader } from "@/components/app-shell"
import { Button, Card, LoadingState, ErrorState } from "@/components/ui"
import { streamMilestoneChat } from "@/lib/api"
import { formatDate } from "@/lib/utils"
import { Map, CheckCircle2, Circle, ChevronDown, ChevronRight, ExternalLink, Send, BookOpen, Video, FileText, Dumbbell, GraduationCap, Clock, XCircle, UserPlus, Users, Check, Ban } from "lucide-react"

const resourceIcon: Record<string, React.ReactNode> = {
  video: <Video className="w-4 h-4" />,
  article: <FileText className="w-4 h-4" />,
  pdf: <FileText className="w-4 h-4" />,
  exercise: <Dumbbell className="w-4 h-4" />,
  book: <GraduationCap className="w-4 h-4" />,
}

export default function RoadmapViewPage() {
  const { id } = useParams<{ id: string }>()
  const { data: session } = useSession()
  const api = useApi()
  const token = useApiToken()
  const isTeacher = session?.user?.role === "TEACHER"
  const queryClient = useQueryClient()

  const { data: roadmap, isLoading, isError } = useQuery({
    queryKey: ["roadmap", id],
    queryFn: () => api.getRoadmap(id),
    enabled: !!token,
  })

  const enrollMutation = useMutation({
    mutationFn: () => api.enrollRoadmap(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["roadmap", id] }),
  })

  const {
    completedTasks, completedResources, notes, initialized,
    init, toggleTask, toggleResource, setNote,
  } = useRoadmapProgressStore()

  const { data: enrollments, refetch: refetchEnrollments } = useQuery({
    queryKey: ["roadmap", id, "enrollments"],
    queryFn: () => api.listRoadmapEnrollments(id),
    enabled: !!token && isTeacher,
  })

  const approveMutation = useMutation({
    mutationFn: (eid: string) => api.approveRoadmapEnrollment(id, eid),
    onSuccess: () => { refetchEnrollments(); queryClient.invalidateQueries({ queryKey: ["roadmap", id] }) },
  })

  const rejectMutation = useMutation({
    mutationFn: (eid: string) => api.rejectRoadmapEnrollment(id, eid),
    onSuccess: () => { refetchEnrollments(); queryClient.invalidateQueries({ queryKey: ["roadmap", id] }) },
  })

  useEffect(() => {
    if (roadmap?.enrollment?.status === "APPROVED" && !initialized) {
      init(roadmap.id, roadmap.enrollment)
    }
  }, [roadmap, initialized, init])

  if (isLoading) return <div className="max-w-5xl mx-auto px-4 py-10"><LoadingState label="Loading roadmap..." /></div>
  if (isError || !roadmap) return <div className="max-w-5xl mx-auto px-4 py-10"><ErrorState message="Could not load roadmap." /></div>

  const enrollment = roadmap.enrollment
  const enrollmentStatus = enrollment?.status
  const isApproved = enrollmentStatus === "APPROVED"
  const isPending = enrollmentStatus === "PENDING"
  const isRejected = enrollmentStatus === "REJECTED"
  const hasAccess = isTeacher || isApproved

  // If student doesn't have phases data, they're not approved — show enrollment-only view
  const hasContent = isTeacher || isApproved || (roadmap.phases && roadmap.phases.length > 0)
  const phases = roadmap.phases ?? []
  const totalTasks = phases.reduce((s: number, p: any) => s + (p.milestones ?? []).reduce((ms: number, m: any) => ms + (m.tasks ?? []).length, 0), 0)
  const totalResources = phases.reduce((s: number, p: any) => s + (p.milestones ?? []).reduce((ms: number, m: any) => ms + (m.resources ?? []).length, 0), 0)
  const progressPct = totalTasks + totalResources > 0
    ? Math.round(((completedTasks.length + completedResources.length) / (totalTasks + totalResources)) * 100)
    : 0

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 lg:py-10">
      <PageHeader
        icon={<Map className="w-5 h-5" />}
        title={roadmap.title}
        subtitle={`${roadmap.topic}${roadmap.targetAudience ? ` · ${roadmap.targetAudience}` : ""}${roadmap.durationWeeks ? ` · ${roadmap.durationWeeks} weeks` : ""}`}
      />

      {/* Enrollment management (teacher view) */}
      {isTeacher && enrollments && enrollments.length > 0 && (
        <Card className="p-4 mt-6">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-[var(--text-3)]" />
            <span className="text-sm font-medium text-[var(--text)]">Enrollments ({enrollments.length})</span>
          </div>
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
        </Card>
      )}

      {/* Enrollment status banner (student view only) */}
      {!isTeacher && (
        <Card className="p-4 mt-6">
          {isApproved ? (
            <div className="flex items-center gap-3 text-green-400">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-medium">You are enrolled in this roadmap. Start learning!</span>
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
                <span className="text-sm text-[var(--text-2)]">You are not enrolled in this roadmap.</span>
              </div>
              <Button
                size="sm"
                onClick={() => enrollMutation.mutate()}
                disabled={enrollMutation.isPending}
              >
                {enrollMutation.isPending ? "Requesting..." : "Request enrollment"}
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Progress bar (only for approved enrollment or teacher) */}
      {hasAccess && (
        <Card className="p-4 mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[var(--text-2)]">Overall Progress</span>
            <span className="text-sm font-bold text-[var(--text)]">{progressPct}%</span>
          </div>
          <div className="w-full h-2 bg-[var(--bg-3)] rounded-full overflow-hidden">
            <div className="h-full bg-brand-500 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
          <p className="text-xs text-[var(--text-3)] mt-1">
            {completedTasks.length}/{totalTasks} tasks · {completedResources.length}/{totalResources} resources
          </p>
        </Card>
      )}

      {/* Phases */}
      {hasAccess && (
        <div className="mt-6 space-y-4">
          {phases.map((phase: any, pi: number) => (
            <PhaseAccordion key={phase.id} phase={phase} roadmapId={id} isTeacher={isTeacher} token={token} />
          ))}
        </div>
      )}
    </div>
  )
}

function PhaseAccordion({ phase, roadmapId, isTeacher, token }: { phase: any; roadmapId: string; isTeacher: boolean; token?: string }) {
  const [open, setOpen] = useState(true)
  return (
    <Card className="overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full p-4 flex items-center gap-3 hover:bg-[var(--bg-2)] transition-colors text-left">
        {open ? <ChevronDown className="w-5 h-5 text-[var(--text-3)]" /> : <ChevronRight className="w-5 h-5 text-[var(--text-3)]" />}
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[var(--text)]">{phase.title}</p>
          <p className="text-xs text-[var(--text-3)]">{phase.description}</p>
        </div>
        <span className="text-xs text-[var(--text-3)] whitespace-nowrap">~{phase.estimatedWeeks} weeks</span>
      </button>
      {open && (
        <div className="border-t border-[var(--border)] p-4 space-y-4">
          {(phase.milestones ?? []).map((milestone: any) => (
            <MilestoneCard key={milestone.id} milestone={milestone} roadmapId={roadmapId} isTeacher={isTeacher} token={token} />
          ))}
        </div>
      )}
    </Card>
  )
}

function MilestoneCard({ milestone, roadmapId, isTeacher, token }: { milestone: any; roadmapId: string; isTeacher: boolean; token?: string }) {
  const { completedTasks, completedResources, notes, toggleTask, toggleResource, setNote } = useRoadmapProgressStore()
  const [chatOpen, setChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState("")
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([])
  const [chatLoading, setChatLoading] = useState(false)

  const note = notes.find((n) => n.milestoneId === milestone.id)

  const handleChat = () => {
    if (!chatInput.trim()) return
    const q = chatInput.trim()
    setChatMessages((prev) => [...prev, { role: "user", content: q }])
    setChatInput("")
    setChatLoading(true)

    let answer = ""
    streamMilestoneChat(token, roadmapId, milestone.id, q, {
      onToken: (t) => { answer += t; setChatMessages((prev) => { const next = [...prev]; const last = next[next.length - 1]; if (last?.role === "assistant") { last.content = answer } else { next.push({ role: "assistant", content: answer }) }; return next }) },
      onDone: () => setChatLoading(false),
      onError: () => { setChatMessages((prev) => [...prev, { role: "assistant", content: "Error getting response." }]); setChatLoading(false) },
    })
  }

  return (
    <div className="border border-[var(--border)] rounded-lg p-4 space-y-3">
      <div>
        <h4 className="font-semibold text-[var(--text)]">{milestone.title}</h4>
        <p className="text-xs text-[var(--text-3)] mt-1">{milestone.description}</p>
      </div>

      {/* Resources */}
      {(milestone.resources ?? []).length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-[var(--text-2)] uppercase tracking-wide">Resources</p>
          {milestone.resources.map((res: any) => (
            <label key={res.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-[var(--bg-2)] cursor-pointer group">
              <input
                type="checkbox"
                checked={completedResources.includes(res.id)}
                onChange={() => !isTeacher && toggleResource(res.id, token ?? undefined)}
                disabled={isTeacher}
                className="rounded border-[var(--border)]"
              />
              <span className="text-[var(--text-3)] group-hover:text-[var(--text-2)]">{resourceIcon[res.type] ?? <BookOpen className="w-4 h-4" />}</span>
              <span className="text-sm text-[var(--text)] flex-1">{res.title}</span>
              {res.url && <a href={res.url} target="_blank" rel="noopener noreferrer" className="text-[var(--text-3)] hover:text-brand-400"><ExternalLink className="w-3.5 h-3.5" /></a>}
            </label>
          ))}
        </div>
      )}

      {/* Tasks */}
      {(milestone.tasks ?? []).length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-[var(--text-2)] uppercase tracking-wide">Tasks</p>
          {milestone.tasks.map((task: any) => (
            <label key={task.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-[var(--bg-2)] cursor-pointer">
              <input
                type="checkbox"
                checked={completedTasks.includes(task.id)}
                onChange={() => !isTeacher && toggleTask(task.id, token ?? undefined)}
                disabled={isTeacher}
                className="rounded border-[var(--border)]"
              />
              <span className="text-sm text-[var(--text)]">{task.text}</span>
            </label>
          ))}
        </div>
      )}

      {/* Notes */}
      {!isTeacher && (
        <div>
          <p className="text-xs font-medium text-[var(--text-2)] mb-1">Notes</p>
          <textarea
            className="w-full text-sm p-2 rounded border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] resize-none"
            rows={2}
            placeholder="Add notes for this milestone..."
            value={note?.note ?? ""}
            onBlur={(e) => setNote(milestone.id, e.target.value, token ?? undefined)}
            onChange={(e) => setNote(milestone.id, e.target.value)}
          />
        </div>
      )}

      {/* Chat toggle */}
      <Button variant="outline" size="sm" onClick={() => setChatOpen(!chatOpen)}>
        {chatOpen ? "Close Chat" : "Ask AI Tutor"}
      </Button>

      {chatOpen && (
        <div className="border border-[var(--border)] rounded-lg overflow-hidden">
          <div className="h-48 overflow-y-auto p-3 space-y-2 bg-[var(--bg-2)]">
            {chatMessages.length === 0 && <p className="text-xs text-[var(--text-3)]">Ask a question about this milestone...</p>}
            {chatMessages.map((msg, i) => (
              <div key={i} className={`text-sm ${msg.role === "user" ? "text-right" : ""}`}>
                <span className={`inline-block px-2 py-1 rounded ${msg.role === "user" ? "bg-brand-500/20 text-brand-300" : "bg-[var(--bg-3)] text-[var(--text)]"}`}>
                  {msg.content}
                </span>
              </div>
            ))}
          </div>
          <div className="flex gap-2 p-2 border-t border-[var(--border)]">
            <input
              className="flex-1 text-sm p-2 rounded border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleChat()}
              placeholder="Ask a question..."
              disabled={chatLoading}
            />
            <Button size="sm" onClick={handleChat} disabled={chatLoading || !chatInput.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
