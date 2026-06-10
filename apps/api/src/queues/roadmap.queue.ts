import { Queue } from "bullmq"
import { redis } from "../lib/redis"
import type { RoadmapInput } from "../types/index"

export interface RoadmapJobData {
  roadmapId: string
  input: RoadmapInput
}

export const roadmapQueue = new Queue<RoadmapJobData>("roadmap-generation", {
  connection: redis,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "exponential", delay: 3000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
})
