import type {
  AssignmentRecord,
  ChatMessage,
  ChatSession,
  ChatSource,
  DocumentItem,
  GeneratedAssessment,
  StudentAnalytics,
  StudyArtifact,
  Submission,
  SummaryContent,
  FlashcardsContent,
  TeacherAnalytics,
  SectionConfig,
  RoadmapRecord,
  RoadmapEnrollment,
  StudentRoadmapProgress,
  AssessmentRecord,
  AssessmentEnrollment,
} from "@/types"

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export interface ApiError extends Error {
  status?: number
}

async function request<T>(
  token: string | undefined,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers)
  if (token) headers.set("Authorization", `Bearer ${token}`)
  // Only set JSON content-type when we aren't sending FormData.
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  })

  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const data = await res.json()
      message = data.error || data.message || message
    } catch {
      /* non-json error body */
    }
    const err = new Error(message) as ApiError
    err.status = res.status
    throw err
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

// ─── Assignments & Assessments ──────────────────────────────────────────────

export interface CreateAssignmentBody {
  title: string
  subject: string
  topic: string
  gradeLevel: string
  dueDate: string
  sections: SectionConfig[]
  additionalInstructions?: string
  documentId?: string
}

export interface CreateRoadmapBody {
  title: string
  topic: string
  targetAudience?: string
  durationWeeks?: number
  providedUrls?: string[]
  documentIds?: string[]
}

export function createApi(token: string | undefined) {
  return {
    // Documents
    listDocuments: () => request<DocumentItem[]>(token, "/api/documents"),
    getDocument: (id: string) => request<DocumentItem>(token, `/api/documents/${id}`),
    uploadDocument: (file: File) => {
      const form = new FormData()
      form.append("file", file)
      return request<{ documentId: string; status: string; filename: string }>(
        token,
        "/api/documents",
        { method: "POST", body: form },
      )
    },
    deleteDocument: (id: string) =>
      request<{ message: string }>(token, `/api/documents/${id}`, { method: "DELETE" }),

    // Assignments
    createAssignment: (body: CreateAssignmentBody) =>
      request<{ assignmentId: string; jobId: string; status: string }>(token, "/api/assignments", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    listAssignments: () => request<AssignmentRecord[]>(token, "/api/assignments"),
    getAssignment: (id: string) => request<AssignmentRecord>(token, `/api/assignments/${id}`),
    deleteAssignment: (id: string) => request<void>(token, `/api/assignments/${id}`, { method: "DELETE" }),

    // Assessments
    listAssessments: (q?: string) => request<AssessmentRecord[]>(token, `/api/assessments${q ? `?q=${encodeURIComponent(q)}` : ""}`),
    getAssessment: (id: string, includeAnswers = false) =>
      request<GeneratedAssessment>(
        token,
        `/api/assessments/${id}?includeAnswers=${includeAnswers}`,
      ),
    regenerateAssessment: (id: string) =>
      request<{ message: string; assessmentId: string; assignmentId: string }>(
        token,
        `/api/assessments/${id}/regenerate`,
        { method: "POST" },
      ),
    enrollAssessment: (id: string) =>
      request<{ enrollmentId: string; status: string; message?: string }>(token, `/api/assessments/${id}/enroll`, {
        method: "POST",
      }),
    approveAssessmentEnrollment: (assessmentId: string, enrollmentId: string) =>
      request<AssessmentEnrollment>(token, `/api/assessments/${assessmentId}/enrollments/${enrollmentId}/approve`, {
        method: "PATCH",
      }),
    rejectAssessmentEnrollment: (assessmentId: string, enrollmentId: string) =>
      request<AssessmentEnrollment>(token, `/api/assessments/${assessmentId}/enrollments/${enrollmentId}/reject`, {
        method: "PATCH",
      }),
    listAssessmentEnrollments: (id: string) =>
      request<(AssessmentEnrollment & { student: { id: string; name: string | null; email: string } })[]>(
        token,
        `/api/assessments/${id}/enrollments`,
      ),

    // Tutor
    createTutorSession: (documentId: string) =>
      request<ChatSession>(token, "/api/tutor/sessions", {
        method: "POST",
        body: JSON.stringify({ documentId }),
      }),
    listTutorSessions: (documentId: string) =>
      request<ChatSession[]>(token, `/api/tutor/sessions?documentId=${documentId}`),
    getMessages: (sessionId: string) =>
      request<ChatMessage[]>(token, `/api/tutor/sessions/${sessionId}/messages`),

    // Submissions
    createSubmission: (assessmentId: string, answers: Record<string, string>) =>
      request<{ submissionId: string; status: string }>(token, "/api/submissions", {
        method: "POST",
        body: JSON.stringify({ assessmentId, answers }),
      }),
    getSubmission: (id: string) => request<Submission>(token, `/api/submissions/${id}`),
    listSubmissions: (assessmentId?: string) =>
      request<Submission[]>(
        token,
        `/api/submissions${assessmentId ? `?assessmentId=${assessmentId}` : ""}`,
      ),

    // Study
    generateSummary: (documentId: string) =>
      request<StudyArtifact & { content: SummaryContent }>(token, "/api/study/summary", {
        method: "POST",
        body: JSON.stringify({ documentId }),
      }),
    generateFlashcards: (documentId: string, count?: number) =>
      request<StudyArtifact & { content: FlashcardsContent }>(token, "/api/study/flashcards", {
        method: "POST",
        body: JSON.stringify({ documentId, ...(count ? { count } : {}) }),
      }),
    listStudyArtifacts: (documentId?: string) =>
      request<StudyArtifact[]>(
        token,
        `/api/study${documentId ? `?documentId=${documentId}` : ""}`,
      ),

    // Analytics
    teacherAnalytics: () => request<TeacherAnalytics>(token, "/api/analytics/teacher"),
    studentAnalytics: () => request<StudentAnalytics>(token, "/api/analytics/student"),

    // Roadmaps
    createRoadmap: (body: CreateRoadmapBody) =>
      request<{ roadmapId: string; status: string }>(token, "/api/roadmaps", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    listRoadmaps: (q?: string) => request<RoadmapRecord[]>(token, `/api/roadmaps${q ? `?q=${encodeURIComponent(q)}` : ""}`),
    getRoadmap: (id: string) => request<RoadmapRecord>(token, `/api/roadmaps/${id}`),
    deleteRoadmap: (id: string) =>
      request<void>(token, `/api/roadmaps/${id}`, { method: "DELETE" }),
    enrollRoadmap: (id: string) =>
      request<{ enrollmentId: string; status: string; message?: string }>(token, `/api/roadmaps/${id}/enroll`, {
        method: "POST",
      }),
    approveRoadmapEnrollment: (roadmapId: string, enrollmentId: string) =>
      request<RoadmapEnrollment>(token, `/api/roadmaps/${roadmapId}/enrollments/${enrollmentId}/approve`, {
        method: "PATCH",
      }),
    rejectRoadmapEnrollment: (roadmapId: string, enrollmentId: string) =>
      request<RoadmapEnrollment>(token, `/api/roadmaps/${roadmapId}/enrollments/${enrollmentId}/reject`, {
        method: "PATCH",
      }),
    updateRoadmapProgress: (id: string, progress: StudentRoadmapProgress) =>
      request<RoadmapEnrollment>(token, `/api/roadmaps/${id}/enroll/progress`, {
        method: "PATCH",
        body: JSON.stringify(progress),
      }),
    listRoadmapEnrollments: (id: string) =>
      request<(RoadmapEnrollment & { student: { id: string; name: string | null; email: string } })[]>(
        token,
        `/api/roadmaps/${id}/enrollments`,
      ),
  }
}

export type Api = ReturnType<typeof createApi>

// ─── SSE streaming for the tutor ────────────────────────────────────────────

export interface StreamHandlers {
  onSources?: (sources: ChatSource[]) => void
  onToken?: (token: string) => void
  onDone?: () => void
  onError?: (message: string) => void
}

/**
 * POST a message to a tutor session and consume the text/event-stream response.
 * EventSource can't attach Authorization headers, so we parse the SSE wire format
 * manually from a fetch ReadableStream. Returns an abort function.
 */
export function streamTutorMessage(
  token: string | undefined,
  sessionId: string,
  content: string,
  handlers: StreamHandlers,
): () => void {
  const controller = new AbortController()

  ;(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/tutor/sessions/${sessionId}/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ content }),
        signal: controller.signal,
      })

      if (!res.ok || !res.body) {
        handlers.onError?.(`Stream failed (${res.status})`)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      // Parse SSE: events are separated by a blank line. Each event has an
      // `event:` line and one (or more) `data:` lines.
      const dispatch = (rawEvent: string) => {
        let eventName = "message"
        const dataLines: string[] = []
        for (const line of rawEvent.split("\n")) {
          if (line.startsWith("event:")) eventName = line.slice(6).trim()
          else if (line.startsWith("data:")) dataLines.push(line.slice(5).replace(/^ /, ""))
        }
        const dataStr = dataLines.join("\n")

        switch (eventName) {
          case "sources": {
            try {
              handlers.onSources?.(JSON.parse(dataStr) as ChatSource[])
            } catch {
              /* ignore */
            }
            break
          }
          case "token": {
            try {
              // token data is a JSON-encoded string
              handlers.onToken?.(JSON.parse(dataStr) as string)
            } catch {
              handlers.onToken?.(dataStr)
            }
            break
          }
          case "done":
            handlers.onDone?.()
            break
          case "error": {
            let msg = "An error occurred while answering."
            try {
              const parsed = JSON.parse(dataStr) as { message?: string }
              if (parsed.message) msg = parsed.message
            } catch {
              /* ignore */
            }
            handlers.onError?.(msg)
            break
          }
        }
      }

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        let idx: number
        // Events delimited by a blank line (\n\n).
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const rawEvent = buffer.slice(0, idx)
          buffer = buffer.slice(idx + 2)
          if (rawEvent.trim()) dispatch(rawEvent)
        }
      }
      if (buffer.trim()) dispatch(buffer)
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        handlers.onError?.((err as Error).message || "Stream error")
      }
    }
  })()

  return () => controller.abort()
}

// ─── SSE streaming for the milestone tutor ───────────────────────────────────

export interface MilestoneStreamHandlers {
  onToken?: (token: string) => void
  onDone?: () => void
  onError?: (message: string) => void
}

/**
 * POST a question to the milestone tutor and consume the SSE response.
 * Returns an abort function.
 */
export function streamMilestoneChat(
  token: string | undefined,
  roadmapId: string,
  milestoneId: string,
  question: string,
  handlers: MilestoneStreamHandlers,
): () => void {
  const controller = new AbortController()

  ;(async () => {
    try {
      const res = await fetch(
        `${BASE_URL}/api/roadmaps/${roadmapId}/milestones/${milestoneId}/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ question }),
          signal: controller.signal,
        },
      )

      if (!res.ok || !res.body) {
        handlers.onError?.(`Stream failed (${res.status})`)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      const dispatch = (rawEvent: string) => {
        let eventName = "message"
        const dataLines: string[] = []
        for (const line of rawEvent.split("\n")) {
          if (line.startsWith("event:")) eventName = line.slice(6).trim()
          else if (line.startsWith("data:")) dataLines.push(line.slice(5).replace(/^ /, ""))
        }
        const dataStr = dataLines.join("\n")

        switch (eventName) {
          case "token": {
            try {
              handlers.onToken?.(JSON.parse(dataStr) as string)
            } catch {
              handlers.onToken?.(dataStr)
            }
            break
          }
          case "done":
            handlers.onDone?.()
            break
          case "error": {
            let msg = "An error occurred while answering."
            try {
              const parsed = JSON.parse(dataStr) as { message?: string }
              if (parsed.message) msg = parsed.message
            } catch {
              /* ignore */
            }
            handlers.onError?.(msg)
            break
          }
        }
      }

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        let idx: number
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const rawEvent = buffer.slice(0, idx)
          buffer = buffer.slice(idx + 2)
          if (rawEvent.trim()) dispatch(rawEvent)
        }
      }
      if (buffer.trim()) dispatch(buffer)
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        handlers.onError?.((err as Error).message || "Stream error")
      }
    }
  })()

  return () => controller.abort()
}
