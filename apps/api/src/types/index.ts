// ─── Assignment Creation Input ───────────────────────────────────────────────

export type QuestionType = "mcq" | "short_answer" | "long_answer" | "true_false" | "fill_blank"
export type Difficulty = "easy" | "medium" | "hard"
export type DifficultyMix = { easy: number; medium: number; hard: number } // percentages, must sum to 100

export interface SectionConfig {
  name: string            // "A", "B", "C"
  questionType: QuestionType
  questionCount: number   // min 1
  marksPerQuestion: number // min 1
  instructions: string    // e.g. "Attempt all questions"
  difficultyMix: DifficultyMix
}

export interface AssignmentInput {
  title: string
  subject: string
  topic: string
  gradeLevel: string      // e.g. "Grade 10", "Undergraduate"
  dueDate: string         // ISO date string
  totalMarks: number      // computed from sections
  sections: SectionConfig[]
  additionalInstructions: string
  documentId?: string     // optional RAG source document (chunks retrieved at generation time)
}

// ─── Generated Assessment Output ────────────────────────────────────────────

export interface MCQOption {
  label: string           // "A", "B", "C", "D"
  text: string
}

export interface Question {
  id: string              // "A1", "B3" etc.
  number: number          // 1, 2, 3 within section
  text: string
  type: QuestionType
  difficulty: Difficulty
  marks: number
  options?: MCQOption[]   // Only for MCQ
  answer?: string         // Hidden in frontend output, stored in DB
}

export interface AssessmentSection {
  name: string            // "Section A"
  questionType: QuestionType
  instructions: string
  totalMarks: number
  questions: Question[]
}

export interface GeneratedAssessment {
  id: string
  assignmentId: string
  title: string
  subject: string
  topic: string
  gradeLevel: string
  dueDate: string
  totalMarks: number
  duration?: string       // e.g. "2 hours 30 minutes" (AI inferred)
  generalInstructions: string[]
  sections: AssessmentSection[]
  generatedAt: string
  status: "pending" | "generating" | "complete" | "failed"
}

// ─── Grading ──────────────────────────────────────────────────────────────────

export interface QuestionGrade {
  questionId: string
  score: number
  maxScore: number
  correct?: boolean
  feedback?: string
}

export interface GradedSubmission {
  grades: QuestionGrade[]
  totalScore: number
  maxScore: number
  overallFeedback?: string
}

// ─── Roadmaps ──────────────────────────────────────────────────────────────────

export interface RoadmapResource {
  id: string
  title: string
  url?: string
  type: "video" | "article" | "pdf" | "exercise" | "book"
  free: boolean
  estimatedMinutes?: number
  description?: string
}

export interface RoadmapTask {
  id: string
  text: string
}

export interface RoadmapMilestone {
  id: string
  title: string
  description: string
  order: number
  resources: RoadmapResource[]
  tasks: RoadmapTask[]
}

export interface RoadmapPhase {
  id: string
  title: string
  description: string
  order: number
  estimatedWeeks: number
  milestones: RoadmapMilestone[]
}

export interface RoadmapInput {
  title: string
  topic: string
  targetAudience?: string
  durationWeeks?: number
  providedUrls?: string[]
  documentIds?: string[]
}

export interface GeneratedRoadmap {
  description: string
  totalWeeks: number
  phases: RoadmapPhase[]
}

export interface StudentRoadmapProgress {
  completedTasks: string[]
  completedResources: string[]
  notes: { milestoneId: string; note: string }[]
}

// ─── Study artifacts ──────────────────────────────────────────────────────────

export interface Flashcard {
  front: string
  back: string
}

export interface StudySummary {
  summary: string
  keyPoints: string[]
}

// ─── Tutor chat ───────────────────────────────────────────────────────────────

export interface ChatSource {
  chunkIndex: number
  snippet: string
}

// ─── WebSocket Messages ───────────────────────────────────────────────────────

export type WSMessageType =
  | "job_queued"
  | "generation_started"
  | "section_complete"
  | "generation_complete"
  | "generation_failed"
  | "roadmap_queued"
  | "roadmap_started"
  | "roadmap_phase_complete"
  | "roadmap_complete"
  | "roadmap_failed"

export interface WSMessage {
  type: WSMessageType
  assignmentId?: string
  roadmapId?: string
  assessmentId?: string
  progress?: number        // 0–100
  message?: string
  sectionName?: string     // For section_complete events
  phaseName?: string       // For roadmap_phase_complete events
}
