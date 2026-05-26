import { Router } from "express"
import { prisma } from "../lib/db"
import { requireAuth } from "../middleware/auth"

const router = Router()

// GET /analytics/teacher — overview of the teacher's assessments + student performance
router.get("/teacher", requireAuth, async (req, res): Promise<void> => {
  const ownerId = req.user!.id

  const [assignmentCount, assessments] = await Promise.all([
    prisma.assignment.count({ where: { ownerId } }),
    prisma.assessment.findMany({
      where: { assignment: { ownerId } },
      select: {
        id: true,
        title: true,
        subject: true,
        status: true,
        createdAt: true,
        _count: { select: { submissions: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ])

  const submissions = await prisma.submission.findMany({
    where: { assessment: { assignment: { ownerId } }, status: "graded" },
    select: { totalScore: true, maxScore: true, assessmentId: true },
  })

  const pcts = submissions
    .filter((s) => s.maxScore && s.maxScore > 0)
    .map((s) => (s.totalScore! / s.maxScore!) * 100)
  const avgScore = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null

  res.json({
    assignmentCount,
    assessmentCount: assessments.length,
    submissionCount: submissions.length,
    averageScorePct: avgScore,
    assessments,
  })
})

// GET /analytics/student — the student's learning + performance overview
router.get("/student", requireAuth, async (req, res): Promise<void> => {
  const studentId = req.user!.id

  const [documentCount, submissions, chatSessionCount, artifactCount] = await Promise.all([
    prisma.document.count({ where: { ownerId: studentId } }),
    prisma.submission.findMany({
      where: { studentId },
      select: {
        id: true,
        totalScore: true,
        maxScore: true,
        status: true,
        createdAt: true,
        assessment: { select: { title: true, subject: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.chatSession.count({ where: { userId: studentId } }),
    prisma.studyArtifact.count({ where: { userId: studentId } }),
  ])

  const graded = submissions.filter((s) => s.status === "graded" && s.maxScore && s.maxScore > 0)
  const pcts = graded.map((s) => (s.totalScore! / s.maxScore!) * 100)
  const avgScore = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null

  res.json({
    documentCount,
    submissionCount: submissions.length,
    gradedCount: graded.length,
    averageScorePct: avgScore,
    chatSessionCount,
    artifactCount,
    recentSubmissions: submissions.slice(0, 10),
  })
})

export { router as analyticsRouter }
