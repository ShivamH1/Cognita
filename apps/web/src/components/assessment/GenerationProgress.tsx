"use client"
import React, { useEffect, useRef } from "react"
import { useGenerationStore } from "@/store/generation.store"
import { CheckCircle2, AlertTriangle, ArrowLeft } from "lucide-react"
import { Button } from "../ui"
import { useRouter } from "next/navigation"

export function GenerationProgress() {
  const { status, progress, message, events } = useGenerationStore()
  const router = useRouter()
  const logEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [events])

  return (
    <div className="glass-strong rounded-3xl border border-[var(--border-md)] shadow-[var(--shadow-lg)] p-8 space-y-6 relative overflow-hidden max-w-xl mx-auto">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-brand-500 via-neon-400 to-brand-500" />

      <div className="text-center space-y-4">
        {status === "generating" || status === "connecting" ? (
          <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 border-4 border-brand-500/10 rounded-full" />
            <div className="absolute inset-0 border-4 border-t-brand-400 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
            <div className="absolute inset-2 border-4 border-brand-500/10 rounded-full" />
            <div className="absolute inset-2 border-4 border-b-neon-400 border-t-transparent border-r-transparent border-l-transparent rounded-full animate-spin [animation-duration:1.5s] [animation-direction:reverse]" />
            <span className="font-display text-xl font-black text-[var(--text)] animate-pulse">{progress}%</span>
          </div>
        ) : status === "complete" ? (
          <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20 animate-bounce">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
        ) : (
          <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto border border-rose-500/20">
            <AlertTriangle className="w-10 h-10 text-rose-400 animate-wiggle" />
          </div>
        )}

        <div className="space-y-1">
          <h2 className="font-display text-xl font-bold text-[var(--text)] tracking-wide uppercase">
            {status === "generating" ? "AI Generating Question Paper" :
             status === "complete" ? "Paper Generation Completed!" :
             status === "failed" ? "Generation Failed" : "Connecting to Queue…"}
          </h2>
          <p className="text-sm font-medium text-[var(--text-2)]">{message}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="xp-bar">
          <div className="xp-bar-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex justify-between text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest">
          <span>Enqueued</span>
          <span>Generating Questions</span>
          <span>Complete</span>
        </div>
      </div>

      {/* Live log */}
      <div className="border border-[var(--border)] bg-[var(--surface)] rounded-2xl p-4 h-48 overflow-y-auto space-y-2.5 shadow-inner">
        {events.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-[var(--text-3)] italic">
            Waiting for generation logs to stream…
          </div>
        ) : (
          events.map((event, i) => (
            <div key={i} className="flex items-start gap-2.5 text-xs text-[var(--text-2)] animate-slideUp">
              <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0 animate-ping" />
              <div className="flex-1 space-y-0.5">
                <span className="font-semibold text-[10px] text-[var(--text-3)] block">
                  {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
                <p className="leading-normal">{event.message}</p>
              </div>
            </div>
          ))
        )}
        <div ref={logEndRef} />
      </div>

      {status === "failed" && (
        <div className="text-center pt-2">
          <Button onClick={() => router.push("/create")} variant="outline" className="inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Configuration
          </Button>
        </div>
      )}
    </div>
  )
}
