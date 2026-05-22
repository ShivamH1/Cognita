import { z } from "zod"
import { hasLLM, generateStructured } from "../llm/gateway"
import { retrieve } from "../rag/retrieval"
import type {
  AssignmentInput,
  GeneratedAssessment,
  AssessmentSection,
  Question,
  Difficulty,
} from "../types/index"

// ─── LLM output schema (what we ask the model to produce) ──────────────────────

const optionSchema = z.object({ label: z.string(), text: z.string() })

const questionSchema = z.object({
  text: z.string(),
  type: z.enum(["mcq", "short_answer", "long_answer", "true_false", "fill_blank"]).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  marks: z.number().optional(),
  options: z.array(optionSchema).optional(),
  answer: z.string().optional(),
})

const sectionSchema = z.object({
  name: z.string().optional(),
  instructions: z.string().optional(),
  questions: z.array(questionSchema),
})

const assessmentSchema = z.object({
  duration: z.string().optional(),
  generalInstructions: z.array(z.string()).optional(),
  sections: z.array(sectionSchema),
})

// ─── Prompt ────────────────────────────────────────────────────────────────────

function buildUserPrompt(input: AssignmentInput, contextBlock?: string): string {
  const sectionLines = input.sections
    .map(
      (s) =>
        `- Section ${s.name}: ${s.questionCount} ${s.questionType.replace("_", " ")} questions, ${s.marksPerQuestion} marks each`,
    )
    .join("\n")

  const context = contextBlock
    ? `\n\nReference material:\n<context>\n${contextBlock}\n</context>`
    : ""

  return `Generate an exam paper as JSON.

${input.title} | ${input.subject} | ${input.topic} | ${input.gradeLevel} | ${input.totalMarks} marks
${input.additionalInstructions ? `Note: ${input.additionalInstructions}` : ""}${context}

Sections:
${sectionLines}

Return ONLY this JSON:
{"sections":[{"name":"Section A","questions":[{"text":"question text","type":"mcq","marks":2,"options":[{"label":"A","text":"opt"}],"answer":"A"}]}],"duration":"2 hours","generalInstructions":["instruction"]}

Rules:
- Generate EXACTLY the number of questions specified per section
- MCQ: 4 options A-D, include "answer" field with correct label
- true_false: options True/False
- Every question needs a "text" and "answer"
- Keep it simple`
}

const SYSTEM = "You are an exam paper generator. Return only valid JSON, no markdown or commentary."

// ─── Normalisation: force the model output to match the requested config ───────

function normalize(parsed: z.infer<typeof assessmentSchema>, input: AssignmentInput): GeneratedAssessment {
  const sections: AssessmentSection[] = input.sections.map((config, sIdx) => {
    const raw = parsed.sections[sIdx] ?? { questions: [] }
    const rawQuestions = raw.questions.slice(0, config.questionCount)

    const questions: Question[] = []
    for (let i = 0; i < config.questionCount; i++) {
      const q = rawQuestions[i]
      const difficulty: Difficulty =
        q?.difficulty && ["easy", "medium", "hard"].includes(q.difficulty) ? q.difficulty : "medium"

      if (q?.text) {
        questions.push({
          id: `${config.name}${i + 1}`,
          number: i + 1,
          text: String(q.text).trim(),
          type: config.questionType,
          difficulty,
          marks: typeof q.marks === "number" ? q.marks : config.marksPerQuestion,
          options: config.questionType === "mcq" || config.questionType === "true_false" ? q.options : undefined,
          answer: q.answer,
        })
      } else {
        // Pad missing questions so counts/marks always line up.
        questions.push({
          id: `${config.name}${i + 1}`,
          number: i + 1,
          text: `Question about ${input.topic}.`,
          type: config.questionType,
          difficulty: "medium",
          marks: config.marksPerQuestion,
          options:
            config.questionType === "mcq"
              ? [
                  { label: "A", text: "Option A" },
                  { label: "B", text: "Option B" },
                  { label: "C", text: "Option C" },
                  { label: "D", text: "Option D" },
                ]
              : undefined,
          answer: config.questionType === "mcq" ? "A" : undefined,
        })
      }
    }

    return {
      name: raw.name || `Section ${config.name}`,
      questionType: config.questionType,
      instructions: raw.instructions || config.instructions,
      totalMarks: questions.reduce((sum, q) => sum + q.marks, 0),
      questions,
    }
  })

  return {
    id: "",
    assignmentId: "",
    title: input.title,
    subject: input.subject,
    topic: input.topic,
    gradeLevel: input.gradeLevel,
    dueDate: input.dueDate,
    totalMarks: sections.reduce((sum, s) => sum + s.totalMarks, 0),
    duration: parsed.duration || "2 hours",
    generalInstructions:
      parsed.generalInstructions && parsed.generalInstructions.length > 0
        ? parsed.generalInstructions
        : ["Attempt all questions.", "Write answers clearly in the space provided."],
    sections,
    generatedAt: new Date().toISOString(),
    status: "complete",
  }
}

// ─── Mock fallback (no LLM key configured) ─────────────────────────────────────

function mockAssessment(input: AssignmentInput): GeneratedAssessment {
  const sections: AssessmentSection[] = input.sections.map((sec) => {
    const questions: Question[] = Array.from({ length: sec.questionCount }, (_, i) => ({
      id: `${sec.name}${i + 1}`,
      number: i + 1,
      text: `(${sec.questionType.replace("_", " ")}) Question ${i + 1} on ${input.topic}.`,
      type: sec.questionType,
      difficulty: "medium" as Difficulty,
      marks: sec.marksPerQuestion,
      options:
        sec.questionType === "mcq"
          ? [
              { label: "A", text: "Option A" },
              { label: "B", text: "Option B" },
              { label: "C", text: "Option C" },
              { label: "D", text: "Option D" },
            ]
          : undefined,
      answer: sec.questionType === "mcq" ? "A" : "Sample answer.",
    }))
    return {
      name: `Section ${sec.name}`,
      questionType: sec.questionType,
      instructions: sec.instructions,
      totalMarks: questions.reduce((s, q) => s + q.marks, 0),
      questions,
    }
  })

  return {
    id: "",
    assignmentId: "",
    title: input.title,
    subject: input.subject,
    topic: input.topic,
    gradeLevel: input.gradeLevel,
    dueDate: input.dueDate,
    totalMarks: sections.reduce((s, sec) => s + sec.totalMarks, 0),
    duration: "2 hours",
    generalInstructions: ["Attempt all questions.", "This is a mock paper (no LLM key configured)."],
    sections,
    generatedAt: new Date().toISOString(),
    status: "complete",
  }
}

// ─── Public entrypoint ─────────────────────────────────────────────────────────

export async function generateAssessment(
  input: AssignmentInput,
  onProgress?: (message: string) => void,
): Promise<GeneratedAssessment> {
  if (!hasLLM()) {
    onProgress?.("No LLM key configured — generating a mock paper...")
    return mockAssessment(input)
  }

  // RAG: if a document is attached, retrieve topic-relevant context instead of dumping the whole file.
  let contextBlock: string | undefined
  if (input.documentId) {
    onProgress?.("Retrieving relevant material from your document...")
    try {
      const { contextBlock: ctx } = await retrieve(input.documentId, `${input.topic} ${input.subject}`, 8)
      contextBlock = ctx
    } catch (err) {
      console.error("[assessment] retrieval failed:", (err as Error).message)
    }
  }

  onProgress?.("Generating questions with the LLM gateway...")
  const parsed = await generateStructured(
    assessmentSchema,
    SYSTEM,
    buildUserPrompt(input, contextBlock),
    { temperature: 0.7 },
  )

  onProgress?.("Validating and formatting the paper...")
  return normalize(parsed, input)
}
