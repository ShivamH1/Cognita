import { Router, type Request, type Response } from "express"
import { z } from "zod"
import type { Prisma } from "@prisma/client"
import { prisma } from "../lib/db"
import { generationQueue } from "../queues/generation.queue"
import { requireAuth } from "../middleware/auth"

const router = Router()

const SectionConfigSchema = z.object({
  name: z.string().min(1),
  questionType: z.enum(["mcq", "short_answer", "long_answer", "true_false", "fill_blank"]),
  questionCount: z.number().int().min(1).max(50),
  marksPerQuestion: z.number().min(1),
  instructions: z.string().default("Attempt all questions"),
  difficultyMix: z
    .object({
      easy: z.number().min(0).max(100),
      medium: z.number().min(0).max(100),
      hard: z.number().min(0).max(100),
    })
    .refine((mix) => mix.easy + mix.medium + mix.hard === 100, {
      message: "Difficulty percentages must sum to 100",
    }),
})

const CreateAssignmentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  subject: z.string().min(1, "Subject is required"),
  topic: z.string().min(1, "Topic is required"),
  gradeLevel: z.string().min(1, "Grade level is required"),
  dueDate: z.string().refine((d) => !isNaN(Date.parse(d)), "Invalid date"),
  sections: z.array(SectionConfigSchema).min(1, "At least one section required"),
  additionalInstructions: z.string().optional().default(""),
  documentId: z.string().optional(),
})

// POST /assignments — create assignment + queue generation
router.post("/", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const validated = CreateAssignmentSchema.parse(req.body)

    // If a RAG source is attached, it must be the user's and finished ingesting.
    if (validated.documentId) {
      const doc = await prisma.document.findUnique({ where: { id: validated.documentId } })
      if (!doc || doc.ownerId !== req.user!.id) {
        res.status(404).json({ error: "Document not found" })
        return
      }
      if (doc.status !== "READY") {
        res.status(409).json({ error: "Document is still processing. Try again shortly." })
        return
      }
    }

    const totalMarks = validated.sections.reduce((sum, s) => sum + s.questionCount * s.marksPerQuestion, 0)

    const assignment = await prisma.assignment.create({
      data: {
        ownerId: req.user!.id,
        createdByRole: req.user!.role,
        title: validated.title,
        subject: validated.subject,
        topic: validated.topic,
        gradeLevel: validated.gradeLevel,
        dueDate: validated.dueDate,
        totalMarks,
        additionalInstructions: validated.additionalInstructions,
        sections: validated.sections as unknown as Prisma.InputJsonValue,
        documentId: validated.documentId ?? null,
        status: "PENDING",
      },
    })

    const job = await generationQueue.add("generate", {
      assignmentId: assignment.id,
      input: {
        title: validated.title,
        subject: validated.subject,
        topic: validated.topic,
        gradeLevel: validated.gradeLevel,
        dueDate: validated.dueDate,
        totalMarks,
        sections: validated.sections,
        additionalInstructions: validated.additionalInstructions,
        documentId: validated.documentId,
      },
    })

    await prisma.assignment.update({ where: { id: assignment.id }, data: { jobId: job.id } })

    res.status(201).json({ assignmentId: assignment.id, jobId: job.id, status: "pending" })
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors })
      return
    }
    console.error(err)
    res.status(500).json({ error: "Internal server error" })
  }
})

// GET /assignments/:id — status + metadata (owner only)
router.get("/:id", requireAuth, async (req, res): Promise<void> => {
  try {
    const assignment = await prisma.assignment.findUnique({
      where: { id: req.params.id },
      include: { assessment: { select: { id: true, status: true } } },
    })
    if (!assignment || assignment.ownerId !== req.user!.id) {
      res.status(404).json({ error: "Not found" })
      return
    }
    res.json(assignment)
  } catch {
    res.status(500).json({ error: "Internal server error" })
  }
})

// GET /assignments — list the user's assignments
router.get("/", requireAuth, async (req, res): Promise<void> => {
  const assignments = await prisma.assignment.findMany({
    where: { ownerId: req.user!.id },
    orderBy: { createdAt: "desc" },
    include: { assessment: { select: { id: true, status: true } } },
  })
  res.json(assignments)
})

// DELETE /assignments/:id — cascade delete (owner only)
router.delete("/:id", requireAuth, async (req, res): Promise<void> => {
  try {
    const assignment = await prisma.assignment.findUnique({ where: { id: req.params.id } })
    if (!assignment || assignment.ownerId !== req.user!.id) {
      res.status(404).json({ error: "Not found" })
      return
    }
    await prisma.assignment.delete({ where: { id: req.params.id } })
    res.status(204).end()
  } catch {
    res.status(500).json({ error: "Internal server error" })
  }
})

export { router as assignmentsRouter }
