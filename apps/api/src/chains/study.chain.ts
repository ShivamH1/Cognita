import { z } from "zod"
import { hasLLM, generateStructured } from "../llm/gateway"
import { retrieve } from "../rag/retrieval"
import type { Flashcard, StudySummary } from "../types/index"

const SYSTEM = "You are a study assistant that creates concise learning aids and outputs strictly valid JSON."

const summarySchema = z.object({
  summary: z.string(),
  keyPoints: z.array(z.string()),
})

const flashcardsSchema = z.object({
  cards: z.array(z.object({ front: z.string(), back: z.string() })),
})

/** Pull a broad sample of the document to summarise / make cards from. */
async function gatherContext(documentId: string): Promise<string> {
  const { contextBlock } = await retrieve(documentId, "key concepts overview summary", 12)
  return contextBlock
}

export async function generateSummary(documentId: string): Promise<StudySummary> {
  if (!hasLLM()) {
    return { summary: "Summary unavailable (no LLM key configured).", keyPoints: [] }
  }
  const context = await gatherContext(documentId)
  return generateStructured(
    summarySchema,
    SYSTEM,
    `Summarise the material below for a student. Return JSON { "summary": "<2-4 paragraph overview>", "keyPoints": ["...", "..."] }.\n\nMaterial:\n${context}`,
    { temperature: 0.4 },
  )
}

export async function generateFlashcards(documentId: string, count = 10): Promise<Flashcard[]> {
  if (!hasLLM()) return []
  const context = await gatherContext(documentId)
  const res = await generateStructured(
    flashcardsSchema,
    SYSTEM,
    `Create ${count} study flashcards from the material below. Each card: a question/term on the front, a concise answer on the back. Return JSON { "cards": [{ "front": "...", "back": "..." }] }.\n\nMaterial:\n${context}`,
    { temperature: 0.5 },
  )
  return res.cards.slice(0, count)
}
