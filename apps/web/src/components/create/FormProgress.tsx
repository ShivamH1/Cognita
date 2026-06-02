"use client"
import React from "react"
import { useAssignmentStore } from "@/store/assignment.store"
import { FileText, Layers } from "lucide-react"
import { cn } from "@/lib/utils"

export function FormProgress() {
  const { currentStep, setField } = useAssignmentStore()

  const steps = [
    { id: 0, label: "General Details", desc: "Title, Subject, PDF upload", icon: FileText },
    { id: 1, label: "Exam Sections",   desc: "Question counts, difficulty mix", icon: Layers },
  ]

  return (
    <div className="flex items-center justify-center w-full max-w-lg mx-auto mb-10">
      {steps.map((step, idx) => {
        const Icon = step.icon
        const isActive = currentStep >= step.id
        const isCurrent = currentStep === step.id

        return (
          <React.Fragment key={step.id}>
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setField("currentStep", step.id)}>
              <div className={cn(
                "flex items-center justify-center w-10 h-10 rounded-xl border-2 transition-all duration-300",
                isActive
                  ? "border-brand-500 bg-brand-500/20 text-brand-300"
                  : "border-[var(--border)] bg-[var(--card-hi)] text-[var(--text-3)] group-hover:border-[var(--border-md)]",
                isCurrent && "scale-110 ring-4 ring-brand-500/10",
              )}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="text-left hidden sm:block">
                <p className={cn("text-xs font-bold", isActive ? "text-[var(--text)]" : "text-[var(--text-3)]")}>
                  {step.label}
                </p>
                <p className="text-[10px] text-[var(--text-3)] font-medium">{step.desc}</p>
              </div>
            </div>

            {idx < steps.length - 1 && (
              <div className="flex-1 mx-4 h-[2px] bg-[var(--border)] relative rounded-full overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full bg-brand-500 transition-all duration-500 ease-out"
                  style={{ width: currentStep > 0 ? "100%" : "0%" }}
                />
              </div>
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}
