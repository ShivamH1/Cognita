"use client"
import React from "react"
import type { SectionConfig as TSectionConfig } from "@/types"
import { useAssignmentStore } from "@/store/assignment.store"
import { QuestionTypeSelector } from "./QuestionTypeSelector"
import { Trash2, Plus, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

const inputCls = [
  "flex w-full rounded-xl border border-[var(--border)] bg-[var(--input-bg)]",
  "px-3.5 py-2.5 text-sm text-[var(--text)]",
  "focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 focus:outline-none",
  "hover:border-[var(--border-md)] transition-all duration-200",
].join(" ")

interface SectionConfigProps {
  section: TSectionConfig
  index: number
}

export function SectionConfig({ section, index }: SectionConfigProps) {
  const { updateSection, removeSection, sections } = useAssignmentStore()

  const mix = section.difficultyMix
  const mixSum = mix.easy + mix.medium + mix.hard
  const isMixValid = mixSum === 100

  function handleMixChange(field: "easy" | "medium" | "hard", value: number) {
    const val = isNaN(value) ? 0 : Math.max(0, Math.min(100, value))
    updateSection(index, { difficultyMix: { ...mix, [field]: val } })
  }

  function equalizeMix() {
    updateSection(index, { difficultyMix: { easy: 33, medium: 34, hard: 33 } })
  }

  return (
    <div className="border border-[var(--border)] bg-[var(--card)] rounded-2xl p-6 space-y-5 transition-all duration-300 relative hover:border-[var(--border-md)] animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center bg-brand-500/20 text-brand-300 font-bold text-sm w-6 h-6 rounded-lg border border-brand-500/20">
            {section.name}
          </span>
          <h3 className="font-bold text-[var(--text)] text-sm tracking-wide">SECTION CONFIGURATION</h3>
        </div>

        {sections.length > 1 && (
          <button
            type="button"
            onClick={() => removeSection(index)}
            className="text-[var(--text-3)] hover:text-rose-400 hover:bg-rose-500/10 p-2 rounded-xl transition-all duration-200 cursor-pointer"
            title="Remove Section"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Question Type */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-[var(--text-2)] uppercase tracking-wider block">
          Question Type
        </label>
        <QuestionTypeSelector
          value={section.questionType}
          onChange={(type) => updateSection(index, { questionType: type })}
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-xs font-semibold text-[var(--text-2)] uppercase tracking-wider block mb-1.5">
            Number of Questions
          </label>
          <input
            type="number"
            min={1}
            max={50}
            value={section.questionCount}
            onChange={(e) => updateSection(index, { questionCount: parseInt(e.target.value) || 1 })}
            className={inputCls}
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-[var(--text-2)] uppercase tracking-wider block mb-1.5">
            Marks Per Question
          </label>
          <input
            type="number"
            min={1}
            value={section.marksPerQuestion}
            onChange={(e) => updateSection(index, { marksPerQuestion: parseInt(e.target.value) || 1 })}
            className={inputCls}
          />
        </div>

        <div className="flex flex-col justify-end bg-[var(--card-hi)] border border-[var(--border)] p-3 rounded-xl">
          <p className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider">Estimated Total</p>
          <p className="font-display text-2xl font-black text-[var(--text)] mt-1">
            {section.questionCount * section.marksPerQuestion}{" "}
            <span className="text-xs font-medium text-[var(--text-3)]">marks</span>
          </p>
        </div>
      </div>

      {/* Instructions */}
      <div>
        <label className="text-xs font-semibold text-[var(--text-2)] uppercase tracking-wider block mb-1.5">
          Section Instructions
        </label>
        <input
          type="text"
          value={section.instructions}
          onChange={(e) => updateSection(index, { instructions: e.target.value })}
          placeholder="e.g. Attempt all questions. Show working details where applicable."
          className={inputCls}
        />
      </div>

      {/* Difficulty Mix */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wider">
              Difficulty Mix Ratio
            </label>
            <span className={cn(
              "text-xs font-semibold px-2 py-0.5 rounded border",
              isMixValid
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse",
            )}>
              {mixSum}%
            </span>
          </div>
          <button
            type="button"
            onClick={equalizeMix}
            className="text-[11px] font-bold text-brand-400 hover:text-brand-300 flex items-center gap-1 cursor-pointer bg-[var(--card-hi)] px-2 py-1 rounded-lg border border-[var(--border)]"
          >
            <Sparkles className="w-3 h-3" />
            Equalize (33/34/33)
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { key: "easy" as const, label: "Easy", color: "emerald" },
            { key: "medium" as const, label: "Medium", color: "amber" },
            { key: "hard" as const, label: "Hard", color: "rose" },
          ].map(({ key, label, color }) => (
            <div key={key}>
              <span className={`text-[10px] font-bold text-${color}-400 uppercase block mb-1`}>{label} (%)</span>
              <input
                type="number"
                min={0}
                max={100}
                value={mix[key]}
                onChange={(e) => handleMixChange(key, parseInt(e.target.value) || 0)}
                className={cn(inputCls, "text-center")}
              />
            </div>
          ))}
        </div>

        <div className="w-full h-2 rounded-full overflow-hidden bg-[var(--card-hi)] flex">
          <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${isMixValid ? mix.easy : (mix.easy / mixSum) * 100}%` }} />
          <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${isMixValid ? mix.medium : (mix.medium / mixSum) * 100}%` }} />
          <div className="h-full bg-rose-500 transition-all duration-300" style={{ width: `${isMixValid ? mix.hard : (mix.hard / mixSum) * 100}%` }} />
        </div>

        {!isMixValid && (
          <p className="text-[10px] text-rose-400 font-medium">
            * Sum must equal exactly 100%. Current sum: {mixSum}%
          </p>
        )}
      </div>
    </div>
  )
}
