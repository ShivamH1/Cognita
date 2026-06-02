"use client"

import React from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { useAssignmentStore } from "@/store/assignment.store"
import { useApi } from "@/lib/use-api"
import { useApiToken } from "@/lib/use-api"
import { FileText, Check, BookOpen, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { Label } from "../ui"

export function DocumentPicker() {
  const api = useApi()
  const token = useApiToken()
  const { documentId, setField } = useAssignmentStore()

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: () => api.listDocuments(),
    enabled: !!token,
  })

  const ready = docs.filter((d) => d.status === "READY")

  return (
    <div className="space-y-2">
      <Label>Ground in a Document (Optional · RAG)</Label>
      {isLoading ? (
        <div className="h-16 rounded-xl skeleton" />
      ) : ready.length === 0 ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-[var(--border-md)] bg-[var(--card-hi)] px-4 py-4">
          <p className="text-sm text-[var(--text-2)]">
            No processed documents yet. Upload one to ground generation in your material.
          </p>
          <Link
            href="/library"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-400 hover:text-brand-300 whitespace-nowrap"
          >
            <ExternalLink className="w-4 h-4" /> Upload
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setField("documentId", null)}
            className={cn(
              "flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all",
              documentId === null
                ? "border-brand-500/40 bg-brand-500/10 ring-1 ring-brand-500/20"
                : "border-[var(--border)] hover:border-[var(--border-md)] bg-[var(--card-hi)]",
            )}
          >
            <BookOpen className="w-5 h-5 text-[var(--text-3)] flex-shrink-0" />
            <span className="text-sm font-semibold text-[var(--text-2)]">No document (topic only)</span>
            {documentId === null && <Check className="w-4 h-4 text-brand-400 ml-auto" />}
          </button>

          {ready.map((doc) => {
            const selected = documentId === doc.id
            return (
              <button
                key={doc.id}
                type="button"
                onClick={() => setField("documentId", doc.id)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all min-w-0",
                  selected
                    ? "border-brand-500/40 bg-brand-500/10 ring-1 ring-brand-500/20"
                    : "border-[var(--border)] hover:border-[var(--border-md)] bg-[var(--card-hi)]",
                )}
              >
                <FileText className="w-5 h-5 text-brand-400 flex-shrink-0" />
                <span className="text-sm font-semibold text-[var(--text-2)] truncate flex-1">
                  {doc.filename}
                </span>
                {selected && <Check className="w-4 h-4 text-brand-400 flex-shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
