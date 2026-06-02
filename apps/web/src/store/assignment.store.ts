import { create } from "zustand"
import type { AssignmentInput, SectionConfig } from "@/types"

interface AssignmentFormState {
  // Form fields
  title: string
  subject: string
  topic: string
  gradeLevel: string
  dueDate: string
  additionalInstructions: string
  sections: SectionConfig[]
  uploadedFile: File | null
  uploadedFileText: string
  documentId: string | null

  // UI state
  currentStep: number
  isSubmitting: boolean
  errors: Record<string, string>

  // Actions
  setField: <K extends keyof AssignmentFormState>(key: K, value: AssignmentFormState[K]) => void
  addSection: () => void
  updateSection: (index: number, updates: Partial<SectionConfig>) => void
  removeSection: (index: number) => void
  setUploadedFile: (file: File | null, text: string) => void
  validate: () => boolean
  reset: () => void
  getTotalMarks: () => number
}

const defaultSection: SectionConfig = {
  name: "A",
  questionType: "mcq",
  questionCount: 5,
  marksPerQuestion: 2,
  instructions: "Attempt all questions",
  difficultyMix: { easy: 33, medium: 34, hard: 33 },
}

export const useAssignmentStore = create<AssignmentFormState>()((set, get) => ({
  title: "",
  subject: "",
  topic: "",
  gradeLevel: "",
  dueDate: "",
  additionalInstructions: "",
  sections: [{ ...defaultSection }],
  uploadedFile: null,
  uploadedFileText: "",
  documentId: null,
  currentStep: 0,
  isSubmitting: false,
  errors: {},

  setField: (key, value) => set({ [key]: value }),

  addSection: () => set(state => {
    const nextName = String.fromCharCode(65 + state.sections.length)
    return { sections: [...state.sections, { ...defaultSection, name: nextName }] }
  }),

  updateSection: (index, updates) => set(state => ({
    sections: state.sections.map((s, i) => i === index ? { ...s, ...updates } : s)
  })),

  removeSection: (index) => set(state => {
    if (state.sections.length <= 1) return {} // Keep at least one section
    const newSections = state.sections.filter((_, i) => i !== index)
    // Re-index section names (A, B, C...)
    const reindexed = newSections.map((s, idx) => ({
      ...s,
      name: String.fromCharCode(65 + idx)
    }))
    return { sections: reindexed }
  }),

  setUploadedFile: (file, text) => set({ uploadedFile: file, uploadedFileText: text }),

  getTotalMarks: () => {
    const { sections } = get()
    return sections.reduce((sum, s) => sum + s.questionCount * s.marksPerQuestion, 0)
  },

  validate: () => {
    const state = get()
    const errors: Record<string, string> = {}

    if (!state.title.trim()) errors.title = "Title is required"
    if (!state.subject.trim()) errors.subject = "Subject is required"
    if (!state.topic.trim()) errors.topic = "Topic is required"
    if (!state.gradeLevel.trim()) errors.gradeLevel = "Grade level is required"
    if (!state.dueDate) errors.dueDate = "Due date is required"
    if (state.sections.length === 0) errors.sections = "At least one section required"

    state.sections.forEach((s, i) => {
      if (s.questionCount < 1) errors[`section_${i}_count`] = "Question count must be ≥ 1"
      if (s.marksPerQuestion < 1) errors[`section_${i}_marks`] = "Marks must be ≥ 1"
      const mixSum = s.difficultyMix.easy + s.difficultyMix.medium + s.difficultyMix.hard
      if (mixSum !== 100) errors[`section_${i}_mix`] = "Difficulty mix must sum to 100%"
    })

    set({ errors })
    return Object.keys(errors).length === 0
  },

  reset: () => set({
    title: "", subject: "", topic: "", gradeLevel: "", dueDate: "",
    additionalInstructions: "", sections: [{ ...defaultSection }],
    uploadedFile: null, uploadedFileText: "", documentId: null, currentStep: 0,
    isSubmitting: false, errors: {},
  }),
}))
