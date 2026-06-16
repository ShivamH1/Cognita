import { Queue } from "bullmq"
import { createRedisClient } from "../lib/redis"

export interface IngestionJobData {
  documentId: string
  userId: string
  filename: string
  mimeType?: string
  fileBase64: string
}

export const ingestionQueue = new Queue<IngestionJobData>("document-ingestion", {
  connection: createRedisClient(),
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "exponential", delay: 3000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
})
