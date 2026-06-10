import { Worker, Job } from "bullmq"
import { redis } from "../lib/redis"
import { prisma } from "../lib/db"
import { generateRoadmap } from "../chains/roadmap.chain"
import { wsService } from "../services/websocket.service"
import type { RoadmapJobData } from "../queues/roadmap.queue"
import type { Prisma } from "@prisma/client"

export const roadmapWorker = new Worker<RoadmapJobData>(
  "roadmap-generation",
  async (job: Job<RoadmapJobData>) => {
    const { roadmapId, input } = job.data

    await prisma.roadmap.update({ where: { id: roadmapId }, data: { status: "GENERATING" } })

    wsService.broadcast(roadmapId, {
      type: "roadmap_started",
      roadmapId,
      progress: 10,
      message: "AI is generating your learning roadmap...",
    })
    await job.updateProgress(10)

    try {
      const generated = await generateRoadmap(input, (message) => {
        wsService.broadcast(roadmapId, { type: "roadmap_started", roadmapId, progress: 50, message })
      })

      await job.updateProgress(80)

      for (let i = 0; i < generated.phases.length; i++) {
        wsService.broadcast(roadmapId, {
          type: "roadmap_phase_complete",
          roadmapId,
          phaseName: generated.phases[i].title,
          progress: 80 + Math.round(((i + 1) / generated.phases.length) * 15),
          message: `${generated.phases[i].title} complete`,
        })
      }

      await prisma.roadmap.update({
        where: { id: roadmapId },
        data: {
          phases: generated.phases as unknown as Prisma.InputJsonValue,
          status: "COMPLETE",
          generatedAt: new Date().toISOString(),
        },
      })

      await job.updateProgress(100)

      wsService.broadcast(roadmapId, {
        type: "roadmap_complete",
        roadmapId,
        progress: 100,
        message: "Learning roadmap generated successfully!",
      })
    } catch (err) {
      await prisma.roadmap.update({ where: { id: roadmapId }, data: { status: "FAILED" } }).catch(() => undefined)
      wsService.broadcast(roadmapId, {
        type: "roadmap_failed",
        roadmapId,
        message: (err as Error).message || "Roadmap generation failed. Please try again.",
      })
      throw err
    }
  },
  { connection: redis, concurrency: 2 },
)

roadmapWorker.on("failed", (job, err) => {
  console.error(`[roadmap] Job ${job?.id} failed:`, err.message)
})
