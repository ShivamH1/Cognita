"use client"

import React from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { useQuery } from "@tanstack/react-query"
import { useApi, useApiToken } from "@/lib/use-api"
import { PageHeader } from "@/components/app-shell"
import { StatCard } from "@/components/dashboard/stat-card"
import { StatusBadge } from "@/components/status-badge"
import { Button, Card, LoadingState, ErrorState, EmptyState } from "@/components/ui"
import { formatDateTime } from "@/lib/utils"
import {
  LayoutDashboard,
  FileStack,
  Users,
  Trophy,
  Library,
  MessageSquareText,
  Sparkles,
  FilePlus2,
  GraduationCap,
  ArrowRight,
  BookOpen,
  Map,
} from "lucide-react"

function pct(v: number | null) {
  return v === null ? "—" : `${v}%`
}

function TeacherDashboard() {
  const api = useApi()
  const token = useApiToken()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["analytics", "teacher"],
    queryFn: () => api.teacherAnalytics(),
    enabled: !!token,
  })

  const { data: roadmaps } = useQuery({
    queryKey: ["roadmaps"],
    queryFn: () => api.listRoadmaps(),
    enabled: !!token,
  })

  if (isLoading) return <LoadingState label="Loading your dashboard…" />
  if (isError || !data) return <ErrorState message="Could not load analytics." retry={() => refetch()} />

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Assignments" value={data.assignmentCount} icon={<FilePlus2 className="w-5 h-5" />} />
        <StatCard label="Assessments" value={data.assessmentCount} icon={<FileStack className="w-5 h-5" />} accent="emerald" />
        <StatCard label="Submissions" value={data.submissionCount} icon={<Users className="w-5 h-5" />} accent="amber" />
        <StatCard label="Avg. Score" value={pct(data.averageScorePct)} icon={<Trophy className="w-5 h-5" />} accent="rose" />
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg font-bold text-[var(--text)]">Recent assessments</h2>
          <Link href="/assessments">
            <Button variant="ghost" size="sm">
              View all <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
        {data.assessments.length === 0 ? (
          <EmptyState
            icon={<FileStack className="w-6 h-6" />}
            title="No assessments yet"
            description="Create your first AI-generated assessment to get started."
            action={
              <Link href="/create">
                <Button>Create assessment</Button>
              </Link>
            }
          />
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {data.assessments.slice(0, 6).map((a) => (
              <Link
                key={a.id}
                href={`/assessments/${a.id}`}
                className="flex items-center justify-between py-3.5 group"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-[var(--text)] truncate group-hover:text-brand-400 transition-colors">
                    {a.title}
                  </p>
                  <p className="text-xs text-[var(--text-3)]">
                    {a.subject} · {a._count.submissions} submission{a._count.submissions === 1 ? "" : "s"}
                  </p>
                </div>
                <StatusBadge status={a.status} />
              </Link>
            ))}
          </div>
        )}
      </Card>

      {/* Roadmaps section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg font-bold text-[var(--text)]">My roadmaps</h2>
          <Link href="/roadmaps">
            <Button variant="ghost" size="sm">
              View all <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
        {!roadmaps || roadmaps.length === 0 ? (
          <EmptyState
            icon={<Map className="w-6 h-6" />}
            title="No roadmaps yet"
            description="Create a learning roadmap for your students."
            action={
              <Link href="/roadmaps/create">
                <Button>Create roadmap</Button>
              </Link>
            }
          />
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {roadmaps.slice(0, 5).map((r: any) => (
              <Link
                key={r.id}
                href={r.status === "COMPLETE" ? `/roadmaps/${r.id}/view` : `/roadmaps/${r.id}`}
                className="flex items-center justify-between py-3.5 group"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-[var(--text)] truncate group-hover:text-brand-400 transition-colors">
                    {r.title}
                  </p>
                  <p className="text-xs text-[var(--text-3)]">
                    {r.topic}{r._count ? ` · ${r._count.enrollments} enrollment${r._count.enrollments === 1 ? "" : "s"}` : ""}
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function StudentDashboard() {
  const api = useApi()
  const token = useApiToken()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["analytics", "student"],
    queryFn: () => api.studentAnalytics(),
    enabled: !!token,
  })

  const { data: roadmaps } = useQuery({
    queryKey: ["roadmaps", "enrolled"],
    queryFn: () => api.listRoadmaps(),
    enabled: !!token,
  })

  const quickLinks = [
    { href: "/library", label: "Upload & manage docs", icon: <Library className="w-5 h-5" />, desc: "Your document library" },
    { href: "/study", label: "Study aids", icon: <Sparkles className="w-5 h-5" />, desc: "Summaries & flashcards" },
    { href: "/assessments", label: "Assessments", icon: <GraduationCap className="w-5 h-5" />, desc: "Take & review tests" },
    { href: "/roadmaps", label: "Roadmaps", icon: <Map className="w-5 h-5" />, desc: "Learning paths" },
  ]

  if (isLoading) return <LoadingState label="Loading your dashboard…" />
  if (isError || !data) return <ErrorState message="Could not load analytics." retry={() => refetch()} />

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Documents" value={data.documentCount} icon={<BookOpen className="w-5 h-5" />} />
        <StatCard label="Tutor chats" value={data.chatSessionCount} icon={<MessageSquareText className="w-5 h-5" />} accent="emerald" />
        <StatCard label="Graded" value={data.gradedCount} icon={<GraduationCap className="w-5 h-5" />} accent="amber" />
        <StatCard label="Avg. Score" value={pct(data.averageScorePct)} icon={<Trophy className="w-5 h-5" />} accent="rose" />
      </div>

      {/* Quick-link cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickLinks.map((q) => (
          <Link
            key={q.href}
            href={q.href}
            className="group glass rounded-2xl border border-[var(--border)] p-5 hover:border-brand-500/30 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-500/10 transition-all"
          >
            <div className="w-11 h-11 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              {q.icon}
            </div>
            <p className="font-semibold text-[var(--text)]">{q.label}</p>
            <p className="text-xs text-[var(--text-3)] mt-0.5">{q.desc}</p>
          </Link>
        ))}
      </div>

      {/* Enrolled roadmaps */}
      {roadmaps && roadmaps.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-lg font-bold text-[var(--text)]">My learning roadmaps</h2>
            <Link href="/roadmaps">
              <Button variant="ghost" size="sm">
                View all <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {(roadmaps as any[]).slice(0, 3).map((r) => (
              <Link
                key={r.id}
                href={r.enrollment?.status === "APPROVED" ? `/roadmaps/${r.id}/view` : `/roadmaps/${r.id}`}
                className="flex items-center justify-between py-3.5 group"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-[var(--text)] truncate group-hover:text-brand-400 transition-colors">
                    {r.title}
                  </p>
                  <p className="text-xs text-[var(--text-3)]">{r.topic}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    r.enrollment?.status === "APPROVED" ? "bg-green-500/10 text-green-400" :
                    r.enrollment?.status === "PENDING" ? "bg-yellow-500/10 text-yellow-400" :
                    r.enrollment?.status === "REJECTED" ? "bg-red-500/10 text-red-400" :
                    "bg-[var(--bg-3)] text-[var(--text-3)]"
                  }`}>
                    {r.enrollment?.status === "APPROVED" ? "Enrolled" :
                     r.enrollment?.status === "PENDING" ? "Pending" :
                     r.enrollment?.status === "REJECTED" ? "Rejected" :
                     "Not enrolled"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg font-bold text-[var(--text)]">Recent submissions</h2>
          <Link href="/progress">
            <Button variant="ghost" size="sm">
              View progress <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
        {data.recentSubmissions.length === 0 ? (
          <EmptyState
            icon={<GraduationCap className="w-6 h-6" />}
            title="No submissions yet"
            description="Take an assessment to see your results and AI feedback here."
            action={
              <Link href="/assessments">
                <Button>Browse assessments</Button>
              </Link>
            }
          />
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {data.recentSubmissions.map((s) => (
              <Link
                key={s.id}
                href={`/results/${s.id}`}
                className="flex items-center justify-between py-3.5 group"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-[var(--text)] truncate group-hover:text-brand-400 transition-colors">
                    {s.assessment?.title ?? "Assessment"}
                  </p>
                  <p className="text-xs text-[var(--text-3)]">{formatDateTime(s.createdAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  {s.status === "graded" && s.maxScore ? (
                    <span className="text-sm font-bold text-[var(--text-2)]">
                      {s.totalScore}/{s.maxScore}
                    </span>
                  ) : null}
                  <StatusBadge status={s.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const role = session?.user?.role
  const name = session?.user?.name?.split(" ")[0] || "there"

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 lg:py-10">
      <PageHeader
        icon={<LayoutDashboard className="w-5 h-5" />}
        title={`Welcome back, ${name}`}
        subtitle={
          role === "TEACHER"
            ? "Your teaching overview and recent assessment activity."
            : "Your learning overview and recent activity."
        }
        action={
          role === "TEACHER" ? (
            <Link href="/create">
              <Button>
                <FilePlus2 className="w-4 h-4" /> New assessment
              </Button>
            </Link>
          ) : (
            <Link href="/library">
              <Button>
                <Library className="w-4 h-4" /> Go to library
              </Button>
            </Link>
          )
        }
      />
      {role === "TEACHER" ? <TeacherDashboard /> : <StudentDashboard />}
    </div>
  )
}
