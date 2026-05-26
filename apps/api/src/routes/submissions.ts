import { Router, type Request, type Response } from "express"
import { z } from "zod"
import type { Prisma } from "@prisma/client"
import { prisma } from "../lib/db"
import { gradingQueue } from "../queues/grading.queue"
import { requireAuth } from "../middleware/auth"

const router = Router()

const SubmitSchema = z.object({
  assessmentId: z.string(),
  answers: z.record(z.string(), z.string()),
})

// POST /submissions — student submits answers → queue grading
router.post("/", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { assessmentId, answers } = SubmitSchema.parse(req.body)

    const assessment = await prisma.assessment.findUnique({ where: { id: assessmentId } })
    if (!assessment || assessment.status !== "COMPLETE") {
      res.status(404).json({ error: "Assessment not available" })
      return
    }

    // Check enrollment — students must be APPROVED to submit
    if (req.user!.role === "STUDENT") {
      const enrollment = await prisma.assessmentEnrollment.findUnique({
        where: { assessmentId_studentId: { assessmentId, studentId: req.user!.id } },
      })
      if (!enrollment || enrollment.status !== "APPROVED") {
        res.status(403).json({ error: "Access denied — enrollment not approved" })
        return
      }
    }

    const submission = await prisma.submission.create({
      data: {
        assessmentId,
        studentId: req.user!.id,
        answers: answers as unknown as Prisma.InputJsonValue,
        status: "submitted",
      },
    })

    await gradingQueue.add("grade", { submissionId: submission.id })

    res.status(201).json({ submissionId: submission.id, status: "submitted" })
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors })
      return
    }
    console.error(err)
    res.status(500).json({ error: "Internal server error" })
  }
})

// GET /submissions/:id — submission + grades (student owner or teacher who owns the assessment)
router.get("/:id", requireAuth, async (req, res): Promise<void> => {
  const submission = await prisma.submission.findUnique({
    where: { id: req.params.id },
    include: { grades: true, assessment: { include: { assignment: { select: { ownerId: true } } } } },
  })
  if (!submission) {
    res.status(404).json({ error: "Not found" })
    return
  }
  const isStudent = submission.studentId === req.user!.id
  const isTeacher = submission.assessment.assignment.ownerId === req.user!.id
  if (!isStudent && !isTeacher) {
    res.status(403).json({ error: "Forbidden" })
    return
  }
  res.json(submission)
})

// GET /submissions?assessmentId= — teacher: all for their assessment; otherwise the user's own
router.get("/", requireAuth, async (req, res): Promise<void> => {
  const assessmentId = typeof req.query.assessmentId === "string" ? req.query.assessmentId : undefined

  if (assessmentId && req.user!.role === "TEACHER") {
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { assignment: { select: { ownerId: true } } },
    })
    if (assessment?.assignment.ownerId === req.user!.id) {
      const subs = await prisma.submission.findMany({
        where: { assessmentId },
        include: { student: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      })
      res.json(subs)
      return
    }
  }

  const subs = await prisma.submission.findMany({
    where: { studentId: req.user!.id, ...(assessmentId ? { assessmentId } : {}) },
    orderBy: { createdAt: "desc" },
  })
  res.json(subs)
})

export { router as submissionsRouter }
