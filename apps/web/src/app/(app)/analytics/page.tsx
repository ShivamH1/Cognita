"use client"

import React from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { useApi, useApiToken } from "@/lib/use-api"
import { PageHeader } from "@/components/app-shell"
import { StatCard } from "@/components/dashboard/stat-card"
import { StatusBadge } from "@/components/status-badge"
import { Card, LoadingState, ErrorState, EmptyState, Button } from "@/components/ui"
import { formatDate } from "@/lib/utils"
import {
  BarChart3,
  FilePlus2,
  FileStack,
  Users,
  Trophy,
  ArrowRight,
} from "lucide-react"

export default function AnalyticsPage() {
  const api = useApi()
  const token = useApiToken()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["analytics", "teacher"],
    queryFn: () => api.teacherAnalytics(),
    enabled: !!token,
  })

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 lg:py-10">
      <PageHeader
        icon={<BarChart3 className="w-5 h-5" />}
        title="Analytics"
        subtitle="Your assessments and student performance at a glance."
        action={
          <Link href="/create">
            <Button>
              <FilePlus2 className="w-4 h-4" /> New assessment
            </Button>
          </Link>
        }
      />

      {isLoading ? (
        <LoadingState label="Loading analytics…" />
      ) : isError || !data ? (
        <ErrorState message="Could not load analytics." retry={() => refetch()} />
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Assignments" value={data.assignmentCount} icon={<FilePlus2 className="w-5 h-5" />} />
            <StatCard label="Assessments" value={data.assessmentCount} icon={<FileStack className="w-5 h-5" />} accent="emerald" />
            <StatCard label="Submissions" value={data.submissionCount} icon={<Users className="w-5 h-5" />} accent="amber" />
            <StatCard
              label="Avg. score"
              value={data.averageScorePct === null ? "—" : `${data.averageScorePct}%`}
              icon={<Trophy className="w-5 h-5" />}
              accent="rose"
            />
          </div>

          <Card className="p-6">
            <h2 className="font-display text-lg font-bold text-slate-900 mb-5">Assessment breakdown</h2>
            {data.assessments.length === 0 ? (
              <EmptyState
                icon={<FileStack className="w-6 h-6" />}
                title="No assessments yet"
                description="Create an assessment to see performance analytics."
                action={
                  <Link href="/create">
                    <Button>Create assessment</Button>
                  </Link>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                      <th className="py-2 pr-4 font-bold">Assessment</th>
                      <th className="py-2 pr-4 font-bold">Subject</th>
                      <th className="py-2 pr-4 font-bold">Status</th>
                      <th className="py-2 pr-4 font-bold">Submissions</th>
                      <th className="py-2 pr-4 font-bold">Created</th>
                      <th className="py-2 font-bold"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.assessments.map((a) => (
                      <tr key={a.id} className="border-b border-slate-50 last:border-none">
                        <td className="py-2.5 pr-4 font-semibold text-slate-700">{a.title}</td>
                        <td className="py-2.5 pr-4 text-slate-500">{a.subject}</td>
                        <td className="py-2.5 pr-4">
                          <StatusBadge status={a.status} />
                        </td>
                        <td className="py-2.5 pr-4 font-semibold text-slate-700">{a._count.submissions}</td>
                        <td className="py-2.5 pr-4 text-xs text-slate-400">{formatDate(a.createdAt)}</td>
                        <td className="py-2.5">
                          <Link
                            href={`/assessments/${a.id}`}
                            className="text-brand-600 hover:text-brand-700 font-semibold inline-flex items-center gap-1"
                          >
                            Open <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
