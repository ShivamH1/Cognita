"use client"

import React, { Suspense, useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import ReactMarkdown from "react-markdown"
import { useApi, useApiToken } from "@/lib/use-api"
import { streamTutorMessage } from "@/lib/api"
import { useToast } from "@/components/ui/toast"
import { PageHeader } from "@/components/app-shell"
import {
  Button,
  Card,
  LoadingState,
  ErrorState,
  EmptyState,
  Select,
  Badge,
  Progress,
} from "@/components/ui"
import { Flashcard, FlashcardPlayer } from "@/components/study/flashcard"
import type { FlashcardsContent, StudyArtifact, SummaryContent, ChatMessage, ChatSource } from "@/types"
import {
  Sparkles,
  FileText,
  ListChecks,
  Layers,
  Loader2,
  Library,
  MessageSquareText,
  Send,
  Bot,
  User as UserIcon,
  Quote,
  Zap,
  Play,
  RefreshCw,
  LayoutGrid,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "summary" | "flashcards" | "chat"

type FlashcardMode =
  | { state: "empty" }
  | { state: "start"; setIdx: number }
  | { state: "playing"; setIdx: number }
  | { state: "done"; known: number; learning: number; xpEarned: number; setIdx: number }

interface LiveMessage extends ChatMessage {
  streaming?: boolean
}

// ─── Inner (needs useSearchParams) ──────────────────────────────────────────

function StudyInner() {
  const api = useApi()
  const token = useApiToken()
  const qc = useQueryClient()
  const router = useRouter()
  const { toast } = useToast()
  const params = useSearchParams()
  const documentId = params.get("documentId") ?? ""

  const [activeTab, setActiveTab] = useState<Tab>("summary")
  const [genSummary, setGenSummary] = useState(false)
  const [genCards, setGenCards] = useState(false)
  const [sessionXp, setSessionXp] = useState(0)
  const [flashMode, setFlashMode] = useState<FlashcardMode>({ state: "empty" })

  // ── Documents ──────────────────────────────────────────────────────────────
  const { data: docs = [] } = useQuery({
    queryKey: ["documents"],
    queryFn: () => api.listDocuments(),
    enabled: !!token,
  })
  const readyDocs = docs.filter((d) => d.status === "READY")

  // ── Study artifacts ────────────────────────────────────────────────────────
  const {
    data: artifacts,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["study", documentId],
    queryFn: () => api.listStudyArtifacts(documentId),
    enabled: !!token && !!documentId,
  })

  const summaries = (artifacts ?? []).filter((a) => a.type === "SUMMARY")
  const flashSets = (artifacts ?? []).filter((a) => a.type === "FLASHCARDS")

  // Reset flashcard mode when document changes
  useEffect(() => {
    setFlashMode({ state: "empty" })
    setSessionXp(0)
  }, [documentId])

  // ── Generate actions ───────────────────────────────────────────────────────
  async function makeSummary() {
    setGenSummary(true)
    try {
      await api.generateSummary(documentId)
      toast("Summary generated.", "success")
      qc.invalidateQueries({ queryKey: ["study", documentId] })
    } catch (e) {
      toast((e as Error).message || "Could not generate summary (LLM may be unavailable).", "error")
    } finally {
      setGenSummary(false)
    }
  }

  async function makeFlashcards() {
    setGenCards(true)
    try {
      await api.generateFlashcards(documentId, 10)
      toast("Flashcards generated.", "success")
      qc.invalidateQueries({ queryKey: ["study", documentId] })
    } catch (e) {
      toast((e as Error).message || "Could not generate flashcards (LLM may be unavailable).", "error")
    } finally {
      setGenCards(false)
    }
  }

  // ── Tabs ───────────────────────────────────────────────────────────────────
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "summary", label: "Summary", icon: <ListChecks className="w-4 h-4" /> },
    { id: "flashcards", label: "Flashcards", icon: <Layers className="w-4 h-4" /> },
    { id: "chat", label: "Chat", icon: <MessageSquareText className="w-4 h-4" /> },
  ]

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 lg:py-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <PageHeader
          icon={<Sparkles className="w-5 h-5" />}
          title="Study Aids"
          subtitle="Generate AI summaries and flashcards from your documents."
        />
        {sessionXp > 0 && (
          <Badge variant="xp" className="mt-1 text-sm px-3 py-1 glow-xp">
            <Zap className="w-3.5 h-3.5" />
            {sessionXp} XP
          </Badge>
        )}
      </div>

      {/* Document selector */}
      <Card className="p-5 mb-5">
        <label className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wide mb-1.5 block">
          Document
        </label>
        {readyDocs.length === 0 ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-[var(--text-3)]">No processed documents yet.</p>
            <Link href="/library">
              <Button variant="outline" size="sm">
                <Library className="w-4 h-4" /> Upload
              </Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3">
            <Select
              value={documentId}
              onChange={(e) => router.replace(`/study?documentId=${e.target.value}`)}
              className="flex-1"
            >
              <option value="">Select a document…</option>
              {readyDocs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.filename}
                </option>
              ))}
            </Select>
            {documentId && (
              <div className="flex gap-2">
                <Button onClick={makeSummary} disabled={genSummary} variant="outline" size="sm">
                  {genSummary ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ListChecks className="w-3.5 h-3.5" />
                  )}
                  + Summary
                </Button>
                <Button onClick={makeFlashcards} disabled={genCards} variant="outline" size="sm">
                  {genCards ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Layers className="w-3.5 h-3.5" />
                  )}
                  + Flashcards
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Tabs */}
      {documentId && (
        <div className="flex gap-1 glass rounded-2xl p-1 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer",
                activeTab === tab.id
                  ? "bg-[var(--card-hi)] text-[var(--text)] shadow-sm border border-[var(--border-md)]"
                  : "text-[var(--text-3)] hover:text-[var(--text-2)] hover:bg-[var(--card-hi)]/50",
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {!documentId ? (
        <Card className="p-2">
          <EmptyState
            icon={<FileText className="w-6 h-6" />}
            title="Choose a document"
            description="Select a processed document above to generate and view study aids."
          />
        </Card>
      ) : isLoading ? (
        <LoadingState label="Loading study aids…" />
      ) : isError ? (
        <ErrorState message="Could not load study aids." retry={() => refetch()} />
      ) : activeTab === "summary" ? (
        <SummaryTab summaries={summaries} onGenerate={makeSummary} generating={genSummary} />
      ) : activeTab === "flashcards" ? (
        <FlashcardsTab
          flashSets={flashSets}
          mode={flashMode}
          setMode={setFlashMode}
          onGenerate={makeFlashcards}
          generating={genCards}
          onXpEarned={(xp) => setSessionXp((prev) => prev + xp)}
        />
      ) : (
        <ChatTab documentId={documentId} token={token} api={api} />
      )}
    </div>
  )
}

// ─── Summary Tab ──────────────────────────────────────────────────────────────

function SummaryTab({
  summaries,
  onGenerate,
  generating,
}: {
  summaries: StudyArtifact[]
  onGenerate: () => void
  generating: boolean
}) {
  if (summaries.length === 0) {
    return (
      <Card className="p-2">
        <EmptyState
          icon={<ListChecks className="w-6 h-6" />}
          title="No summaries yet"
          description="Generate a summary for this document to review key ideas."
          action={
            <Button onClick={onGenerate} disabled={generating}>
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Generate Summary
            </Button>
          }
        />
      </Card>
    )
  }

  return (
    <div className="space-y-6 animate-slideUp">
      {summaries.map((a) => (
        <SummaryView key={a.id} artifact={a} />
      ))}
    </div>
  )
}

function SummaryView({ artifact }: { artifact: StudyArtifact }) {
  const content = artifact.content as SummaryContent
  return (
    <Card className="p-6">
      <h3 className="font-display text-lg font-bold text-[var(--text)] mb-3 flex items-center gap-2">
        <ListChecks className="w-5 h-5 text-brand-400" /> Summary
      </h3>
      <p className="text-sm text-[var(--text-2)] leading-relaxed whitespace-pre-wrap">{content.summary}</p>
      {content.keyPoints && content.keyPoints.length > 0 && (
        <div className="mt-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-3)] mb-3">
            Key points
          </p>
          <ul className="space-y-2.5">
            {content.keyPoints.map((kp, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-[var(--text-2)]">
                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-brand-400 flex-shrink-0" />
                <span>{kp}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}

// ─── Flashcards Tab ───────────────────────────────────────────────────────────

function FlashcardsTab({
  flashSets,
  mode,
  setMode,
  onGenerate,
  generating,
  onXpEarned,
}: {
  flashSets: StudyArtifact[]
  mode: FlashcardMode
  setMode: (m: FlashcardMode) => void
  onGenerate: () => void
  generating: boolean
  onXpEarned: (xp: number) => void
}) {
  // No sets at all
  if (flashSets.length === 0) {
    return (
      <Card className="p-2">
        <EmptyState
          icon={<Layers className="w-6 h-6" />}
          title="No flashcards yet"
          description="Generate a set of flashcards to start studying with spaced repetition."
          action={
            <Button onClick={onGenerate} disabled={generating}>
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Generate Flashcards
            </Button>
          }
        />
      </Card>
    )
  }

  const activeSet = flashSets[mode.state !== "empty" ? (mode as { setIdx: number }).setIdx ?? 0 : 0]
  const cards = activeSet ? ((activeSet.content as FlashcardsContent).cards ?? []) : []

  // Playing
  if (mode.state === "playing") {
    return (
      <div className="animate-scaleIn">
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={() => setMode({ state: "start", setIdx: (mode as { setIdx: number }).setIdx })}
            className="text-[var(--text-3)] hover:text-[var(--text-2)] text-sm flex items-center gap-1 transition-colors cursor-pointer"
          >
            ← Back to deck
          </button>
          <Badge variant="brand">
            <Layers className="w-3 h-3" />
            {cards.length} cards
          </Badge>
        </div>
        <FlashcardPlayer
          cards={cards}
          onComplete={(stats) => {
            onXpEarned(stats.xpEarned)
            setMode({ state: "done", ...stats, setIdx: (mode as { setIdx: number }).setIdx })
          }}
        />
      </div>
    )
  }

  // Done
  if (mode.state === "done") {
    const { known, learning, xpEarned, setIdx } = mode as {
      known: number
      learning: number
      xpEarned: number
      setIdx: number
    }
    return (
      <div className="animate-slideUp space-y-4">
        <Card className="p-6 text-center">
          <p className="font-display text-xl font-black text-[var(--text)] mb-1">Session Stats</p>
          <div className="flex justify-center gap-6 mt-4 mb-6">
            <div>
              <p className="text-2xl font-black text-emerald-400">{known}</p>
              <p className="text-[10px] uppercase tracking-widest text-[var(--text-3)]">Known</p>
            </div>
            <div>
              <p className="text-2xl font-black text-rose-400">{learning}</p>
              <p className="text-[10px] uppercase tracking-widest text-[var(--text-3)]">Learning</p>
            </div>
            <div>
              <p className="text-2xl font-black text-xp-400">{xpEarned}</p>
              <p className="text-[10px] uppercase tracking-widest text-[var(--text-3)]">XP Earned</p>
            </div>
          </div>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => setMode({ state: "playing", setIdx })} size="sm">
              <RefreshCw className="w-3.5 h-3.5" />
              Review again
            </Button>
            <Button variant="outline" onClick={() => setMode({ state: "start", setIdx })} size="sm">
              <LayoutGrid className="w-3.5 h-3.5" />
              Back to grid
            </Button>
          </div>
        </Card>

        {/* Preview grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((c, i) => (
            <Flashcard key={i} card={c} index={i} />
          ))}
        </div>
      </div>
    )
  }

  // Start screen (state === "start" or "empty" with sets available)
  const setIdx = mode.state === "start" ? (mode as { setIdx: number }).setIdx : 0

  return (
    <div className="animate-slideUp space-y-6">
      {/* Deck selector when multiple sets */}
      {flashSets.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {flashSets.map((set, i) => {
            const count = ((set.content as FlashcardsContent).cards ?? []).length
            return (
              <button
                key={set.id}
                type="button"
                onClick={() => setMode({ state: "start", setIdx: i })}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer",
                  setIdx === i
                    ? "bg-brand-600 text-white border-brand-500"
                    : "glass border-[var(--border)] text-[var(--text-2)] hover:border-brand-500/40",
                )}
              >
                Set {i + 1} · {count} cards
              </button>
            )
          })}
        </div>
      )}

      {/* Start card */}
      <Card className="p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-brand-600/20 text-brand-400 border border-brand-500/20 flex items-center justify-center mx-auto mb-4">
          <Layers className="w-8 h-8" />
        </div>
        <h3 className="font-display text-2xl font-black text-[var(--text)] mb-1">
          {cards.length} Flashcards
        </h3>
        <p className="text-[var(--text-3)] text-sm mb-6">
          Flip, rate yourself, and earn XP for every card you master.
        </p>

        {/* Preview: first 3 cards face-down */}
        <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto mb-8">
          {cards.slice(0, 3).map((_, i) => (
            <div
              key={i}
              className="glass-strong rounded-xl flex flex-col items-center justify-center py-6 px-3 border border-brand-500/20"
            >
              <div className="w-8 h-1 rounded-full bg-brand-500/30 mb-2" />
              <div className="w-6 h-1 rounded-full bg-brand-500/20" />
            </div>
          ))}
        </div>

        <Button
          size="lg"
          onClick={() => setMode({ state: "playing", setIdx })}
          className="gap-2 glow-brand"
        >
          <Play className="w-5 h-5" />
          Start Study Session
        </Button>
      </Card>

      {/* Card grid preview */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-3)] mb-3">
          Card Preview
        </h4>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((c, i) => (
            <Flashcard key={i} card={c} index={i} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Chat Tab ─────────────────────────────────────────────────────────────────

function ChatTab({
  documentId,
  token,
  api,
}: {
  documentId: string
  token: string | undefined
  api: ReturnType<typeof useApi>
}) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<LiveMessage[]>([])
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const [bootError, setBootError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const abortRef = useRef<(() => void) | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Boot: find or create session
  useEffect(() => {
    if (!token || !documentId) return
    let active = true

    async function boot() {
      setLoading(true)
      setBootError(null)
      setMessages([])
      setSessionId(null)
      try {
        const existing = await api.listTutorSessions(documentId)
        let session = existing[0]
        if (!session) session = await api.createTutorSession(documentId)
        if (!active) return
        setSessionId(session.id)
        const msgs = await api.getMessages(session.id)
        if (!active) return
        setMessages(msgs as LiveMessage[])
      } catch (e) {
        if (active) setBootError((e as Error).message || "Failed to start tutor session.")
      } finally {
        if (active) setLoading(false)
      }
    }

    boot()
    return () => {
      active = false
      abortRef.current?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, documentId])

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages])

  const send = useCallback(() => {
    const content = input.trim()
    if (!content || !sessionId || streaming) return
    setInput("")

    const userMsg: LiveMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    }
    const assistantId = `a-${Date.now()}`
    const assistantMsg: LiveMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      sources: [],
      createdAt: new Date().toISOString(),
      streaming: true,
    }
    setMessages((m) => [...m, userMsg, assistantMsg])
    setStreaming(true)

    const patch = (fn: (prev: LiveMessage) => LiveMessage) =>
      setMessages((m) => m.map((msg) => (msg.id === assistantId ? fn(msg) : msg)))

    abortRef.current = streamTutorMessage(token, sessionId, content, {
      onSources: (sources: ChatSource[]) => patch((p) => ({ ...p, sources })),
      onToken: (tok: string) => patch((p) => ({ ...p, content: p.content + tok })),
      onDone: () => {
        patch((p) => ({ ...p, streaming: false }))
        setStreaming(false)
      },
      onError: (msg: string) => {
        patch((p) => ({
          ...p,
          streaming: false,
          content:
            p.content ||
            `The tutor could not answer right now: ${msg}. Please try again later.`,
        }))
        setStreaming(false)
      },
    })
  }, [input, sessionId, streaming, token])

  if (loading) return <LoadingState label="Starting tutor session…" />
  if (bootError) return <ErrorState message={bootError} />

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 22rem)", minHeight: "480px" }}>
      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto scrollbar-thin pr-1 space-y-5 mb-4 animate-slideUp"
      >
        {messages.length === 0 && (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-brand-500/10 text-brand-400 border border-brand-500/20 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-7 h-7" />
            </div>
            <h3 className="font-display text-lg font-bold text-[var(--text)]">
              Ask anything about this document
            </h3>
            <p className="text-sm text-[var(--text-3)] mt-1">
              Try "Summarise the key ideas" or "Explain section 2 in simple terms".
            </p>
          </div>
        )}
        {messages.map((m) => (
          <ChatBubble key={m.id} message={m} />
        ))}
      </div>

      {/* Input */}
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          placeholder="Ask a question about this document…"
          disabled={streaming}
          className={cn(
            "flex-1 rounded-xl px-4 py-3 text-sm transition-all duration-200",
            "bg-[var(--input-bg)] border border-[var(--border)] text-[var(--text)]",
            "placeholder:text-[var(--text-3)]",
            "focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 focus:outline-none",
            "hover:border-[var(--border-md)]",
          )}
        />
        <Button
          type="submit"
          disabled={streaming || !input.trim()}
          className="flex-shrink-0 h-11 w-11 p-0"
        >
          {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </form>
    </div>
  )
}

function ChatBubble({ message }: { message: LiveMessage }) {
  const isUser = message.role === "user"
  return (
    <div className={cn("flex gap-3 animate-slideUp", isUser ? "flex-row-reverse" : "flex-row")}>
      <div
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
          isUser ? "bg-brand-600/20 text-brand-400 border border-brand-500/20" : "bg-brand-600 text-white",
        )}
      >
        {isUser ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>
      <div className={cn("min-w-0 max-w-[85%]", isUser && "items-end flex flex-col")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "bg-gradient-to-br from-brand-600 to-brand-700 text-white rounded-tr-sm"
              : "glass-strong text-[var(--text)] rounded-tl-sm",
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : message.content ? (
            <div className="prose prose-sm max-w-none prose-invert prose-p:my-1.5 prose-headings:my-2 prose-headings:text-[var(--text)] prose-p:text-[var(--text-2)] prose-li:text-[var(--text-2)] prose-strong:text-[var(--text)] prose-code:text-brand-300">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          ) : message.streaming ? (
            <span className="inline-flex gap-1 items-center">
              <span className="w-2 h-2 rounded-full bg-brand-400 animate-bounce [animation-delay:-0.2s]" />
              <span className="w-2 h-2 rounded-full bg-brand-400 animate-bounce [animation-delay:-0.1s]" />
              <span className="w-2 h-2 rounded-full bg-brand-400 animate-bounce" />
            </span>
          ) : null}
        </div>

        {/* Citation chips */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {message.sources.map((s, i) => (
              <span
                key={i}
                title={s.snippet}
                className="inline-flex items-center gap-1 max-w-[16rem] truncate rounded-full bg-brand-500/10 border border-brand-500/20 px-2.5 py-1 text-[11px] font-medium text-brand-300"
              >
                <Quote className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">
                  #{s.chunkIndex + 1} · {s.snippet}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Page shell ───────────────────────────────────────────────────────────────

export default function StudyPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading…" />}>
      <StudyInner />
    </Suspense>
  )
}
