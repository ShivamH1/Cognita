import React from "react"

export function StudentInfoSection() {
  return (
    <div className="px-8 py-5 bg-[var(--surface)] border-b border-[var(--border)] print:bg-transparent print:border-slate-300">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { label: "Student Name:", placeholder: "Enter candidate name" },
          { label: "Roll Number:", placeholder: "Enter roll number" },
          { label: "Class Section:", placeholder: "Enter section" },
        ].map(({ label, placeholder }) => (
          <div key={label} className="flex items-end gap-2">
            <span className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider whitespace-nowrap print:text-slate-700">
              {label}
            </span>
            <input
              type="text"
              placeholder={placeholder}
              className="flex-1 min-w-0 border-b border-dashed border-[var(--border-md)] bg-transparent px-1 pb-0.5 text-sm text-[var(--text)] focus:border-brand-500 focus:outline-none transition-colors placeholder:text-[var(--text-3)] print:placeholder:text-transparent print:border-slate-800"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
