"use client"

import React, { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useApi, useApiToken } from "@/lib/use-api"
import { useRoadmapGenerationStore } from "@/store/roadmap.store"
import { PageHeader } from "@/components/app-shell"
import { Button, Card } from "@/components/ui"
import { GenerationProgress } from "@/components/assessment/GenerationProgress"
import { Map, Clock, CheckCircle2, XCircle, UserPlus } from "lucide-react"

export default function RoadmapProgressPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: session } = useSession()
  const api = useApi()
  const token = useApiToken()
  const isTeacher = session?.user?.role === "TEACHER"
  const queryClient = useQueryClient()
  const { connect, status, disconnect } = useRoadmapGenerationStore()

  const { data: roadmap } = useQuery({
    queryKey: ["roadmap", id],
    queryFn: () => api.getRoadmap(id),
    enabled: !!token,
  })

  const enrollMutation = useMutation({
    mutationFn: () => api.enrollRoadmap(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["roadmap", id] }),
  })

  useEffect(() => {
    if (roadmap?.status === "COMPLETE") {
      if (isTeacher || roadmap.enrollment?.status === "APPROVED") {
        router.push(`/roadmaps/${id}/view`)
        return
      }
      return
    }
    connect(id)
    return () => disconnect()
  }, [id, connect, disconnect, roadmap?.status, roadmap?.enrollment?.status, isTeacher, router])

  useEffect(() => {
    if (status === "complete") {
      router.push(`/roadmaps/${id}/view`)
    }
  }, [status, id, router])

  const enrollment = roadmap?.enrollment
  const enrollmentStatus = enrollment?.status

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 lg:py-10">
      <PageHeader
        icon={<Map className="w-5 h-5" />}
        title={roadmap?.title || "Roadmap"}
        subtitle={roadmap?.topic}
      />

      {/* Enrollment status banner (student view only) */}
      {!isTeacher && enrollment !== undefined && (
        <Card className="p-4 mt-6">
          {enrollment?.status === "APPROVED" ? (
            <div className="flex items-center gap-3 text-green-400">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-medium">You are enrolled in this roadmap.</span>
            </div>
          ) : enrollment?.status === "PENDING" ? (
            <div className="flex items-center gap-3 text-yellow-400">
              <Clock className="w-5 h-5" />
              <span className="text-sm font-medium">Enrollment request pending teacher approval.</span>
            </div>
          ) : enrollment?.status === "REJECTED" ? (
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

      {/* Generation progress */}
      <div className="mt-6">
        <GenerationProgress />
      </div>
    </div>
  )
}
