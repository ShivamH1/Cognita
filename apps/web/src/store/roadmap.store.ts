import { create } from "zustand"
import type { WSMessage } from "@/types"
import { createApi } from "@/lib/api"

// ─── Generation store (mirrors generation.store.ts for roadmap progress) ──────

interface RoadmapGenerationState {
  status: "idle" | "connecting" | "generating" | "complete" | "failed"
  progress: number
  message: string
  roadmapId: string | null
  events: WSMessage[]
  ws: WebSocket | null

  connect: (roadmapId: string) => void
  disconnect: () => void
  reset: () => void
}

export const useRoadmapGenerationStore = create<RoadmapGenerationState>((set, get) => ({
  status: "idle",
  progress: 0,
  message: "",
  roadmapId: null,
  events: [],
  ws: null,

  connect: (roadmapId: string) => {
    const { ws: existing } = get()
    existing?.close()

    set({ status: "connecting", progress: 0, message: "Connecting..." })

    const baseWsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000"
    const wsUrl = `${baseWsUrl}/ws?roadmapId=${roadmapId}`
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      set({ status: "generating", message: "Connected. Waiting for generation..." })
    }

    ws.onmessage = (event) => {
      const msg: WSMessage = JSON.parse(event.data)
      set(state => ({ events: [...state.events, msg] }))

      switch (msg.type) {
        case "roadmap_queued":
          set({ progress: msg.progress ?? 0, message: msg.message ?? "" })
          break
        case "roadmap_started":
          set({ status: "generating", progress: msg.progress ?? 10, message: msg.message ?? "" })
          break
        case "roadmap_phase_complete":
          set({ progress: msg.progress ?? 80, message: msg.message ?? "" })
          break
        case "roadmap_complete":
          set({
            status: "complete",
            progress: 100,
            message: msg.message ?? "Done!",
            roadmapId,
          })
          ws.close()
          break
        case "roadmap_failed":
          set({ status: "failed", message: msg.message ?? "Generation failed" })
          ws.close()
          break
      }
    }

    ws.onerror = () => set({ status: "failed", message: "WebSocket connection error" })
    ws.onclose = () => {
      const current = get().status
      if (current === "generating" || current === "connecting") {
        set({ status: "failed", message: "WebSocket connection closed abruptly" })
      }
    }

    set({ ws })
  },

  disconnect: () => {
    get().ws?.close()
    set({ ws: null })
  },

  reset: () => set({
    status: "idle", progress: 0, message: "", roadmapId: null, events: [], ws: null
  }),
}))

// ─── Progress store (student interaction state) ──────────────────────────────

interface RoadmapProgressState {
  completedTasks: string[]
  completedResources: string[]
  notes: { milestoneId: string; note: string }[]
  roadmapId: string | null
  initialized: boolean

  init: (roadmapId: string, enrollment: { completedTasks: string[]; completedResources: string[]; notes: { milestoneId: string; note: string }[] }) => void
  toggleTask: (taskId: string, token?: string) => void
  toggleResource: (resourceId: string, token?: string) => void
  setNote: (milestoneId: string, note: string, token?: string) => void
  reset: () => void
}

export const useRoadmapProgressStore = create<RoadmapProgressState>((set, get) => ({
  completedTasks: [],
  completedResources: [],
  notes: [],
  roadmapId: null,
  initialized: false,

  init: (roadmapId, enrollment) => {
    set({
      roadmapId,
      completedTasks: enrollment.completedTasks,
      completedResources: enrollment.completedResources,
      notes: enrollment.notes,
      initialized: true,
    })
  },

  toggleTask: (taskId, token) => {
    const state = get()
    const exists = state.completedTasks.includes(taskId)
    const next = exists
      ? state.completedTasks.filter((id) => id !== taskId)
      : [...state.completedTasks, taskId]
    set({ completedTasks: next })
    if (token && state.roadmapId) {
      const api = createApi(token)
      api.updateRoadmapProgress(state.roadmapId, {
        completedTasks: next,
        completedResources: state.completedResources,
        notes: state.notes,
      }).catch(console.error)
    }
  },

  toggleResource: (resourceId, token) => {
    const state = get()
    const exists = state.completedResources.includes(resourceId)
    const next = exists
      ? state.completedResources.filter((id) => id !== resourceId)
      : [...state.completedResources, resourceId]
    set({ completedResources: next })
    if (token && state.roadmapId) {
      const api = createApi(token)
      api.updateRoadmapProgress(state.roadmapId, {
        completedTasks: state.completedTasks,
        completedResources: next,
        notes: state.notes,
      }).catch(console.error)
    }
  },

  setNote: (milestoneId, note, token) => {
    const state = get()
    const existing = state.notes.find((n) => n.milestoneId === milestoneId)
    const next = existing
      ? state.notes.map((n) => (n.milestoneId === milestoneId ? { milestoneId, note } : n))
      : [...state.notes, { milestoneId, note }]
    set({ notes: next })
    if (token && state.roadmapId) {
      const api = createApi(token)
      api.updateRoadmapProgress(state.roadmapId, {
        completedTasks: state.completedTasks,
        completedResources: state.completedResources,
        notes: next,
      }).catch(console.error)
    }
  },

  reset: () => set({
    completedTasks: [], completedResources: [], notes: [], roadmapId: null, initialized: false,
  }),
}))
