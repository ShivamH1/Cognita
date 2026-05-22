import { hasLLM, invokeText, streamText } from "../llm/gateway"
import { retrieve, buildTutorMessages, type ChatTurn, type Source } from "../rag/retrieval"

export interface TutorResult {
  answer: string
  sources: Source[]
}

export interface TutorStream {
  sources: Source[]
  tokens: AsyncGenerator<string>
}

async function prepare(documentId: string, question: string, history?: ChatTurn[]) {
  const { sources, contextBlock } = await retrieve(documentId, question, 5)
  const messages = buildTutorMessages({ contextBlock, question, history })
  return { sources, messages }
}

/** Non-streaming RAG answer grounded in a document. */
export async function answerTutor(
  documentId: string,
  question: string,
  history?: ChatTurn[],
): Promise<TutorResult> {
  if (!hasLLM()) {
    return { answer: "The AI tutor is unavailable because no LLM key is configured.", sources: [] }
  }
  const { sources, messages } = await prepare(documentId, question, history)
  const answer = await invokeText(messages, { temperature: 0.3 })
  return { answer, sources }
}

/** Streaming RAG answer: sources are known up front, tokens stream as they arrive. */
export async function streamTutorAnswer(
  documentId: string,
  question: string,
  history?: ChatTurn[],
): Promise<TutorStream> {
  const { sources, messages } = await prepare(documentId, question, history)

  async function* tokens(): AsyncGenerator<string> {
    if (!hasLLM()) {
      yield "The AI tutor is unavailable because no LLM key is configured."
      return
    }
    yield* streamText(messages, { temperature: 0.3 })
  }

  return { sources, tokens: tokens() }
}

export type { ChatTurn }
