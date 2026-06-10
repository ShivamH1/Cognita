import { hasLLM, streamText } from "../llm/gateway"

export type ChatTurn = { role: "user" | "assistant"; content: string }

interface MilestoneContext {
  roadmapTitle: string
  phase: string
  milestone: string
  description: string
}

function buildMessages(
  context: MilestoneContext,
  history: ChatTurn[],
  question: string,
) {
  const system = `You are a helpful learning tutor for the roadmap "${context.roadmapTitle}".

The student is currently working on:
- Phase: ${context.phase}
- Milestone: ${context.milestone}
- Description: ${context.description}

Answer questions about this milestone. Be pedagogical, encouraging, and concise.
If the student asks about something outside this milestone's scope, gently redirect them back.`

  const messages: Array<{ role: string; content: string }> = [
    { role: "system", content: system },
  ]

  for (const turn of history.slice(-6)) {
    messages.push({ role: turn.role, content: turn.content })
  }

  messages.push({ role: "user", content: question })
  return messages
}

/** Streaming milestone tutor answer — stateless, no DB session. */
export async function* streamMilestoneAnswer(
  context: MilestoneContext,
  history: ChatTurn[],
  question: string,
): AsyncGenerator<string> {
  if (!hasLLM()) {
    yield "The AI tutor is unavailable because no LLM key is configured."
    return
  }

  const messages = buildMessages(context, history, question)
  yield* streamText(messages, { temperature: 0.5 })
}
