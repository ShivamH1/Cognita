import { Router } from "express"
import { z } from "zod"
import { prisma } from "../lib/db"
import { redis } from "../lib/redis"
import { generationQueue } from "../queues/generation.queue"
import { requireAuth } from "../middleware/auth"
import type { AssessmentSection } from "../types/index"

const router = Router()

function stripAnswers(assessment: Record<string, unknown>): Record<string, unknown> {
  const sections = (assessment.sections as AssessmentSection[] | undefined)?.map((section) => ({
    ...section,
    questions: section.questions?.map((q) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { answer, ...rest } = q
      return rest
    }),
  }))
  return { ...assessment, sections }
}

// GET /assessments — list assessments (teacher: own, student: all complete with enrollment status)
router.get("/", requireAuth, async (req, res): Promise<void> => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : ""

    if (req.user!.role === "TEACHER") {
      const searchFilter = q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { subject: { contains: q, mode: "insensitive" as const } },
              { topic: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : undefined

      const assignments = await prisma.assignment.findMany({
        where: { ownerId: req.user!.id, ...searchFilter },
        orderBy: { createdAt: "desc" },
        include: { assessment: { select: { id: true, status: true } } },
      })
      res.json(assignments)
    } else {
      const searchFilter = q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { subject: { contains: q, mode: "insensitive" as const } },
              { topic: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : undefined

      const assessments = await prisma.assessment.findMany({
        where: { status: "COMPLETE", ...searchFilter },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          assignmentId: true,
          title: true,
          subject: true,
          topic: true,
          gradeLevel: true,
          dueDate: true,
          totalMarks: true,
          duration: true,
          status: true,
          generatedAt: true,
          createdAt: true,
          assignment: { select: { ownerId: true } },
        },
      })

      const enrollments = await prisma.assessmentEnrollment.findMany({
        where: { studentId: req.user!.id },
      })
      const enrollmentMap = new Map(enrollments.map((e) => [e.assessmentId, e]))

      const result = assessments.map((a) => {
        const e = enrollmentMap.get(a.id)
        return {
          ...a,
          ownerId: a.assignment.ownerId,
          assignment: undefined,
          enrollment: e
            ? { id: e.id, status: e.status, createdAt: e.createdAt }
            : null,
        }
      })

      res.json(result)
    }
  } catch {
    res.status(500).json({ error: "Internal server error" })
  }
})

// GET /assessments/:id — owner+includeAnswers gets the teacher key; everyone else gets answers stripped.
router.get("/:id", requireAuth, async (req, res): Promise<void> => {
  const requestedAnswers = req.query.includeAnswers === "true"
  const cacheKeyBase = `assessment:${req.params.id}`

  try {
    const assessment = await prisma.assessment.findUnique({
      where: { id: req.params.id },
      include: { assignment: { select: { ownerId: true } } },
    })
    if (!assessment) {
      res.status(404).json({ error: "Not found" })
      return
    }

    const isOwner = assessment.assignment.ownerId === req.user!.id
    const includeAnswers = requestedAnswers && isOwner
    const cacheKey = `${cacheKeyBase}${includeAnswers ? ":answers" : ""}`

    // Attach enrollment for non-owner students FIRST (affects cache behavior)
    let enrollment: { id: string; status: string; createdAt: Date } | null = null
    if (!isOwner) {
      const found = await prisma.assessmentEnrollment.findUnique({
        where: { assessmentId_studentId: { assessmentId: assessment.id, studentId: req.user!.id } },
      })
      enrollment = found ? { id: found.id, status: found.status, createdAt: found.createdAt } : null
    }

    // Only serve cached data to owners or approved students
    const canUseCache = isOwner || enrollment?.status === "APPROVED"
    if (canUseCache) {
      const cached = await redis.get(cacheKey).catch(() => null)
      if (cached) {
        const parsed = JSON.parse(cached)
        // Attach enrollment for non-owners even from cache
        if (!isOwner) {
          res.json({ ...parsed, enrollment: enrollment ?? null })
        } else {
          res.json(parsed)
        }
        return
      }
    }

    const { assignment: _omit, ...rest } = assessment
    let payload = includeAnswers ? rest : stripAnswers(rest as Record<string, unknown>)

    // Non-approved students get metadata only — no sections/questions content
    if (!isOwner) {
      if (!enrollment || enrollment.status !== "APPROVED") {
        const { sections: _sections, generalInstructions: _instr, ...meta } = payload as Record<string, unknown>
        payload = { ...meta, enrollment: enrollment ?? null }
        res.json(payload)
        return
      }

      payload = { ...payload, enrollment }
    }

    if (assessment.status === "COMPLETE" && canUseCache) {
      await redis.set(cacheKey, JSON.stringify(payload), "EX", 3600).catch(() => undefined)
    }
    res.json(payload)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Internal server error" })
  }
})

// POST /assessments/:id/regenerate — owner re-queues generation.
router.post("/:id/regenerate", requireAuth, async (req, res): Promise<void> => {
  try {
    const assessment = await prisma.assessment.findUnique({
      where: { id: req.params.id },
      include: { assignment: true },
    })
    if (!assessment || assessment.assignment.ownerId !== req.user!.id) {
      res.status(404).json({ error: "Not found" })
      return
    }

    await redis.del(`assessment:${req.params.id}`).catch(() => undefined)
    await redis.del(`assessment:${req.params.id}:answers`).catch(() => undefined)

    await prisma.assessment.update({ where: { id: req.params.id }, data: { status: "GENERATING" } })
    await prisma.assignment.update({ where: { id: assessment.assignmentId }, data: { status: "GENERATING" } })

    const a = assessment.assignment
    await generationQueue.add("generate", {
      assignmentId: a.id,
      input: {
        title: a.title,
        subject: a.subject,
        topic: a.topic,
        gradeLevel: a.gradeLevel,
        dueDate: a.dueDate,
        totalMarks: a.totalMarks,
        additionalInstructions: a.additionalInstructions,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sections: a.sections as any,
        documentId: a.documentId ?? undefined,
      },
    })

    res.json({ message: "Regeneration queued", assessmentId: req.params.id, assignmentId: a.id })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Internal server error" })
  }
})

// POST /assessments/:id/enroll — request enrollment (student only, creates PENDING)
router.post("/:id/enroll", requireAuth, async (req, res): Promise<void> => {
  try {
    if (req.user!.role !== "STUDENT") {
      res.status(403).json({ error: "Only students can enroll in assessments" })
      return
    }

    const assessment = await prisma.assessment.findUnique({ where: { id: req.params.id } })
    if (!assessment || assessment.status !== "COMPLETE") {
      res.status(404).json({ error: "Assessment not found or not ready" })
      return
    }

    const existing = await prisma.assessmentEnrollment.findUnique({
      where: { assessmentId_studentId: { assessmentId: assessment.id, studentId: req.user!.id } },
    })
    if (existing) {
      res.json({ enrollmentId: existing.id, status: existing.status, message: `Already ${existing.status.toLowerCase()}` })
      return
    }

    const enrollment = await prisma.assessmentEnrollment.create({
      data: {
        assessmentId: assessment.id,
        studentId: req.user!.id,
        status: "PENDING",
      },
    })

    res.status(201).json({ enrollmentId: enrollment.id, status: "PENDING" })
  } catch {
    res.status(500).json({ error: "Internal server error" })
  }
})

// PATCH /assessments/:id/enrollments/:eid/approve — teacher approves enrollment
router.patch("/:id/enrollments/:eid/approve", requireAuth, async (req, res): Promise<void> => {
  try {
    if (req.user!.role !== "TEACHER") {
      res.status(403).json({ error: "Only teachers can approve enrollments" })
      return
    }

    const assessment = await prisma.assessment.findUnique({
      where: { id: req.params.id },
      include: { assignment: { select: { ownerId: true } } },
    })
    if (!assessment || assessment.assignment.ownerId !== req.user!.id) {
      res.status(404).json({ error: "Assessment not found" })
      return
    }

    const enrollment = await prisma.assessmentEnrollment.findUnique({ where: { id: req.params.eid } })
    if (!enrollment || enrollment.assessmentId !== assessment.id) {
      res.status(404).json({ error: "Enrollment not found" })
      return
    }

    if (enrollment.status !== "PENDING") {
      res.status(400).json({ error: `Enrollment is already ${enrollment.status.toLowerCase()}` })
      return
    }

    const updated = await prisma.assessmentEnrollment.update({
      where: { id: enrollment.id },
      data: { status: "APPROVED" },
    })

    // Invalidate cache so student gets full content on next request
    await redis.del(`assessment:${req.params.id}`).catch(() => undefined)
    await redis.del(`assessment:${req.params.id}:answers`).catch(() => undefined)

    res.json(updated)
  } catch {
    res.status(500).json({ error: "Internal server error" })
  }
})

// PATCH /assessments/:id/enrollments/:eid/reject — teacher rejects enrollment
router.patch("/:id/enrollments/:eid/reject", requireAuth, async (req, res): Promise<void> => {
  try {
    if (req.user!.role !== "TEACHER") {
      res.status(403).json({ error: "Only teachers can reject enrollments" })
      return
    }

    const assessment = await prisma.assessment.findUnique({
      where: { id: req.params.id },
      include: { assignment: { select: { ownerId: true } } },
    })
    if (!assessment || assessment.assignment.ownerId !== req.user!.id) {
      res.status(404).json({ error: "Assessment not found" })
      return
    }

    const enrollment = await prisma.assessmentEnrollment.findUnique({ where: { id: req.params.eid } })
    if (!enrollment || enrollment.assessmentId !== assessment.id) {
      res.status(404).json({ error: "Enrollment not found" })
      return
    }

    if (enrollment.status !== "PENDING") {
      res.status(400).json({ error: `Enrollment is already ${enrollment.status.toLowerCase()}` })
      return
    }

    const updated = await prisma.assessmentEnrollment.update({
      where: { id: enrollment.id },
      data: { status: "REJECTED" },
    })

    res.json(updated)
  } catch {
    res.status(500).json({ error: "Internal server error" })
  }
})

// GET /assessments/:id/enrollments — list all enrollments (owner only)
router.get("/:id/enrollments", requireAuth, async (req, res): Promise<void> => {
  try {
    const assessment = await prisma.assessment.findUnique({
      where: { id: req.params.id },
      include: { assignment: { select: { ownerId: true } } },
    })
    if (!assessment || assessment.assignment.ownerId !== req.user!.id) {
      res.status(404).json({ error: "Not found" })
      return
    }

    const enrollments = await prisma.assessmentEnrollment.findMany({
      where: { assessmentId: assessment.id },
      include: { student: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    })

    res.json(enrollments)
  } catch {
    res.status(500).json({ error: "Internal server error" })
  }
})

export { router as assessmentsRouter }
