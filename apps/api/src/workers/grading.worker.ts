import { Worker, Job } from "bullmq"
import { redis } from "../lib/redis"
import { prisma } from "../lib/db"
import { gradeSubmission } from "../chains/grading.chain"
import type { GradingJobData } from "../queues/grading.queue"
import type { GeneratedAssessment } from "../types/index"

export const gradingWorker = new Worker<GradingJobData>(
  "submission-grading",
  async (job: Job<GradingJobData>) => {
    const { submissionId } = job.data

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: { assessment: true },
    })
    if (!submission) throw new Error(`Submission ${submissionId} not found`)

    await prisma.submission.update({ where: { id: submissionId }, data: { status: "grading" } })

    try {
      const assessment = {
        ...submission.assessment,
        sections: submission.assessment.sections,
      } as unknown as GeneratedAssessment
      const answers = submission.answers as Record<string, string>

      const result = await gradeSubmission(assessment, answers)

      await prisma.$transaction([
        prisma.grade.deleteMany({ where: { submissionId } }),
        prisma.grade.createMany({
          data: result.grades.map((g) => ({
            submissionId,
            questionId: g.questionId,
            score: g.score,
            maxScore: g.maxScore,
            correct: g.correct ?? null,
            feedback: g.feedback ?? null,
          })),
        }),
        prisma.submission.update({
          where: { id: submissionId },
          data: { status: "graded", totalScore: result.totalScore, maxScore: result.maxScore },
        }),
      ])

      console.log(`[grading] Submission ${submissionId} graded: ${result.totalScore}/${result.maxScore}`)
    } catch (err) {
      await prisma.submission
        .update({ where: { id: submissionId }, data: { status: "failed" } })
        .catch(() => undefined)
      throw err
    }
  },
  { connection: redis, concurrency: 3 },
)

gradingWorker.on("failed", (job, err) => {
  console.error(`[grading] Job ${job?.id} failed:`, err.message)
})
