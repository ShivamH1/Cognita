import { Router, type Request, type Response } from "express"
import { z } from "zod"
import type { Prisma } from "@prisma/client"
import { prisma } from "../lib/db"
import { requireAuth } from "../middleware/auth"
import { streamTutorAnswer, type ChatTurn } from "../chains/tutor.chain"

const router = Router()

async function ownedDocument(userId: string, documentId: string) {
  const doc = await prisma.document.findUnique({ where: { id: documentId } })
  if (!doc || doc.ownerId !== userId) return null
  return doc
}

// POST /tutor/sessions — start a chat session for a document
router.post("/sessions", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { documentId } = z.object({ documentId: z.string() }).parse(req.body)
  const doc = await ownedDocument(req.user!.id, documentId)
  if (!doc) {
    res.status(404).json({ error: "Document not found" })
    return
  }
  const session = await prisma.chatSession.create({
    data: { userId: req.user!.id, documentId, title: doc.filename },
  })
  res.status(201).json(session)
})

// GET /tutor/sessions?documentId= — list sessions
router.get("/sessions", requireAuth, async (req, res): Promise<void> => {
  const documentId = typeof req.query.documentId === "string" ? req.query.documentId : undefined
  const sessions = await prisma.chatSession.findMany({
    where: { userId: req.user!.id, ...(documentId ? { documentId } : {}) },
    orderBy: { updatedAt: "desc" },
  })
  res.json(sessions)
})

// GET /tutor/sessions/:id/messages
router.get("/sessions/:id/messages", requireAuth, async (req, res): Promise<void> => {
  const session = await prisma.chatSession.findUnique({ where: { id: req.params.id } })
  if (!session || session.userId !== req.user!.id) {
    res.status(404).json({ error: "Not found" })
    return
  }
  const messages = await prisma.chatMessage.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: "asc" },
  })
  res.json(messages)
})

// POST /tutor/sessions/:id/message — SSE-streamed RAG answer
router.post("/sessions/:id/message", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { content } = z.object({ content: z.string().min(1) }).parse(req.body)

  const session = await prisma.chatSession.findUnique({ where: { id: req.params.id } })
  if (!session || session.userId !== req.user!.id) {
    res.status(404).json({ error: "Not found" })
    return
  }

  // Persist the user's message and load recent history.
  await prisma.chatMessage.create({ data: { sessionId: session.id, role: "user", content } })
  const prior = await prisma.chatMessage.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: "asc" },
  })
  const history: ChatTurn[] = prior.map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))

  // SSE setup
  res.setHeader("Content-Type", "text/event-stream")
  res.setHeader("Cache-Control", "no-cache")
  res.setHeader("Connection", "keep-alive")
  res.flushHeaders?.()

  const send = (event: string, data: unknown) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)

  try {
    const { sources, tokens } = await streamTutorAnswer(session.documentId, content, history.slice(0, -1))
    send("sources", sources)

    let full = ""
    for await (const token of tokens) {
      full += token
      send("token", token)
    }

    await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: "assistant",
        content: full,
        sources: sources as unknown as Prisma.InputJsonValue,
      },
    })
    await prisma.chatSession.update({ where: { id: session.id }, data: { updatedAt: new Date() } })

    send("done", { ok: true })
    res.end()
  } catch (err) {
    send("error", { message: (err as Error).message })
    res.end()
  }
})

export { router as tutorRouter }
