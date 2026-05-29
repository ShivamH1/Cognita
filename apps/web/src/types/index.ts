// ─── Assignment Creation Input ───────────────────────────────────────────────

export type QuestionType = "mcq" | "short_answer" | "long_answer" | "true_false" | "fill_blank"
export type Difficulty = "easy" | "medium" | "hard"
export type DifficultyMix = { easy: number; medium: number; hard: number }

export interface SectionConfig {
  name: string            // "A", "B", "C"
  questionType: QuestionType
  questionCount: number
  marksPerQuestion: number
  instructions: string
  difficultyMix: DifficultyMix
}

export interface AssignmentInput {
  title: string
  subject: string
  topic: string
  gradeLevel: string
  dueDate: string
  totalMarks: number
  sections: SectionConfig[]
  additionalInstructions: string
  uploadedFileText?: string
}

// ─── Generated Assessment Output ────────────────────────────────────────────

export interface MCQOption {
  label: string           // "A", "B", "C", "D"
  text: string
}

export interface Question {
  id: string
  number: number
  text: string
  type: QuestionType
  difficulty: Difficulty
  marks: number
  options?: MCQOption[]
  answer?: string
}

export interface AssessmentSection {
  name: string
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
  duration?: string
  generalInstructions: string[]
  sections: AssessmentSection[]
  generatedAt: string
  status: "pending" | "generating" | "complete" | "failed"
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
  progress?: number
  message?: string
  sectionName?: string
  phaseName?: string
}

// ─── Roles & Auth ───────────────────────────────────────────────────────────

export type Role = "STUDENT" | "TEACHER"

// ─── Documents ──────────────────────────────────────────────────────────────

export type DocumentStatus = "PROCESSING" | "READY" | "FAILED"

export interface DocumentItem {
  id: string
  filename: string
  mimeType: string | null
  status: DocumentStatus
  chunkCount: number
  createdAt: string
}

// ─── Tutor (chat-with-PDF) ──────────────────────────────────────────────────

export interface ChatSource {
  chunkIndex: number
  snippet: string
}

export interface ChatSession {
  id: string
  documentId: string
  title: string | null
  createdAt: string
  updatedAt: string
}

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  sources?: ChatSource[] | null
  createdAt: string
}

// ─── Assignments (creation records) ─────────────────────────────────────────

export type JobStatus = "PENDING" | "GENERATING" | "COMPLETE" | "FAILED"

export interface AssignmentRecord {
  id: string
  title: string
  subject: string
  topic: string
  gradeLevel: string
  dueDate: string
  totalMarks: number
  status: JobStatus
  documentId: string | null
  createdAt: string
  assessment: { id: string; status: JobStatus } | null
}

// ─── Submissions & grading ──────────────────────────────────────────────────

export type SubmissionStatus = "submitted" | "grading" | "graded" | "failed"

export interface Grade {
  questionId: string
  score: number
  maxScore: number
  correct: boolean | null
  feedback: string | null
}

export interface Submission {
  id: string
  assessmentId: string
  studentId: string
  totalScore: number | null
  maxScore: number | null
  status: SubmissionStatus
  createdAt: string
  grades?: Grade[]
  student?: { id: string; name: string | null; email: string }
  assessment?: { id?: string; title?: string; subject?: string }
}

// ─── Study artifacts ────────────────────────────────────────────────────────

export interface SummaryContent {
  summary: string
  keyPoints: string[]
}

export interface Flashcard {
  front: string
  back: string
}

export interface FlashcardsContent {
  cards: Flashcard[]
}

export interface StudyArtifact {
  id: string
  type: "SUMMARY" | "FLASHCARDS"
  documentId: string
  content: SummaryContent | FlashcardsContent
  createdAt: string
}

// ─── Analytics ──────────────────────────────────────────────────────────────

export interface TeacherAnalytics {
  assignmentCount: number
  assessmentCount: number
  submissionCount: number
  averageScorePct: number | null
  assessments: {
    id: string
    title: string
    subject: string
    status: JobStatus
    createdAt: string
    _count: { submissions: number }
  }[]
}

export interface StudentAnalytics {
  documentCount: number
  submissionCount: number
  gradedCount: number
  averageScorePct: number | null
  chatSessionCount: number
  artifactCount: number
  recentSubmissions: {
    id: string
    totalScore: number | null
    maxScore: number | null
    status: SubmissionStatus
    createdAt: string
    assessment: { title: string; subject: string }
  }[]
}

// ─── Roadmaps ────────────────────────────────────────────────────────────────

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

export interface RoadmapRecord {
  id: string
  title: string
  topic: string
  targetAudience?: string
  durationWeeks?: number
  status: JobStatus
  generatedAt?: string
  createdAt: string
  phases: RoadmapPhase[]
  enrollment?: RoadmapEnrollment
}

export interface RoadmapEnrollment {
  id: string
  status: string // PENDING | APPROVED | REJECTED
  completedTasks: string[]
  completedResources: string[]
  notes: { milestoneId: string; note: string }[]
  createdAt: string
}

// ─── Assessment enrollments ────────────────────────────────────────────────

export interface AssessmentEnrollment {
  id: string
  status: string // PENDING | APPROVED | REJECTED
  createdAt: string
}

export interface AssessmentRecord {
  id: string
  assignmentId: string
  title: string
  subject: string
  topic: string
  gradeLevel: string
  dueDate: string
  totalMarks: number
  duration?: string
  status: JobStatus
  generatedAt?: string
  createdAt: string
  ownerId?: string
  enrollment?: AssessmentEnrollment | null
}
