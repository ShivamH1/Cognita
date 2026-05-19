import { Queue } from "bullmq"
import { redis } from "../lib/redis"

export interface IngestionJobData {
  documentId: string
  userId: string
  filename: string
  mimeType?: string
  fileBase64: string
}

export const ingestionQueue = new Queue<IngestionJobData>("document-ingestion", {
  connection: redis,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "exponential", delay: 3000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
})
