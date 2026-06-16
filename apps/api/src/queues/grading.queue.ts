import { Queue } from "bullmq"
import { createRedisClient } from "../lib/redis"

export interface GradingJobData {
  submissionId: string
}

export const gradingQueue = new Queue<GradingJobData>("submission-grading", {
  connection: createRedisClient(),
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "exponential", delay: 3000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
})
