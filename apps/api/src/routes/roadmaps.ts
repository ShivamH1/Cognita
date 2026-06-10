import { Router, type Request, type Response } from "express"
import { z } from "zod"
import type { Prisma } from "@prisma/client"
import { prisma } from "../lib/db"
import { roadmapQueue } from "../queues/roadmap.queue"
import { requireAuth } from "../middleware/auth"
import { streamMilestoneAnswer, type ChatTurn } from "../chains/milestone-tutor.chain"
import type { RoadmapInput } from "../types/index"

const router = Router()

const CreateRoadmapSchema = z.object({
  title: z.string().min(1, "Title is required"),
  topic: z.string().min(1, "Topic is required"),
  targetAudience: z.string().optional(),
  durationWeeks: z.number().int().min(1).max(52).optional(),
  providedUrls: z.array(z.string().url()).optional(),
  documentIds: z.array(z.string()).optional(),
})

// POST /roadmaps — create roadmap + queue generation
router.post("/", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== "TEACHER") {
      res.status(403).json({ error: "Only teachers can create roadmaps" })
      return
    }

    const validated = CreateRoadmapSchema.parse(req.body)

    const roadmap = await prisma.roadmap.create({
      data: {
        ownerId: req.user!.id,
        title: validated.title,
        topic: validated.topic,
        targetAudience: validated.targetAudience,
        durationWeeks: validated.durationWeeks,
        phases: [] as unknown as Prisma.InputJsonValue,
        status: "PENDING",
      },
    })

    const input: RoadmapInput = {
      title: validated.title,
      topic: validated.topic,
      targetAudience: validated.targetAudience,
      durationWeeks: validated.durationWeeks,
      providedUrls: validated.providedUrls,
      documentIds: validated.documentIds,
    }

    const job = await roadmapQueue.add("generate", { roadmapId: roadmap.id, input })

    await prisma.roadmap.update({ where: { id: roadmap.id }, data: { jobId: job.id } })

    res.status(201).json({ roadmapId: roadmap.id, status: "pending" })
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors })
      return
    }
    console.error(err)
    res.status(500).json({ error: "Internal server error" })
  }
})

// GET /roadmaps — list roadmaps (teacher: own, student: enrolled)
router.get("/", requireAuth, async (req, res): Promise<void> => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : ""
    const searchFilter = q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { topic: { contains: q, mode: "insensitive" as const } },
            { targetAudience: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : undefined

    if (req.user!.role === "TEACHER") {
      const roadmaps = await prisma.roadmap.findMany({
        where: { ownerId: req.user!.id, ...searchFilter },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          topic: true,
          targetAudience: true,
          durationWeeks: true,
          status: true,
          generatedAt: true,
          createdAt: true,
          _count: { select: { enrollments: true } },
        },
      })
      res.json(roadmaps)
    } else {
      const roadmaps = await prisma.roadmap.findMany({
        where: { status: "COMPLETE", ...searchFilter },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          topic: true,
          targetAudience: true,
          durationWeeks: true,
          status: true,
          generatedAt: true,
          createdAt: true,
        },
      })

      const enrollments = await prisma.roadmapEnrollment.findMany({
        where: { studentId: req.user!.id },
      })
      const enrollmentMap = new Map(enrollments.map((e) => [e.roadmapId, e]))

      const result = roadmaps.map((r) => {
        const e = enrollmentMap.get(r.id)
        return {
          ...r,
          enrollment: e
            ? { id: e.id, status: e.status, completedTasks: e.completedTasks, completedResources: e.completedResources, notes: e.notes, createdAt: e.createdAt }
            : null,
        }
      })

      res.json(result)
    }
  } catch {
    res.status(500).json({ error: "Internal server error" })
  }
})

// GET /roadmaps/:id — full roadmap + enrollment progress
router.get("/:id", requireAuth, async (req, res): Promise<void> => {
  try {
    const roadmap = await prisma.roadmap.findUnique({ where: { id: req.params.id } })
    if (!roadmap) {
      res.status(404).json({ error: "Roadmap not found" })
      return
    }

    const isOwner = roadmap.ownerId === req.user!.id
    if (isOwner) {
      res.json(roadmap)
      return
    }

    const enrollment = await prisma.roadmapEnrollment.findUnique({
      where: { roadmapId_studentId: { roadmapId: roadmap.id, studentId: req.user!.id } },
    })

    // Non-approved students get metadata only — no phases content
    if (!enrollment || enrollment.status !== "APPROVED") {
      const { phases: _phases, ...meta } = roadmap
      res.json({ ...meta, enrollment: enrollment ?? null })
      return
    }

    res.json({ ...roadmap, enrollment })
  } catch {
    res.status(500).json({ error: "Internal server error" })
  }
})

// DELETE /roadmaps/:id — cascade delete (owner only)
router.delete("/:id", requireAuth, async (req, res): Promise<void> => {
  try {
    const roadmap = await prisma.roadmap.findUnique({ where: { id: req.params.id } })
    if (!roadmap || roadmap.ownerId !== req.user!.id) {
      res.status(404).json({ error: "Not found" })
      return
    }
    await prisma.roadmap.delete({ where: { id: req.params.id } })
    res.status(204).end()
  } catch {
    res.status(500).json({ error: "Internal server error" })
  }
})

// POST /roadmaps/:id/enroll — request enrollment (student only, creates PENDING)
router.post("/:id/enroll", requireAuth, async (req, res): Promise<void> => {
  try {
    if (req.user!.role !== "STUDENT") {
      res.status(403).json({ error: "Only students can enroll in roadmaps" })
      return
    }

    const roadmap = await prisma.roadmap.findUnique({ where: { id: req.params.id } })
    if (!roadmap || roadmap.status !== "COMPLETE") {
      res.status(404).json({ error: "Roadmap not found or not ready" })
      return
    }

    const existing = await prisma.roadmapEnrollment.findUnique({
      where: { roadmapId_studentId: { roadmapId: roadmap.id, studentId: req.user!.id } },
    })
    if (existing) {
      res.json({ enrollmentId: existing.id, status: existing.status, message: `Already ${existing.status.toLowerCase()}` })
      return
    }

    const enrollment = await prisma.roadmapEnrollment.create({
      data: {
        roadmapId: roadmap.id,
        studentId: req.user!.id,
        status: "PENDING",
        completedTasks: [],
        completedResources: [],
        notes: [],
      },
    })

    res.status(201).json({ enrollmentId: enrollment.id, status: "PENDING" })
  } catch {
    res.status(500).json({ error: "Internal server error" })
  }
})

// PATCH /roadmaps/:id/enrollments/:eid/approve — teacher approves enrollment
router.patch("/:id/enrollments/:eid/approve", requireAuth, async (req, res): Promise<void> => {
  try {
    if (req.user!.role !== "TEACHER") {
      res.status(403).json({ error: "Only teachers can approve enrollments" })
      return
    }

    const roadmap = await prisma.roadmap.findUnique({ where: { id: req.params.id } })
    if (!roadmap || roadmap.ownerId !== req.user!.id) {
      res.status(404).json({ error: "Roadmap not found" })
      return
    }

    const enrollment = await prisma.roadmapEnrollment.findUnique({ where: { id: req.params.eid } })
    if (!enrollment || enrollment.roadmapId !== roadmap.id) {
      res.status(404).json({ error: "Enrollment not found" })
      return
    }

    if (enrollment.status !== "PENDING") {
      res.status(400).json({ error: `Enrollment is already ${enrollment.status.toLowerCase()}` })
      return
    }

    const updated = await prisma.roadmapEnrollment.update({
      where: { id: enrollment.id },
      data: { status: "APPROVED" },
    })

    res.json(updated)
  } catch {
    res.status(500).json({ error: "Internal server error" })
  }
})

// PATCH /roadmaps/:id/enrollments/:eid/reject — teacher rejects enrollment
router.patch("/:id/enrollments/:eid/reject", requireAuth, async (req, res): Promise<void> => {
  try {
    if (req.user!.role !== "TEACHER") {
      res.status(403).json({ error: "Only teachers can reject enrollments" })
      return
    }

    const roadmap = await prisma.roadmap.findUnique({ where: { id: req.params.id } })
    if (!roadmap || roadmap.ownerId !== req.user!.id) {
      res.status(404).json({ error: "Roadmap not found" })
      return
    }

    const enrollment = await prisma.roadmapEnrollment.findUnique({ where: { id: req.params.eid } })
    if (!enrollment || enrollment.roadmapId !== roadmap.id) {
      res.status(404).json({ error: "Enrollment not found" })
      return
    }

    if (enrollment.status !== "PENDING") {
      res.status(400).json({ error: `Enrollment is already ${enrollment.status.toLowerCase()}` })
      return
    }

    const updated = await prisma.roadmapEnrollment.update({
      where: { id: enrollment.id },
      data: { status: "REJECTED" },
    })

    res.json(updated)
  } catch {
    res.status(500).json({ error: "Internal server error" })
  }
})

// PATCH /roadmaps/:id/enroll/progress — update student progress (APPROVED only)
router.patch("/:id/enroll/progress", requireAuth, async (req, res): Promise<void> => {
  try {
    const progressSchema = z.object({
      completedTasks: z.array(z.string()),
      completedResources: z.array(z.string()),
      notes: z.array(z.object({ milestoneId: z.string(), note: z.string() })),
    })
    const validated = progressSchema.parse(req.body)

    const enrollment = await prisma.roadmapEnrollment.findUnique({
      where: { roadmapId_studentId: { roadmapId: req.params.id, studentId: req.user!.id } },
    })
    if (!enrollment) {
      res.status(404).json({ error: "Not enrolled in this roadmap" })
      return
    }
    if (enrollment.status !== "APPROVED") {
      res.status(403).json({ error: "Enrollment not yet approved" })
      return
    }

    const updated = await prisma.roadmapEnrollment.update({
      where: { id: enrollment.id },
      data: {
        completedTasks: validated.completedTasks,
        completedResources: validated.completedResources,
        notes: validated.notes as unknown as Prisma.InputJsonValue,
      },
    })

    res.json(updated)
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors })
      return
    }
    res.status(500).json({ error: "Internal server error" })
  }
})

// GET /roadmaps/:id/enrollments — list all enrolled students (owner only)
router.get("/:id/enrollments", requireAuth, async (req, res): Promise<void> => {
  try {
    const roadmap = await prisma.roadmap.findUnique({ where: { id: req.params.id } })
    if (!roadmap || roadmap.ownerId !== req.user!.id) {
      res.status(404).json({ error: "Not found" })
      return
    }

    const enrollments = await prisma.roadmapEnrollment.findMany({
      where: { roadmapId: roadmap.id },
      include: { student: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    })

    res.json(enrollments)
  } catch {
    res.status(500).json({ error: "Internal server error" })
  }
})

// POST /roadmaps/:id/milestones/:milestoneId/chat — SSE milestone tutor (APPROVED only)
router.post("/:id/milestones/:milestoneId/chat", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { question } = z.object({ question: z.string().min(1) }).parse(req.body)

    const roadmap = await prisma.roadmap.findUnique({ where: { id: req.params.id } })
    if (!roadmap) {
      res.status(404).json({ error: "Roadmap not found" })
      return
    }

    // Check access — owner or APPROVED enrollment
    const isOwner = roadmap.ownerId === req.user!.id
    if (!isOwner) {
      const enrollment = await prisma.roadmapEnrollment.findUnique({
        where: { roadmapId_studentId: { roadmapId: roadmap.id, studentId: req.user!.id } },
      })
      if (!enrollment || enrollment.status !== "APPROVED") {
        res.status(403).json({ error: "Access denied — enrollment not approved" })
        return
      }
    }

    // Find the milestone in the roadmap phases
    const phases = roadmap.phases as any[]
    let milestoneContext: { roadmapTitle: string; phase: string; milestone: string; description: string } | null = null

    for (const phase of phases) {
      for (const milestone of phase.milestones ?? []) {
        if (milestone.id === req.params.milestoneId) {
          milestoneContext = {
            roadmapTitle: roadmap.title,
            phase: phase.title,
            milestone: milestone.title,
            description: milestone.description,
          }
          break
        }
      }
      if (milestoneContext) break
    }

    if (!milestoneContext) {
      res.status(404).json({ error: "Milestone not found" })
      return
    }

    // SSE setup
    res.setHeader("Content-Type", "text/event-stream")
    res.setHeader("Cache-Control", "no-cache")
    res.setHeader("Connection", "keep-alive")
    res.flushHeaders?.()

    const send = (event: string, data: unknown) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)

    const history: ChatTurn[] = []

    for await (const token of streamMilestoneAnswer(milestoneContext, history, question)) {
      send("token", token)
    }

    send("done", { ok: true })
    res.end()
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors })
      return
    }
    console.error("[roadmap-chat]", err)
    res.status(500).json({ error: "Internal server error" })
  }
})

export { router as roadmapsRouter }
