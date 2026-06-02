import { create } from "zustand"
import type { WSMessage } from "@/types"

interface GenerationState {
  status: "idle" | "connecting" | "generating" | "complete" | "failed"
  progress: number
  message: string
  assessmentId: string | null
  events: WSMessage[]
  ws: WebSocket | null

  // Actions
  connect: (assignmentId: string) => void
  disconnect: () => void
  reset: () => void
}

export const useGenerationStore = create<GenerationState>((set, get) => ({
  status: "idle",
  progress: 0,
  message: "",
  assessmentId: null,
  events: [],
  ws: null,

  connect: (assignmentId: string) => {
    const { ws: existing } = get()
    existing?.close()

    set({ status: "connecting", progress: 0, message: "Connecting..." })

    const baseWsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000"
    const wsUrl = `${baseWsUrl}/ws?assignmentId=${assignmentId}`
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      set({ status: "generating", message: "Connected. Waiting for generation..." })
    }

    ws.onmessage = (event) => {
      const msg: WSMessage = JSON.parse(event.data)
      set(state => ({ events: [...state.events, msg] }))

      switch (msg.type) {
        case "job_queued":
          set({ progress: msg.progress ?? 0, message: msg.message ?? "" })
          break
        case "generation_started":
          set({ status: "generating", progress: msg.progress ?? 10, message: msg.message ?? "" })
          break
        case "section_complete":
          set({ progress: msg.progress ?? 80, message: msg.message ?? "" })
          break
        case "generation_complete":
          set({
            status: "complete",
            progress: 100,
            message: msg.message ?? "Done!",
            assessmentId: msg.assessmentId ?? null,
          })
          ws.close()
          break
        case "generation_failed":
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
    status: "idle", progress: 0, message: "", assessmentId: null, events: [], ws: null
  }),
}))
