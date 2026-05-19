import { Worker, Job } from "bullmq"
import { redis } from "../lib/redis"
import { prisma } from "../lib/db"
import { generateAssessment } from "../chains/assessment.chain"
import { wsService } from "../services/websocket.service"
import type { GenerationJobData } from "../queues/generation.queue"
import type { Prisma } from "@prisma/client"

export const generationWorker = new Worker<GenerationJobData>(
  "assessment-generation",
  async (job: Job<GenerationJobData>) => {
    const { assignmentId, input } = job.data

    await prisma.assignment.update({ where: { id: assignmentId }, data: { status: "GENERATING" } })

    // Use upsert — on retries the assessment may already exist
    const assessment = await prisma.assessment.upsert({
      where: { assignmentId },
      create: {
        assignmentId,
        title: input.title,
        subject: input.subject,
        topic: input.topic,
        gradeLevel: input.gradeLevel,
        dueDate: input.dueDate,
        totalMarks: input.totalMarks,
        sections: [] as unknown as Prisma.InputJsonValue,
        status: "GENERATING",
      },
      update: {
        status: "GENERATING",
        sections: [] as unknown as Prisma.InputJsonValue,
      },
    })

    wsService.broadcast(assignmentId, {
      type: "generation_started",
      assignmentId,
      assessmentId: assessment.id,
      progress: 10,
      message: "AI is generating your question paper...",
    })
    await job.updateProgress(10)

    try {
      const generated = await generateAssessment(input, (message) => {
        wsService.broadcast(assignmentId, { type: "generation_started", assignmentId, progress: 50, message })
      })

      await job.updateProgress(80)

      for (let i = 0; i < generated.sections.length; i++) {
        wsService.broadcast(assignmentId, {
          type: "section_complete",
          assignmentId,
          sectionName: generated.sections[i].name,
          progress: 80 + Math.round(((i + 1) / generated.sections.length) * 15),
          message: `${generated.sections[i].name} complete`,
        })
      }

      await prisma.assessment.update({
        where: { id: assessment.id },
        data: {
          title: generated.title,
          subject: generated.subject,
          topic: generated.topic,
          gradeLevel: generated.gradeLevel,
          dueDate: generated.dueDate,
          totalMarks: generated.totalMarks,
          duration: generated.duration,
          generalInstructions: generated.generalInstructions,
          sections: generated.sections as unknown as Prisma.InputJsonValue,
          status: "COMPLETE",
          generatedAt: generated.generatedAt,
        },
      })

      await prisma.assignment.update({ where: { id: assignmentId }, data: { status: "COMPLETE" } })
      await job.updateProgress(100)

      wsService.broadcast(assignmentId, {
        type: "generation_complete",
        assignmentId,
        assessmentId: assessment.id,
        progress: 100,
        message: "Question paper generated successfully!",
      })
    } catch (err) {
      await prisma.assessment.update({ where: { id: assessment.id }, data: { status: "FAILED" } }).catch(() => undefined)
      await prisma.assignment.update({ where: { id: assignmentId }, data: { status: "FAILED" } }).catch(() => undefined)
      wsService.broadcast(assignmentId, {
        type: "generation_failed",
        assignmentId,
        message: (err as Error).message || "Generation failed. Please try again.",
      })
      throw err
    }
  },
  { connection: redis, concurrency: 3 },
)

generationWorker.on("failed", (job, err) => {
  console.error(`[generation] Job ${job?.id} failed:`, err.message)
})
