import { Redis } from "ioredis"
import { env } from "./env"

// Initialize ioredis connection with BullMQ requirement maxRetriesPerRequest = null
export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
})

redis.on("connect", () => {
  console.log("Connected to Redis successfully")
})

redis.on("error", (error) => {
  console.error("Redis connection error:", error)
})
