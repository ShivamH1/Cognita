import { Router, type Request, type Response } from "express"
import { z } from "zod"
import type { Prisma } from "@prisma/client"
import { prisma } from "../lib/db"
import { requireAuth } from "../middleware/auth"
import { generateSummary, generateFlashcards } from "../chains/study.chain"

const router = Router()

async function ownedReadyDoc(userId: string, documentId: string) {
  const doc = await prisma.document.findUnique({ where: { id: documentId } })
  if (!doc || doc.ownerId !== userId) return { error: 404 as const }
  if (doc.status !== "READY") return { error: 409 as const }
  return { doc }
}

// POST /study/summary — generate + save a summary for a document
router.post("/summary", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { documentId } = z.object({ documentId: z.string() }).parse(req.body)
  const owned = await ownedReadyDoc(req.user!.id, documentId)
  if (owned.error === 404) {
    res.status(404).json({ error: "Document not found" })
    return
  }
  if (owned.error === 409) {
    res.status(409).json({ error: "Document still processing" })
    return
  }

  const summary = await generateSummary(documentId)
  const artifact = await prisma.studyArtifact.create({
    data: { userId: req.user!.id, documentId, type: "SUMMARY", content: summary as unknown as Prisma.InputJsonValue },
  })
  res.json(artifact)
})

// POST /study/flashcards — generate + save flashcards for a document
router.post("/flashcards", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { documentId, count } = z.object({ documentId: z.string(), count: z.number().int().min(1).max(30).optional() }).parse(req.body)
  const owned = await ownedReadyDoc(req.user!.id, documentId)
  if (owned.error === 404) {
    res.status(404).json({ error: "Document not found" })
    return
  }
  if (owned.error === 409) {
    res.status(409).json({ error: "Document still processing" })
    return
  }

  const cards = await generateFlashcards(documentId, count ?? 10)
  const artifact = await prisma.studyArtifact.create({
    data: { userId: req.user!.id, documentId, type: "FLASHCARDS", content: { cards } as unknown as Prisma.InputJsonValue },
  })
  res.json(artifact)
})

// GET /study?documentId= — saved artifacts
router.get("/", requireAuth, async (req, res): Promise<void> => {
  const documentId = typeof req.query.documentId === "string" ? req.query.documentId : undefined
  const artifacts = await prisma.studyArtifact.findMany({
    where: { userId: req.user!.id, ...(documentId ? { documentId } : {}) },
    orderBy: { createdAt: "desc" },
  })
  res.json(artifacts)
})

export { router as studyRouter }
