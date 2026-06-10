"use client"

import React, { useState, useMemo } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { useQuery } from "@tanstack/react-query"
import { useApi, useApiToken } from "@/lib/use-api"
import { PageHeader } from "@/components/app-shell"
import { StatusBadge } from "@/components/status-badge"
import { Button, Card, Input, LoadingState, ErrorState, EmptyState } from "@/components/ui"
import { formatDate } from "@/lib/utils"
import { Map, Plus, ArrowRight, Search } from "lucide-react"

function TeacherRoadmaps() {
  const api = useApi()
  const token = useApiToken()
  const [search, setSearch] = useState("")

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["roadmaps", search],
    queryFn: () => api.listRoadmaps(search || undefined),
    enabled: !!token,
  })

  if (isLoading) return <LoadingState label="Loading roadmaps..." />
  if (isError || !data) return <ErrorState message="Could not load roadmaps." retry={() => refetch()} />

  return (
    <>
      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-3)]" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title, topic, or audience..."
          className="pl-10"
        />
      </div>

      {data.length === 0 ? (
        <Card className="p-2">
          <EmptyState
            icon={<Map className="w-6 h-6" />}
            title={search ? "No matching roadmaps" : "No roadmaps yet"}
            description={search ? "Try a different search term." : "Create your first AI-generated learning roadmap."}
            action={
              !search ? (
                <Link href="/roadmaps/create">
                  <Button><Plus className="w-4 h-4" /> Create roadmap</Button>
                </Link>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map((r: any) => (
            <Card key={r.id} className="p-4 flex items-center gap-4 hover:border-[var(--border-md)] transition-colors">
              <div className="w-11 h-11 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center flex-shrink-0">
                <Map className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-[var(--text)] truncate">{r.title}</p>
                <p className="text-xs text-[var(--text-3)]">
                  {r.topic}{r.targetAudience ? ` · ${r.targetAudience}` : ""}{r.durationWeeks ? ` · ${r.durationWeeks} weeks` : ""} · {formatDate(r.createdAt)}
                  {r._count ? ` · ${r._count.enrollments} enrollment${r._count.enrollments === 1 ? "" : "s"}` : ""}
                </p>
              </div>
              <StatusBadge status={r.status} />
              <Link href={r.status === "COMPLETE" ? `/roadmaps/${r.id}/view` : `/roadmaps/${r.id}`}>
                <Button variant={r.status === "COMPLETE" ? "primary" : "outline"} size="sm">
                  {r.status === "COMPLETE" ? "Open" : "Progress"} <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}

function StudentRoadmaps() {
  const api = useApi()
  const token = useApiToken()
  const [search, setSearch] = useState("")

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["roadmaps", "enrolled", search],
    queryFn: () => api.listRoadmaps(search || undefined),
    enabled: !!token,
  })

  if (isLoading) return <LoadingState label="Loading roadmaps..." />
  if (isError || !data) return <ErrorState message="Could not load roadmaps." retry={() => refetch()} />

  return (
    <>
      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-3)]" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title, topic, or audience..."
          className="pl-10"
        />
      </div>

      {data.length === 0 ? (
        <Card className="p-2">
          <EmptyState
            icon={<Map className="w-6 h-6" />}
            title={search ? "No matching roadmaps" : "No roadmaps available"}
            description={search ? "Try a different search term." : "Ask your teacher to share a roadmap, or check back later."}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {(data as any[]).map((r) => {
            const enrollment = r.enrollment
            const status = enrollment?.status
            const isApproved = status === "APPROVED"
            const isPending = status === "PENDING"
            const isRejected = status === "REJECTED"

            return (
              <Card key={r.id} className="p-4 flex items-center gap-4 hover:border-[var(--border-md)] transition-colors">
                <div className="w-11 h-11 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center flex-shrink-0">
                  <Map className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[var(--text)] truncate">{r.title}</p>
                  <p className="text-xs text-[var(--text-3)]">
                    {r.topic}{r.targetAudience ? ` · ${r.targetAudience}` : ""}{r.durationWeeks ? ` · ${r.durationWeeks} weeks` : ""} · {formatDate(r.createdAt)}
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
                <Link href={isApproved ? `/roadmaps/${r.id}/view` : `/roadmaps/${r.id}`}>
                  <Button
                    variant={isApproved ? "primary" : "outline"}
                    size="sm"
                  >
                    {isApproved ? "Open" : "View"} <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </Card>
            )
          })}
        </div>
      )}
    </>
  )
}

export default function RoadmapsPage() {
  const { data: session } = useSession()
  const isTeacher = session?.user?.role === "TEACHER"

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 lg:py-10">
      <PageHeader
        icon={<Map className="w-5 h-5" />}
        title={isTeacher ? "My Roadmaps" : "Learning Roadmaps"}
        subtitle={isTeacher ? "Create and manage learning roadmaps for your students." : "Browse and follow learning roadmaps."}
        action={
          isTeacher ? (
            <Link href="/roadmaps/create">
              <Button><Plus className="w-4 h-4" /> New</Button>
            </Link>
          ) : undefined
        }
      />
      {isTeacher ? <TeacherRoadmaps /> : <StudentRoadmaps />}
    </div>
  )
}
