import { Router, type Request, type Response } from "express"
import multer from "multer"
import { prisma } from "../lib/db"
import { ingestionQueue } from "../queues/ingestion.queue"
import { deleteDocumentVectors } from "../rag/vectorstore"
import { requireAuth } from "../middleware/auth"

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } })

// POST /documents — upload + queue ingestion (load → chunk → embed → store)
router.post("/", requireAuth, upload.single("file"), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" })
      return
    }

    const document = await prisma.document.create({
      data: {
        ownerId: req.user!.id,
        filename: req.file.originalname,
        mimeType: req.file.mimetype,
        status: "PROCESSING",
      },
    })

    await ingestionQueue.add("ingest", {
      documentId: document.id,
      userId: req.user!.id,
      filename: req.file.originalname,
      mimeType: req.file.mimetype,
      fileBase64: req.file.buffer.toString("base64"),
    })

    res.status(201).json({ documentId: document.id, status: document.status, filename: document.filename })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Internal server error" })
  }
})

// GET /documents — list the user's documents
router.get("/", requireAuth, async (req, res): Promise<void> => {
  const docs = await prisma.document.findMany({
    where: { ownerId: req.user!.id },
    orderBy: { createdAt: "desc" },
  })
  res.json(docs)
})

// GET /documents/:id — one document (for polling status)
router.get("/:id", requireAuth, async (req, res): Promise<void> => {
  const doc = await prisma.document.findUnique({ where: { id: req.params.id } })
  if (!doc || doc.ownerId !== req.user!.id) {
    res.status(404).json({ error: "Not found" })
    return
  }
  res.json(doc)
})

// DELETE /documents/:id — remove vectors + record
router.delete("/:id", requireAuth, async (req, res): Promise<void> => {
  const doc = await prisma.document.findUnique({ where: { id: req.params.id } })
  if (!doc || doc.ownerId !== req.user!.id) {
    res.status(404).json({ error: "Not found" })
    return
  }
  await deleteDocumentVectors(doc.id)
  await prisma.document.delete({ where: { id: doc.id } })
  res.json({ message: "Document deleted" })
})

export { router as documentsRouter }
