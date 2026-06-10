import { z } from "zod"
import { hasLLM, generateStructured } from "../llm/gateway"
import { hasTavily } from "../lib/env"
import type { RoadmapInput, GeneratedRoadmap, RoadmapPhase, RoadmapMilestone, RoadmapResource, RoadmapTask } from "../types/index"

// ─── LLM output schema ────────────────────────────────────────────────────────

const resourceSchema = z.object({
  title: z.string(),
  url: z.string().optional(),
  type: z.enum(["video", "article", "pdf", "exercise", "book"]),
  free: z.boolean().optional().default(true),
  estimatedMinutes: z.number().optional(),
  description: z.string().optional(),
})

const taskSchema = z.object({
  text: z.string(),
})

const milestoneSchema = z.object({
  title: z.string(),
  description: z.string(),
  order: z.number().optional(),
  resources: z.array(resourceSchema).optional().default([]),
  tasks: z.array(taskSchema).optional().default([]),
})

const phaseSchema = z.object({
  title: z.string(),
  description: z.string(),
  order: z.number().optional(),
  estimatedWeeks: z.number().optional().default(2),
  milestones: z.array(milestoneSchema).optional().default([]),
})

const roadmapSchema = z.object({
  description: z.string(),
  totalWeeks: z.number(),
  phases: z.array(phaseSchema),
})

// ─── Prompt (simplified for free-tier models) ──────────────────────────────────

function buildRoadmapPrompt(input: RoadmapInput, evidence?: string): string {
  const audience = input.targetAudience ? ` for ${input.targetAudience}` : ""
  const duration = input.durationWeeks ? ` over ${input.durationWeeks} weeks` : ""
  const evidenceBlock = evidence
    ? `\n\nUse these search results as resource references:\n${evidence.slice(0, 2000)}`
    : ""

  return `Create a learning roadmap for "${input.topic}"${audience}${duration}.

Return a JSON object with exactly this structure:
{
  "description": "brief overview",
  "totalWeeks": 12,
  "phases": [
    {
      "title": "Phase 1: Fundamentals",
      "description": "what this phase covers",
      "estimatedWeeks": 4,
      "milestones": [
        {
          "title": "milestone name",
          "description": "what the student will learn",
          "resources": [
            { "title": "resource name", "url": "https://...", "type": "video" }
          ],
          "tasks": [
            { "text": "task description" }
          ]
        }
      ]
    }
  ]
}

Rules:
- 2-4 phases, 2-3 milestones each
- All resources must be FREE
- Resource types: video, article, pdf, exercise, book
- Include real URLs when possible${evidenceBlock}

Return ONLY the JSON object.`
}

const SYSTEM = "You are a curriculum designer. Output ONLY valid JSON."

// ─── ID assignment ─────────────────────────────────────────────────────────────

function assignIds(phases: RoadmapPhase[]): RoadmapPhase[] {
  return phases.map((phase, pi) => ({
    ...phase,
    id: `phase-${pi + 1}`,
    milestones: phase.milestones.map((milestone, mi) => ({
      ...milestone,
      id: `milestone-${pi + 1}-${mi + 1}`,
      resources: milestone.resources.map((resource, ri) => ({
        ...resource,
        id: `resource-${pi + 1}-${mi + 1}-${ri + 1}`,
      })),
      tasks: milestone.tasks.map((task, ti) => ({
        ...task,
        id: `task-${pi + 1}-${mi + 1}-${ti + 1}`,
      })),
    })),
  }))
}

// ─── Normalisation ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalize(parsed: any, input: RoadmapInput): GeneratedRoadmap {
  const data = parsed as any
  const phases: RoadmapPhase[] = (data.phases ?? []).map((phase: any, pi: number) => ({
    id: "",
    title: phase.title || `Phase ${pi + 1}`,
    description: phase.description || "",
    order: pi + 1,
    estimatedWeeks: phase.estimatedWeeks || 2,
    milestones: (phase.milestones ?? []).map((milestone: any, mi: number) => ({
      id: "",
      title: milestone.title || `Milestone ${mi + 1}`,
      description: milestone.description || "",
      order: mi + 1,
      resources: (milestone.resources ?? []).map((resource: any) => ({
        id: "",
        title: resource.title,
        url: resource.url,
        type: resource.type,
        free: resource.free ?? true,
        estimatedMinutes: resource.estimatedMinutes,
        description: resource.description,
      })),
      tasks: (milestone.tasks ?? []).map((task: any) => ({
        id: "",
        text: task.text,
      })),
    })),
  }))

  return {
    description: data.description || `Learning roadmap for ${input.topic}`,
    totalWeeks: data.totalWeeks || input.durationWeeks || phases.reduce((s, p) => s + p.estimatedWeeks, 0),
    phases: assignIds(phases),
  }
}

// ─── Mock fallback ─────────────────────────────────────────────────────────────

function mockRoadmap(input: RoadmapInput): GeneratedRoadmap {
  const phase: RoadmapPhase = {
    id: "phase-1",
    title: "Phase 1: Fundamentals",
    description: `Core concepts and foundational knowledge for ${input.topic}`,
    order: 1,
    estimatedWeeks: input.durationWeeks || 4,
    milestones: [
      {
        id: "milestone-1-1",
        title: "Understand the basics",
        description: `Learn the fundamental concepts of ${input.topic}`,
        order: 1,
        resources: [
          {
            id: "resource-1-1-1",
            title: `Introduction to ${input.topic} — MIT OpenCourseWare`,
            url: "https://ocw.mit.edu",
            type: "video",
            free: true,
            estimatedMinutes: 60,
            description: "Free lecture from MIT",
          },
          {
            id: "resource-1-1-2",
            title: `${input.topic} Documentation`,
            type: "article",
            free: true,
            description: "Official documentation",
          },
        ],
        tasks: [
          { id: "task-1-1-1", text: `Read the introduction to ${input.topic}` },
          { id: "task-1-1-2", text: "Watch the introductory lecture" },
          { id: "task-1-1-3", text: "Take notes on key concepts" },
        ],
      },
      {
        id: "milestone-1-2",
        title: "Hands-on practice",
        description: `Apply what you've learned through practice exercises`,
        order: 2,
        resources: [
          {
            id: "resource-1-2-1",
            title: `${input.topic} Tutorial for Beginners`,
            url: "https://www.youtube.com",
            type: "video",
            free: true,
            estimatedMinutes: 45,
          },
        ],
        tasks: [
          { id: "task-1-2-1", text: "Complete beginner exercises" },
          { id: "task-1-2-2", text: "Build a simple project" },
        ],
      },
    ],
  }

  return {
    description: `A structured learning path for ${input.topic}. This is a mock roadmap (no LLM key configured).`,
    totalWeeks: input.durationWeeks || 4,
    phases: [phase],
  }
}

// ─── Research stage (Tavily) ───────────────────────────────────────────────────

async function researchTopic(input: RoadmapInput, onProgress?: (msg: string) => void): Promise<string | undefined> {
  if (!hasTavily()) return undefined

  onProgress?.("Searching for free educational resources...")

  try {
    const { TavilySearch } = await import("@langchain/tavily")
    const search = new TavilySearch({ maxResults: 3 })

    const queries = [
      `free ${input.topic} courses MIT Stanford open courseware`,
      `${input.topic} beginner tutorial free YouTube`,
    ]

    const results: string[] = []

    for (let i = 0; i < queries.length; i++) {
      onProgress?.(`Searching (${i + 1}/${queries.length})...`)
      try {
        const res = await search.invoke({ query: queries[i] })
        const items = Array.isArray(res) ? res : []
        for (const item of items) {
          if (item && typeof item === "object" && "title" in item) {
            const r = item as any
            if (r.title || r.content) {
              results.push(`${r.title || "Untitled"}: ${r.url || ""}\n${(r.content || "").slice(0, 200)}`)
            }
          }
        }
      } catch (err: any) {
        // Tavily returns Response objects on auth errors, not Error instances
        console.error(`[roadmap] Tavily query ${i + 1} failed:`, err?.message || err?.statusText || "unknown")
      }
    }

    if (results.length === 0) return undefined
    return results.slice(0, 10).join("\n---\n")
  } catch (err: any) {
    console.error("[roadmap] Tavily research failed:", err?.message || "unknown")
    return undefined
  }
}

// ─── Public entrypoint ─────────────────────────────────────────────────────────

export async function generateRoadmap(
  input: RoadmapInput,
  onProgress?: (message: string) => void,
): Promise<GeneratedRoadmap> {
  if (!hasLLM()) {
    onProgress?.("No LLM key configured — generating a mock roadmap...")
    return mockRoadmap(input)
  }

  // Stage 1: Research (optional, best-effort)
  let evidence: string | undefined
  try {
    evidence = await researchTopic(input, onProgress)
  } catch (err) {
    console.error("[roadmap] Research stage failed:", (err as Error).message)
  }

  if (evidence) {
    onProgress?.("Found relevant resources. Structuring learning path...")
  } else {
    onProgress?.("Generating structured learning path...")
  }

  // Stage 2: Structure (generateStructured with self-repair)
  const parsed = await generateStructured(
    roadmapSchema,
    SYSTEM,
    buildRoadmapPrompt(input, evidence),
    { temperature: 0.7, maxTokens: 4096 },
  )

  onProgress?.("Validating and formatting roadmap...")
  return normalize(parsed, input)
}
