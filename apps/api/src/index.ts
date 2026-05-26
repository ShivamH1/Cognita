import express from "express"
import cors from "cors"
import { createServer } from "http"
import { connectDB } from "./lib/db"
import { wsService } from "./services/websocket.service"
import { assignmentsRouter } from "./routes/assignments"
import { assessmentsRouter } from "./routes/assessments"
import { documentsRouter } from "./routes/documents"
import { tutorRouter } from "./routes/tutor"
import { submissionsRouter } from "./routes/submissions"
import { studyRouter } from "./routes/study"
import { analyticsRouter } from "./routes/analytics"
import { roadmapsRouter } from "./routes/roadmaps"
import { startWorkers } from "./workers"
import { configuredProviders, env } from "./lib/env"

const app = express()
const server = createServer(app)

app.use(cors({ origin: env.FRONTEND_URL }))
app.use(express.json({ limit: "50mb" }))

app.use("/api/assignments", assignmentsRouter)
app.use("/api/assessments", assessmentsRouter)
app.use("/api/documents", documentsRouter)
app.use("/api/tutor", tutorRouter)
app.use("/api/submissions", submissionsRouter)
app.use("/api/study", studyRouter)
app.use("/api/analytics", analyticsRouter)
app.use("/api/roadmaps", roadmapsRouter)

app.get("/health", (_, res) => {
  res.json({ status: "ok", providers: configuredProviders() })
})

async function start() {
  await connectDB()
  wsService.initialize(server)
  startWorkers()

  server.listen(env.PORT, () => {
    console.log(`Cognita API running on http://localhost:${env.PORT}`)
    console.log(`WebSocket running on ws://localhost:${env.PORT}/ws`)
    const providers = configuredProviders()
    console.log(
      providers.length
        ? `LLM Gateway providers (failover order): ${providers.join(" → ")}`
        : "LLM Gateway: no provider keys configured — running in mock mode",
    )
  })
}

start()
