import { Queue } from "bullmq"
import { redis } from "../lib/redis"
import type { AssignmentInput } from "../types/index"

export interface GenerationJobData {
  assignmentId: string
  input: AssignmentInput
}

export const generationQueue = new Queue<GenerationJobData>("assessment-generation", {
  connection: redis,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "exponential", delay: 3000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
})
