import { Queue } from "bullmq"
import { redis } from "./lib/redis"

async function check() {
  const queue = new Queue("assessment-generation", { connection: redis })
  
  const active = await queue.getActive()
  console.log("ACTIVE JOBS count:", active.length)
  for (const j of active) {
    console.log(`- Job ${j.id}: ${j.name} (Progress: ${j.progress})`)
  }

  const waiting = await queue.getWaiting()
  console.log("WAITING JOBS count:", waiting.length)
  for (const j of waiting) {
    console.log(`- Job ${j.id}: ${j.name}`)
  }

  const failed = await queue.getFailed()
  console.log("FAILED JOBS count:", failed.length)
  for (const j of failed) {
    console.log(`- Job ${j.id}: ${j.name} (Reason: ${j.failedReason})`)
  }

  process.exit(0)
}

check().catch(err => {
  console.error(err)
  process.exit(1)
})
