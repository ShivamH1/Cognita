import type { BaseMessageLike } from "@langchain/core/messages"
import { similaritySearch } from "./vectorstore"

export interface Source {
  chunkIndex: number
  snippet: string
}

export interface RetrievedContext {
  sources: Source[]
  contextBlock: string
}

/** Retrieve the top-k chunks for a question and format them as a numbered context block. */
export async function retrieve(documentId: string, query: string, k = 5): Promise<RetrievedContext> {
  const docs = await similaritySearch(documentId, query, k)

  const sources: Source[] = docs.map((d) => ({
    chunkIndex: typeof d.metadata?.chunkIndex === "number" ? d.metadata.chunkIndex : -1,
    snippet: d.pageContent.slice(0, 300),
  }))

  const contextBlock = docs
    .map((d, i) => `[${i + 1}] ${d.pageContent}`)
    .join("\n\n")

  return { sources, contextBlock }
}

export interface ChatTurn {
  role: "user" | "assistant"
  content: string
}

const TUTOR_SYSTEM = `You are Cognita, an expert AI tutor. Answer the student's question using ONLY the numbered context excerpts from their document.

Rules:
- Ground every claim in the context. Cite sources inline like [1], [2].
- If the answer is not contained in the context, say you couldn't find it in the document and suggest what to look for.
- Be clear and pedagogical: explain, don't just state. Use short paragraphs or bullet points.`

/**
 * Build the message list for a tutor (chat-with-PDF) turn.
 * Keeps only the last few history turns to stay within free-model context windows.
 */
export function buildTutorMessages(opts: {
  contextBlock: string
  question: string
  history?: ChatTurn[]
}): BaseMessageLike[] {
  const recent = (opts.history ?? []).slice(-6)
  return [
    { role: "system", content: TUTOR_SYSTEM },
    ...recent.map((t) => ({ role: t.role, content: t.content })),
    {
      role: "user",
      content: `Context excerpts:\n${opts.contextBlock || "(no relevant excerpts found)"}\n\nQuestion: ${opts.question}`,
    },
  ]
}
