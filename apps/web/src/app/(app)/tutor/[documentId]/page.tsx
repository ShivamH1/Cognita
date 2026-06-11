"use client"

import React, { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import ReactMarkdown from "react-markdown"
import { useApi, useApiToken } from "@/lib/use-api"
import { streamTutorMessage } from "@/lib/api"
import { Button, Input, LoadingState, ErrorState } from "@/components/ui"
import { cn } from "@/lib/utils"
import type { ChatMessage, ChatSource, DocumentItem } from "@/types"
import {
  MessageSquareText,
  Send,
  ArrowLeft,
  Quote,
  Bot,
  User as UserIcon,
  Loader2,
  Sparkles,
} from "lucide-react"

interface LiveMessage extends ChatMessage {
  streaming?: boolean
}

const SUGGESTIONS = [
  "Summarise the key ideas",
  "What are the main topics covered?",
  "Explain the most important concept simply",
]

export default function TutorPage() {
  const { documentId } = useParams<{ documentId: string }>()
  const api = useApi()
  const token = useApiToken()

  const [doc, setDoc] = useState<DocumentItem | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<LiveMessage[]>([])
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const [bootError, setBootError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const abortRef = useRef<(() => void) | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Boot: load document, find/create a chat session, load its messages.
  useEffect(() => {
    if (!token || !documentId) return
    let active = true

    async function boot() {
      setLoading(true)
      setBootError(null)
      try {
        const d = await api.getDocument(documentId)
        if (!active) return
        setDoc(d)

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

  // Auto-scroll on new content.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages])

  function send() {
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
            `⚠️ The tutor could not answer right now: ${msg}. Please try again later.`,
        }))
        setStreaming(false)
      },
    })
  }

  if (loading) return <LoadingState label="Starting tutor session…" />
  if (bootError)
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <ErrorState message={bootError} />
        <div className="text-center mt-4">
          <Link href="/library">
            <Button variant="outline">Back to library</Button>
          </Link>
        </div>
      </div>
    )

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] lg:h-screen bg-[var(--bg)]">
      {/* Header */}
      <div className="glass-strong flex items-center gap-3 px-4 sm:px-8 py-4 border-b border-[var(--border)] flex-shrink-0">
        <Link
          href="/library"
          className="text-[var(--text-3)] hover:text-[var(--text)] transition-colors p-1.5 rounded-lg hover:bg-[var(--card-hi)]"
          aria-label="Back to library"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 text-white flex items-center justify-center flex-shrink-0 shadow-[var(--shadow-brand)]">
          <MessageSquareText className="w-[18px] h-[18px]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-[var(--text)] truncate font-display">{doc?.filename ?? "Tutor"}</p>
          <p className="text-xs text-[var(--text-3)]">Chat with your document — answers cite the source.</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-4 sm:px-8 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-12 animate-fadeIn">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-500 text-white flex items-center justify-center mx-auto mb-5 shadow-[var(--shadow-brand)]">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="font-display text-xl font-bold text-[var(--text)] mb-2">
                Ask anything about this document
              </h3>
              <p className="text-sm text-[var(--text-3)] mb-6">
                Your AI tutor has read every page — get cited, grounded answers instantly.
              </p>
              {/* Suggestion chips */}
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="px-4 py-2 rounded-full text-sm font-medium bg-brand-500/10 text-brand-300 border border-brand-500/20 hover:bg-brand-500/20 hover:border-brand-500/40 hover:text-brand-200 transition-all duration-200 cursor-pointer"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
        </div>
      </div>

      {/* Composer */}
      <div className="glass-strong border-t border-[var(--border)] px-4 sm:px-8 py-4 flex-shrink-0">
        <form
          className="max-w-3xl mx-auto flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            send()
          }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question…"
            disabled={streaming}
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={streaming || !input.trim()}
            className="flex-shrink-0 hover:shadow-[var(--shadow-brand)] transition-shadow"
          >
            {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
        <p className="max-w-3xl mx-auto text-[11px] text-[var(--text-3)] text-center mt-2">
          Powered by Cognita RAG
        </p>
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: LiveMessage }) {
  const isUser = message.role === "user"
  return (
    <div className={cn("flex gap-3 animate-fadeIn", isUser ? "flex-row-reverse" : "flex-row")}>
      {/* Avatar */}
      <div
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
          isUser
            ? "bg-brand-600 text-white"
            : "glass border border-[var(--border)] text-[var(--text-2)]",
        )}
      >
        {isUser ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Bubble + citations */}
      <div className={cn("min-w-0 max-w-[85%] flex flex-col", isUser && "items-end")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "bg-gradient-to-r from-brand-600 to-brand-500 text-white rounded-tr-sm shadow-[var(--shadow-brand)]"
              : "glass border border-[var(--border)] text-[var(--text)] rounded-tl-sm",
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : message.content ? (
            <div className="prose prose-sm prose-invert max-w-none prose-p:my-1.5 prose-headings:my-2 prose-a:text-brand-400">
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
                className="inline-flex items-center gap-1 max-w-[16rem] truncate rounded-full bg-brand-500/10 text-brand-300 border border-brand-500/20 px-2.5 py-1 text-[11px] font-medium"
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
