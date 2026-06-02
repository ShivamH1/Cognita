"use client"
import React from "react"
import { useRouter } from "next/navigation"
import { useAssignmentStore } from "@/store/assignment.store"
import { DocumentPicker } from "./DocumentPicker"
import { SectionConfig } from "./SectionConfig"
import { FormProgress } from "./FormProgress"
import { Card, Button, Input, Textarea, Label, Select } from "../ui"
import { useApi } from "@/lib/use-api"
import { useToast } from "@/components/ui/toast"
import { Plus, ArrowRight, ArrowLeft, Wand2, Calculator } from "lucide-react"

export function AssignmentForm() {
  const router = useRouter()
  const api = useApi()
  const { toast } = useToast()
  const store = useAssignmentStore()

  const {
    title, subject, topic, gradeLevel, dueDate, additionalInstructions,
    sections, documentId, currentStep, isSubmitting, errors,
    setField, addSection, validate, reset, getTotalMarks
  } = store

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (currentStep === 0) {
      handleNextStep()
      return
    }

    if (!validate()) {
      toast("Please fix the highlighted errors before generating.", "error")
      return
    }

    setField("isSubmitting", true)

    try {
      const response = await api.createAssignment({
        title,
        subject,
        topic,
        gradeLevel,
        dueDate: new Date(dueDate).toISOString(),
        sections,
        additionalInstructions,
        ...(documentId ? { documentId } : {}),
      })

      reset()
      router.push(`/assessment/${response.assignmentId}`)
    } catch (error) {
      toast((error as Error).message || "Failed to initiate generation.", "error")
      setField("isSubmitting", false)
    }
  }

  function handleNextStep() {
    // Validate Step 1 fields
    const stepErrors: Record<string, string> = {}
    if (!title.trim()) stepErrors.title = "Title is required"
    if (!subject.trim()) stepErrors.subject = "Subject is required"
    if (!topic.trim()) stepErrors.topic = "Topic is required"
    if (!gradeLevel.trim()) stepErrors.gradeLevel = "Grade level is required"
    if (!dueDate) stepErrors.dueDate = "Due date is required"

    setField("errors", stepErrors)

    if (Object.keys(stepErrors).length === 0) {
      setField("currentStep", 1)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl mx-auto pb-16">
      {/* Step Indicators */}
      <FormProgress />

      {/* STEP 1: GENERAL ASSIGNMENT INFO */}
      {currentStep === 0 && (
        <Card className="p-8 space-y-6">
          <div className="border-b border-[var(--border)] pb-4">
            <h2 className="font-display text-lg font-bold text-[var(--text)] tracking-wide">GENERAL INFORMATION</h2>
            <p className="text-xs text-[var(--text-3)] mt-1">Specify title, topic boundaries, and reference material.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Title */}
            <div className="sm:col-span-2">
              <Label htmlFor="title">Assignment Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setField("title", e.target.value)}
                placeholder="e.g. Final Semester Evaluation Paper"
                className={errors.title ? "border-red-300 focus:border-red-500 focus:ring-red-500/10" : ""}
              />
              {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
            </div>

            {/* Subject */}
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setField("subject", e.target.value)}
                placeholder="e.g. Science, Mathematics, History"
                className={errors.subject ? "border-red-300 focus:border-red-500 focus:ring-red-500/10" : ""}
              />
              {errors.subject && <p className="text-xs text-red-500 mt-1">{errors.subject}</p>}
            </div>

            {/* Topic */}
            <div>
              <Label htmlFor="topic">Topic / Chapter</Label>
              <Input
                id="topic"
                value={topic}
                onChange={(e) => setField("topic", e.target.value)}
                placeholder="e.g. Photosynthesis, Quadratic Equations"
                className={errors.topic ? "border-red-300 focus:border-red-500 focus:ring-red-500/10" : ""}
              />
              {errors.topic && <p className="text-xs text-red-500 mt-1">{errors.topic}</p>}
            </div>

            {/* Grade Level */}
            <div>
              <Label htmlFor="gradeLevel">Grade Level</Label>
              <Select
                id="gradeLevel"
                value={gradeLevel}
                onChange={(e) => setField("gradeLevel", e.target.value)}
                className={errors.gradeLevel ? "border-red-300" : ""}
              >
                <option value="">Select Target Grade</option>
                <option value="Grade 6">Grade 6</option>
                <option value="Grade 7">Grade 7</option>
                <option value="Grade 8">Grade 8</option>
                <option value="Grade 9">Grade 9</option>
                <option value="Grade 10">Grade 10</option>
                <option value="Grade 11">Grade 11</option>
                <option value="Grade 12">Grade 12</option>
                <option value="Undergraduate">Undergraduate</option>
                <option value="Postgraduate">Postgraduate</option>
              </Select>
              {errors.gradeLevel && <p className="text-xs text-red-500 mt-1">{errors.gradeLevel}</p>}
            </div>

            {/* Due Date */}
            <div>
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setField("dueDate", e.target.value)}
                className={errors.dueDate ? "border-red-300 focus:border-red-500 focus:ring-red-500/10" : ""}
              />
              {errors.dueDate && <p className="text-xs text-red-500 mt-1">{errors.dueDate}</p>}
            </div>
          </div>

          {/* Reference Material — ground generation in an uploaded document (RAG) */}
          <DocumentPicker />

          {/* Nav Controls */}
          <div className="flex justify-end pt-4 border-t border-[var(--border)]">
            <Button
              type="button"
              onClick={handleNextStep}
              className="flex items-center gap-1.5"
            >
              Configure Sections
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 2: CONFIG SECTIONS */}
      {currentStep === 1 && (
        <div className="space-y-6">
          {/* Header config summary card */}
          <Card className="p-6 bg-gradient-to-br from-brand-700 to-brand-900 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-none shadow-[var(--shadow-brand)] relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-violet-600/10 w-48 h-48 rounded-full blur-2xl pointer-events-none" />
            <div>
              <h2 className="text-base font-bold tracking-wider">ASSESSMENT METRICS SUMMARY</h2>
              <p className="text-xs text-slate-400 mt-0.5">Summary computed dynamically from configured sections.</p>
            </div>
            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm self-start sm:self-auto border border-white/5">
              <Calculator className="w-4 h-4 text-violet-400" />
              <span className="text-sm font-bold">Total Combined Marks:</span>
              <span className="text-lg font-black text-violet-300">{getTotalMarks()}</span>
            </div>
          </Card>

          {/* Sections mapping */}
          <div className="space-y-6">
            {sections.map((sec, idx) => (
              <SectionConfig key={sec.name} section={sec} index={idx} />
            ))}
          </div>

          {/* Add Section trigger */}
          <button
            type="button"
            onClick={addSection}
            className="w-full flex items-center justify-center gap-2 border border-dashed border-[var(--border-md)] hover:border-brand-500/50 bg-[var(--card)]/40 hover:bg-brand-500/5 p-4 rounded-2xl transition-all duration-300 cursor-pointer group"
          >
            <Plus className="w-5 h-5 text-[var(--text-3)] group-hover:text-brand-400 group-hover:rotate-90 transition-all duration-300" />
            <span className="text-sm font-bold text-[var(--text-2)] group-hover:text-brand-400">Add Next Section ({String.fromCharCode(65 + sections.length)})</span>
          </button>

          {/* Additional Instructions */}
          <Card className="p-6 space-y-3">
            <Label htmlFor="additionalInstructions">Additional General Instructions (Optional)</Label>
            <Textarea
              id="additionalInstructions"
              value={additionalInstructions}
              onChange={(e) => setField("additionalInstructions", e.target.value)}
              placeholder="e.g. Scientific calculators allowed. Write answers using blue ink only."
              rows={3}
            />
          </Card>

          {/* Step controls */}
          <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
            <Button
              type="button"
              variant="outline"
              onClick={() => setField("currentStep", 0)}
              className="flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              General Details
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 shadow-lg shadow-violet-500/20"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Queueing Job...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 text-violet-200" />
                  Generate Exam Paper
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </form>
  )
}
