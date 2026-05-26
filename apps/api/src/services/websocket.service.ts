import { WebSocketServer, WebSocket } from "ws"
import type { Server } from "http"
import type { WSMessage } from "../types/index"
import { prisma } from "../lib/db"

class WebSocketService {
  private wss: WebSocketServer | null = null

  // Map: assignmentId → Set of connected WebSocket clients
  private rooms = new Map<string, Set<WebSocket>>()

  initialize(server: Server): void {
    this.wss = new WebSocketServer({ server, path: "/ws" })

    this.wss.on("connection", async (ws, req) => {
      const url = new URL(req.url!, `http://localhost`)
      const assignmentId = url.searchParams.get("assignmentId")
      const roadmapId = url.searchParams.get("roadmapId")

      const roomId = assignmentId || roadmapId
      if (!roomId) {
        ws.close(4000, "assignmentId or roadmapId query param required")
        return
      }

      // Add to room
      if (!this.rooms.has(roomId)) {
        this.rooms.set(roomId, new Set())
      }
      this.rooms.get(roomId)!.add(ws)

      console.log(`[WS] Client connected to room: ${roomId}`)

      // Query database for current state to prevent race conditions
      try {
        if (roadmapId) {
          const roadmap = await prisma.roadmap.findUnique({ where: { id: roadmapId } })
          if (roadmap) {
            if (roadmap.status === "COMPLETE") {
              ws.send(JSON.stringify({ type: "roadmap_complete", roadmapId, progress: 100, message: "Learning roadmap generated successfully!" }))
            } else if (roadmap.status === "FAILED") {
              ws.send(JSON.stringify({ type: "roadmap_failed", roadmapId, message: "Generation failed. Please try again." }))
            } else if (roadmap.status === "GENERATING") {
              ws.send(JSON.stringify({ type: "roadmap_started", roadmapId, progress: 50, message: "AI is generating your learning roadmap..." }))
            } else {
              ws.send(JSON.stringify({ type: "roadmap_queued", roadmapId, progress: 0, message: "Connected. Waiting for job to start..." }))
            }
          } else {
            ws.send(JSON.stringify({ type: "roadmap_queued", roadmapId, progress: 0, message: "Connected. Waiting for job to start..." }))
          }
        } else {
          const assignment = await prisma.assignment.findUnique({
            where: { id: assignmentId! },
            include: { assessment: { select: { id: true } } },
          })
          if (assignment) {
            if (assignment.status === "COMPLETE" && assignment.assessment) {
              ws.send(JSON.stringify({
                type: "generation_complete",
                assignmentId,
                assessmentId: assignment.assessment.id,
                progress: 100,
                message: "Question paper generated successfully!",
              }))
            } else if (assignment.status === "FAILED") {
              ws.send(JSON.stringify({
                type: "generation_failed",
                assignmentId,
                message: "Generation failed. Please try again.",
              }))
            } else if (assignment.status === "GENERATING") {
              ws.send(JSON.stringify({
                type: "generation_started",
                assignmentId,
                progress: 50,
                message: "AI is generating your question paper...",
              }))
            } else {
              ws.send(JSON.stringify({
                type: "job_queued",
                assignmentId,
                progress: 0,
                message: "Connected. Waiting for job to start...",
              }))
            }
          } else {
            ws.send(JSON.stringify({
              type: "job_queued",
              assignmentId,
              progress: 0,
              message: "Connected. Waiting for job to start...",
            }))
          }
        }
      } catch (err: any) {
        console.error(`[WS] Error checking status:`, err.message)
        ws.send(JSON.stringify({
          type: roadmapId ? "roadmap_queued" : "job_queued",
          ...(roadmapId ? { roadmapId } : { assignmentId }),
          progress: 0,
          message: "Connected. Waiting for job to start...",
        }))
      }

      ws.on("close", () => {
        this.rooms.get(roomId)?.delete(ws)
        if (this.rooms.get(roomId)?.size === 0) {
          this.rooms.delete(roomId)
        }
      })

      ws.on("error", (err) => {
        console.error(`[WS] Error for room ${roomId}:`, err.message)
      })
    })
  }

  broadcast(roomId: string, message: WSMessage): void {
    const room = this.rooms.get(roomId)
    if (!room) return

    const payload = JSON.stringify(message)
    for (const client of room) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload)
      }
    }
  }
}

export const wsService = new WebSocketService()
