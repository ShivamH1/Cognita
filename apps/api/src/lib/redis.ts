import { Redis } from "ioredis"
import { env } from "./env"

// Initialize shared ioredis connection for caching (fast, non-blocking commands)
export const redis = new Redis(env.REDIS_URL)

redis.on("connect", () => {
  console.log("Connected to Redis for caching successfully")
})

redis.on("error", (error) => {
  console.error("Redis caching connection error:", error)
})

// Factory function to create dedicated connection instances for BullMQ queues and workers
// to prevent blocking command conflict (head-of-line blocking) on a single connection.
export function createRedisClient(): Redis {
  const client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
  })

  client.on("error", (error) => {
    console.error("BullMQ Redis connection error:", error.message)
  })

  return client
}
