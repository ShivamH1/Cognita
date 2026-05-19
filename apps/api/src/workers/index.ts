import { generationWorker } from "./generation.worker"
import { ingestionWorker } from "./ingestion.worker"
import { gradingWorker } from "./grading.worker"
import { roadmapWorker } from "./roadmap.worker"
import { warmup } from "../rag/embeddings"

export function startWorkers(): void {
  // Pre-load the local embedding model so the first upload isn't slow.
  warmup()
    .then(() => console.log("[embeddings] local model warmed up"))
    .catch((err) => console.error("[embeddings] warmup failed:", err.message))

  console.log(
    `Workers active — generation:${generationWorker.isRunning()} ingestion:${ingestionWorker.isRunning()} grading:${gradingWorker.isRunning()} roadmap:${roadmapWorker.isRunning()}`,
  )
}

export { generationWorker, ingestionWorker, gradingWorker, roadmapWorker }
