"use client"

import React from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { useApi, useApiToken } from "@/lib/use-api"
import { PageHeader } from "@/components/app-shell"
import { StatCard } from "@/components/dashboard/stat-card"
import { StatusBadge } from "@/components/status-badge"
import { Card, LoadingState, ErrorState, EmptyState, Button } from "@/components/ui"
import { formatDateTime } from "@/lib/utils"
import { BarChart3, BookOpen, MessageSquareText, Sparkles, Trophy, GraduationCap, ArrowRight } from "lucide-react"

export default function ProgressPage() {
  const api = useApi()
  const token = useApiToken()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["analytics", "student"],
    queryFn: () => api.studentAnalytics(),
    enabled: !!token,
  })

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 lg:py-10">
      <PageHeader
        icon={<BarChart3 className="w-5 h-5" />}
        title="Your Progress"
        subtitle="Track your learning activity and assessment performance."
      />

      {isLoading ? (
        <LoadingState label="Loading your progress…" />
      ) : isError || !data ? (
        <ErrorState message="Could not load your progress." retry={() => refetch()} />
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Documents" value={data.documentCount} icon={<BookOpen className="w-5 h-5" />} />
            <StatCard label="Tutor chats" value={data.chatSessionCount} icon={<MessageSquareText className="w-5 h-5" />} accent="emerald" />
            <StatCard label="Study aids" value={data.artifactCount} icon={<Sparkles className="w-5 h-5" />} accent="amber" />
            <StatCard
              label="Avg. score"
              value={data.averageScorePct === null ? "—" : `${data.averageScorePct}%`}
              icon={<Trophy className="w-5 h-5" />}
              accent="rose"
              hint={`${data.gradedCount} graded`}
            />
          </div>

          <Card className="p-6">
            <h2 className="font-display text-lg font-bold text-[var(--text)] mb-5">Submission history</h2>
            {data.recentSubmissions.length === 0 ? (
              <EmptyState
                icon={<GraduationCap className="w-6 h-6" />}
                title="No submissions yet"
                description="Take an assessment to start building your progress history."
                action={<Link href="/assessments"><Button>Browse assessments</Button></Link>}
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
                      <p className="text-xs text-[var(--text-3)]">
                        {s.assessment?.subject} · {formatDateTime(s.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {s.status === "graded" && s.maxScore ? (
                        <span className="text-sm font-bold text-[var(--text-2)]">
                          {s.totalScore}/{s.maxScore}
                        </span>
                      ) : null}
                      <StatusBadge status={s.status} />
                      <ArrowRight className="w-4 h-4 text-[var(--text-3)] group-hover:text-brand-400 transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
