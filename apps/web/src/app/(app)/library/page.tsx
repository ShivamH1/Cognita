"use client"

import React, { useRef, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useApi, useApiToken } from "@/lib/use-api"
import { useToast } from "@/components/ui/toast"
import { StatusBadge } from "@/components/status-badge"
import { Button, Card, LoadingState, ErrorState, EmptyState, ConfirmModal } from "@/components/ui"
import { formatDate } from "@/lib/utils"
import type { DocumentItem } from "@/types"
import {
  Library as LibraryIcon,
  UploadCloud,
  FileText,
  Trash2,
  MessageSquareText,
  Sparkles,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"

export default function LibraryPage() {
  const api = useApi()
  const token = useApiToken()
  const { data: session } = useSession()
  const isStudent = session?.user?.role !== "TEACHER"
  const qc = useQueryClient()
  const { toast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  const { data: docs, isLoading, isError, refetch } = useQuery({
    queryKey: ["documents"],
    queryFn: () => api.listDocuments(),
    enabled: !!token,
    refetchInterval: (q) => {
      const list = q.state.data as DocumentItem[] | undefined
      return list?.some((d) => d.status === "PROCESSING") ? 3000 : false
    },
  })

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const file = files[0]
    const ok = ["application/pdf", "text/plain"].includes(file.type) || /\.(pdf|txt|md)$/i.test(file.name)
    if (!ok) {
      toast("Unsupported file. Please upload a PDF or text file.", "error")
      return
    }
    setUploading(true)
    try {
      await api.uploadDocument(file)
      toast(`"${file.name}" uploaded — processing started.`, "success")
      qc.invalidateQueries({ queryKey: ["documents"] })
    } catch (e) {
      toast((e as Error).message || "Upload failed.", "error")
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(deleteTarget.id)
    try {
      await api.deleteDocument(deleteTarget.id)
      toast("Document deleted.", "success")
      qc.invalidateQueries({ queryKey: ["documents"] })
      setDeleteTarget(null)
    } catch (e) {
      toast((e as Error).message || "Delete failed.", "error")
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 lg:py-10 animate-fadeIn">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-500 text-white flex items-center justify-center flex-shrink-0 shadow-[var(--shadow-brand)]">
            <LibraryIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-[var(--text)]">
              {isStudent ? "Library" : "Documents"}
            </h1>
            <p className="text-sm text-[var(--text-3)] mt-1">
              Upload PDFs or notes. Cognita indexes them for tutoring, study aids and grounded generation.
            </p>
          </div>
        </div>
      </div>

      {/* Dropzone */}
      <div
        onDragEnter={(e) => {
          e.preventDefault()
          setDragActive(true)
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragActive(false)
          handleFiles(e.dataTransfer.files)
        }}
        onClick={() => !uploading && inputRef.current?.click()}
        className={cn(
          "glass-strong flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-all duration-300 mb-8",
          dragActive
            ? "border-brand-500/70 bg-brand-500/5 scale-[0.99] shadow-[var(--glow-brand)]"
            : "border-[var(--border-md)] hover:border-brand-500/50 hover:bg-brand-500/5",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,.md"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-500 text-white flex items-center justify-center mb-4 shadow-[var(--shadow-brand)]">
          {uploading ? <Loader2 className="w-7 h-7 animate-spin" /> : <UploadCloud className="w-7 h-7" />}
        </div>
        <p className="font-semibold text-[var(--text)]">
          {uploading ? "Uploading…" : "Drag & drop a file, or click to browse"}
        </p>
        <p className="text-xs text-[var(--text-3)] mt-1">PDF or text · up to 100MB</p>
      </div>

      {/* Document list */}
      {isLoading ? (
        <LoadingState label="Loading documents…" />
      ) : isError ? (
        <ErrorState message="Could not load your documents." retry={() => refetch()} />
      ) : !docs || docs.length === 0 ? (
        <div className="glass-strong rounded-2xl border border-[var(--border)]">
          <EmptyState
            icon={<FileText className="w-6 h-6" />}
            title="No documents yet"
            description="Upload your first PDF or text file to start learning with Cognita. Your AI tutor is waiting."
          />
        </div>
      ) : (
        <div className="space-y-3 animate-slideUp">
          {docs.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              isStudent={isStudent}
              deleting={deleting}
              onDelete={(id, name) => setDeleteTarget({ id, name })}
            />
          ))}
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete document?"
        description={`"${deleteTarget?.name}" will be permanently removed along with its index and any tutor history.`}
        confirmLabel="Delete"
        loading={!!deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

function DocumentCard({
  doc,
  isStudent,
  deleting,
  onDelete,
}: {
  doc: DocumentItem
  isStudent: boolean
  deleting: string | null
  onDelete: (id: string, name: string) => void
}) {
  const isProcessing = doc.status === "PROCESSING"
  const isReady = doc.status === "READY"

  return (
    <div className="glass rounded-2xl border border-[var(--border)] p-4 flex items-center gap-4 transition-all duration-200 hover:border-[var(--border-md)]">
      {/* File icon bubble */}
      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 text-white flex items-center justify-center flex-shrink-0 shadow-[var(--shadow-brand)]">
        <FileText className="w-5 h-5" />
      </div>

      {/* Meta */}
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-[var(--text)] truncate">{doc.filename}</p>
        <p className="text-xs text-[var(--text-3)] mt-0.5">
          {formatDate(doc.createdAt)}
          {isReady && doc.chunkCount > 0 ? ` · ${doc.chunkCount} chunks` : ""}
        </p>
      </div>

      {/* Status */}
      <StatusBadge status={doc.status} />

      {/* Actions */}
      <div className="flex items-center gap-1.5">
        {isProcessing ? (
          /* Pulsing processing indicator */
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
            <span className="text-xs font-medium text-amber-400">Processing…</span>
          </div>
        ) : (
          isReady && isStudent && (
            <>
              <Link href={`/tutor/${doc.id}`}>
                <Button
                  variant="primary"
                  size="sm"
                  className="hover:shadow-[var(--shadow-brand)] transition-shadow"
                >
                  <MessageSquareText className="w-4 h-4" />
                  Chat
                </Button>
              </Link>
              <Link href={`/study?documentId=${doc.id}`}>
                <Button variant="outline" size="sm">
                  <Sparkles className="w-4 h-4" />
                  Study
                </Button>
              </Link>
            </>
          )
        )}

        {/* Delete */}
        <button
          onClick={() => onDelete(doc.id, doc.filename)}
          disabled={deleting === doc.id}
          className="p-2 rounded-lg text-[var(--text-3)] hover:bg-rose-500/10 hover:text-rose-500 transition-colors cursor-pointer disabled:opacity-50 ml-1"
          aria-label="Delete document"
        >
          {deleting === doc.id ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  )
}
