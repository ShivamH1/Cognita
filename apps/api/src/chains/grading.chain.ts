import { z } from "zod"
import { hasLLM, generateStructured } from "../llm/gateway"
import type { GeneratedAssessment, Question, QuestionGrade, GradedSubmission } from "../types/index"

const llmGradeSchema = z.object({
  score: z.number(),
  feedback: z.string(),
})

const SYSTEM =
  "You are a fair, rigorous exam grader. You output strictly valid JSON. Award partial credit where deserved."

/** Deterministic grading for objective question types. */
function gradeObjective(question: Question, answer: string): QuestionGrade | null {
  if (question.type === "mcq" || question.type === "true_false") {
    const correct =
      !!question.answer &&
      answer.trim().toLowerCase() === String(question.answer).trim().toLowerCase()
    return {
      questionId: question.id,
      score: correct ? question.marks : 0,
      maxScore: question.marks,
      correct,
      feedback: correct ? "Correct." : `Incorrect. Correct answer: ${question.answer ?? "—"}.`,
    }
  }
  if (question.type === "fill_blank" && question.answer) {
    const correct = answer.trim().toLowerCase() === String(question.answer).trim().toLowerCase()
    if (correct) {
      return { questionId: question.id, score: question.marks, maxScore: question.marks, correct: true, feedback: "Correct." }
    }
  }
  return null
}

/** LLM grading for free-text answers (short/long/fill-in that didn't match exactly). */
async function gradeWithLLM(question: Question, answer: string): Promise<QuestionGrade> {
  if (!answer.trim()) {
    return { questionId: question.id, score: 0, maxScore: question.marks, correct: false, feedback: "No answer provided." }
  }
  if (!hasLLM()) {
    // Heuristic fallback: give half marks for a non-empty attempt.
    return {
      questionId: question.id,
      score: Math.round(question.marks / 2),
      maxScore: question.marks,
      feedback: "Auto-graded (no LLM key configured).",
    }
  }

  const prompt = `Grade this answer out of ${question.marks} marks.

Question: ${question.text}
${question.answer ? `Model answer / rubric: ${question.answer}` : ""}
Student answer: ${answer}

Return JSON: { "score": <0..${question.marks}>, "feedback": "<one or two sentences of specific feedback>" }`

  try {
    const res = await generateStructured(llmGradeSchema, SYSTEM, prompt, { temperature: 0.2 })
    const score = Math.max(0, Math.min(question.marks, res.score))
    return {
      questionId: question.id,
      score,
      maxScore: question.marks,
      correct: score >= question.marks,
      feedback: res.feedback,
    }
  } catch (err) {
    console.error("[grading] LLM grade failed:", (err as Error).message)
    return { questionId: question.id, score: 0, maxScore: question.marks, feedback: "Could not auto-grade this answer." }
  }
}

/**
 * Grade a full submission. `answers` maps questionId → student's answer.
 * MCQ/true-false/exact fill-blank are graded deterministically; free text via the LLM.
 */
export async function gradeSubmission(
  assessment: GeneratedAssessment,
  answers: Record<string, string>,
): Promise<GradedSubmission> {
  const questions = assessment.sections.flatMap((s) => s.questions)

  const grades = await Promise.all(
    questions.map(async (q) => {
      const answer = answers[q.id] ?? ""
      return gradeObjective(q, answer) ?? (await gradeWithLLM(q, answer))
    }),
  )

  const totalScore = grades.reduce((sum, g) => sum + g.score, 0)
  const maxScore = grades.reduce((sum, g) => sum + g.maxScore, 0)
  const pct = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0

  return {
    grades,
    totalScore,
    maxScore,
    overallFeedback: `You scored ${totalScore}/${maxScore} (${pct}%).`,
  }
}
