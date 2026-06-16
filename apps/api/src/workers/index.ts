import { Worker } from "bullmq"
import { generationWorker } from "./generation.worker"
import { ingestionWorker } from "./ingestion.worker"
import { gradingWorker } from "./grading.worker"
import { roadmapWorker } from "./roadmap.worker"
import { warmup } from "../rag/embeddings"

function attachLogger(name: string, worker: Worker<any, any, string>) {
  worker.on("active", (job) => {
    console.log(`[${name}] Job ${job.id} is active (started processing)`)
  })
  worker.on("completed", (job) => {
    console.log(`[${name}] Job ${job.id} completed successfully`)
  })
  worker.on("failed", (job, err) => {
    console.error(`[${name}] Job ${job?.id} failed:`, err.message)
  })
  worker.on("stalled", (jobId) => {
    console.warn(`[${name}] Job ${jobId} stalled!`)
  })
  worker.on("error", (err) => {
    console.error(`[${name}] Worker connection/system error:`, err)
  })
}

export function startWorkers(): void {
  // Pre-load the local embedding model so the first upload isn't slow.
  warmup()
    .then(() => console.log("[embeddings] local model warmed up"))
    .catch((err) => console.error("[embeddings] warmup failed:", err.message))

  attachLogger("generation", generationWorker)
  attachLogger("ingestion", ingestionWorker)
  attachLogger("grading", gradingWorker)
  attachLogger("roadmap", roadmapWorker)

  console.log(
    `Workers active — generation:${generationWorker.isRunning()} ingestion:${ingestionWorker.isRunning()} grading:${gradingWorker.isRunning()} roadmap:${roadmapWorker.isRunning()}`,
  )
}

export { generationWorker, ingestionWorker, gradingWorker, roadmapWorker }
