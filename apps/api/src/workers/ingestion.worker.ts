import { Worker, Job } from "bullmq"
import { createRedisClient } from "../lib/redis"
import { prisma } from "../lib/db"
import { ingestDocument } from "../rag/ingest"
import { COLLECTION } from "../rag/vectorstore"
import type { IngestionJobData } from "../queues/ingestion.queue"

export const ingestionWorker = new Worker<IngestionJobData>(
  "document-ingestion",
  async (job: Job<IngestionJobData>) => {
    const { documentId, userId, filename, mimeType, fileBase64 } = job.data
    const buffer = Buffer.from(fileBase64, "base64")

    try {
      const chunkCount = await ingestDocument({ documentId, userId, filename, mimeType, buffer })
      await prisma.document.update({
        where: { id: documentId },
        data: { status: "READY", chunkCount, collection: COLLECTION, error: null },
      })
      console.log(`[ingestion] Document ${documentId} ready (${chunkCount} chunks)`)
    } catch (err) {
      await prisma.document
        .update({ where: { id: documentId }, data: { status: "FAILED", error: (err as Error).message } })
        .catch(() => undefined)
      throw err
    }
  },
  { connection: createRedisClient(), concurrency: 2 },
)

ingestionWorker.on("failed", (job, err) => {
  console.error(`[ingestion] Job ${job?.id} failed:`, err.message)
})
