"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { cn } from "@/lib/utils"
import type { Flashcard as FlashcardType } from "@/types"
import { RotateCw, CheckCircle2, XCircle, Trophy, RotateCcw, ChevronRight } from "lucide-react"
import { Button, Progress } from "@/components/ui"
import confetti from "canvas-confetti"

// ─── Legacy grid card ────────────────────────────────────────────────────────

export function Flashcard({ card, index }: { card: FlashcardType; index: number }) {
  const [flipped, setFlipped] = useState(false)
  return (
    <button
      type="button"
      onClick={() => setFlipped((f) => !f)}
      className={cn("flip-card h-44 w-full text-left cursor-pointer", flipped && "flipped")}
      aria-label="Flip flashcard"
    >
      <div className="flip-inner h-full">
        {/* Front */}
        <div className="flip-face h-full rounded-2xl glass-strong p-5 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-brand-400">
              Card {index + 1}
            </span>
            <RotateCw className="w-3.5 h-3.5 text-[var(--text-3)]" />
          </div>
          <p className="text-[var(--text)] font-semibold leading-snug flex-1 overflow-y-auto scrollbar-thin">
            {card.front}
          </p>
          <span className="text-[11px] text-[var(--text-3)] mt-2">Tap to reveal</span>
        </div>
        {/* Back */}
        <div className="flip-face flip-back h-full rounded-2xl bg-gradient-to-br from-brand-700 to-brand-600 p-5 flex flex-col border border-brand-500/30">
          <span className="text-[10px] font-bold uppercase tracking-widest text-brand-200 mb-2">Answer</span>
          <p className="text-white leading-snug flex-1 overflow-y-auto scrollbar-thin">{card.back}</p>
        </div>
      </div>
    </button>
  )
}

// ─── Gamified deck player ─────────────────────────────────────────────────────

export interface FlashcardPlayerProps {
  cards: FlashcardType[]
  onComplete: (stats: { known: number; learning: number; xpEarned: number }) => void
}

interface CardState {
  card: FlashcardType
  originalIndex: number
  mastered: boolean
}

type SwipeDir = "left" | "right" | null

export function FlashcardPlayer({ cards, onComplete }: FlashcardPlayerProps) {
  // Build queue — preserve original indices
  const [queue, setQueue] = useState<CardState[]>(() =>
    cards.map((card, i) => ({ card, originalIndex: i, mastered: false })),
  )
  const [currentIdx, setCurrentIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [swipeDir, setSwipeDir] = useState<SwipeDir>(null)
  const [streak, setStreak] = useState(0)
  const [prevStreak, setPrevStreak] = useState(0)
  const [xpTotal, setXpTotal] = useState(0)
  const [showXp, setShowXp] = useState(false)
  const [xpKey, setXpKey] = useState(0)
  const [done, setDone] = useState(false)
  const [knownCount, setKnownCount] = useState(0)
  const xpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const totalUnique = cards.length
  const masteredCount = queue.filter((c) => c.mastered).length
  const progressPct = (masteredCount / totalUnique) * 100
  const current = queue[currentIdx]

  // Confetti on completion
  useEffect(() => {
    if (done) {
      const end = Date.now() + 2200
      const frame = () => {
        confetti({
          particleCount: 6,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ["#8b5cf6", "#22d3ee", "#fbbf24"],
        })
        confetti({
          particleCount: 6,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ["#8b5cf6", "#22d3ee", "#fbbf24"],
        })
        if (Date.now() < end) requestAnimationFrame(frame)
      }
      frame()
    }
  }, [done])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (done) return
      if (e.key === " ") {
        e.preventDefault()
        if (!swipeDir) setFlipped((f) => !f)
      }
      if (e.key === "ArrowRight" && flipped && !swipeDir) handleKnown()
      if (e.key === "ArrowLeft" && flipped && !swipeDir) handleLearning()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipped, swipeDir, done, currentIdx, queue, streak, xpTotal, knownCount])

  const advance = useCallback(
    (newQueue: CardState[], nextIdx: number, delay = 480) => {
      setTimeout(() => {
        setSwipeDir(null)
        setFlipped(false)
        setQueue(newQueue)
        setCurrentIdx(nextIdx)
      }, delay)
    },
    [],
  )

  function handleKnown() {
    if (!current || swipeDir) return
    const newXp = xpTotal + 10
    const newStreak = streak + 1
    const newKnown = knownCount + 1

    setPrevStreak(streak)
    setStreak(newStreak)
    setXpTotal(newXp)
    setKnownCount(newKnown)

    // Float XP badge
    if (xpTimerRef.current) clearTimeout(xpTimerRef.current)
    setShowXp(true)
    setXpKey((k) => k + 1)
    xpTimerRef.current = setTimeout(() => setShowXp(false), 1100)

    setSwipeDir("right")

    // Mark mastered
    const newQueue = queue.map((c, i) =>
      i === currentIdx ? { ...c, mastered: true } : c,
    )

    // Check if all unique cards mastered after this action
    const newMasteredCount = newQueue.filter((c) => c.mastered).length
    if (newMasteredCount >= totalUnique) {
      advance(newQueue, currentIdx, 520)
      setTimeout(() => {
        setDone(true)
        onComplete({ known: newKnown, learning: totalUnique - newKnown, xpEarned: newXp })
      }, 620)
      return
    }

    // Next unmastered card
    const nextUnmastered = findNextUnmastered(newQueue, currentIdx)
    advance(newQueue, nextUnmastered, 480)
  }

  function handleLearning() {
    if (!current || swipeDir) return

    setPrevStreak(streak)
    setStreak(0)
    setSwipeDir("left")

    // Unmask and push to end
    const newQueue = [...queue]
    const [removed] = newQueue.splice(currentIdx, 1)
    newQueue.push({ ...removed, mastered: false })

    const nextIdx = currentIdx >= newQueue.length ? 0 : currentIdx
    advance(newQueue, nextIdx, 480)
  }

  function findNextUnmastered(q: CardState[], fromIdx: number): number {
    // Try from current position forward
    for (let i = fromIdx + 1; i < q.length; i++) {
      if (!q[i].mastered) return i
    }
    // Wrap around
    for (let i = 0; i < fromIdx; i++) {
      if (!q[i].mastered) return i
    }
    return fromIdx
  }

  function restart() {
    setQueue(cards.map((card, i) => ({ card, originalIndex: i, mastered: false })))
    setCurrentIdx(0)
    setFlipped(false)
    setSwipeDir(null)
    setStreak(0)
    setPrevStreak(0)
    setXpTotal(0)
    setKnownCount(0)
    setShowXp(false)
    setDone(false)
  }

  // ── Completion screen ───────────────────────────────────────────────────────
  if (done) {
    const learningCount = totalUnique - knownCount
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 animate-scaleIn text-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-600 to-neon-500 flex items-center justify-center mb-6 glow-brand">
          <Trophy className="w-10 h-10 text-white" />
        </div>
        <h2 className="font-display text-3xl font-black text-[var(--text)] mb-1">Session Complete!</h2>
        <p className="text-[var(--text-3)] text-sm mb-8">You powered through all {totalUnique} cards.</p>

        <div className="grid grid-cols-3 gap-4 mb-8 w-full max-w-sm">
          <div className="glass-strong rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-emerald-400">{knownCount}</p>
            <p className="text-[10px] uppercase tracking-widest text-[var(--text-3)] mt-1">Known</p>
          </div>
          <div className="glass-strong rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-rose-400">{learningCount}</p>
            <p className="text-[10px] uppercase tracking-widest text-[var(--text-3)] mt-1">Learning</p>
          </div>
          <div className="glass-strong rounded-2xl p-4 text-center glow-xp">
            <p className="text-2xl font-black text-xp-400">{xpTotal}</p>
            <p className="text-[10px] uppercase tracking-widest text-[var(--text-3)] mt-1">XP</p>
          </div>
        </div>

        <Button onClick={restart} size="lg" className="gap-2">
          <RotateCcw className="w-4 h-4" />
          Play again
        </Button>
      </div>
    )
  }

  if (!current) return null

  const streakPop = streak > 0 && streak > prevStreak

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto select-none">
      {/* HUD row */}
      <div className="w-full flex items-center justify-between mb-5 px-1">
        {/* Streak badge */}
        <div
          className={cn(
            "flex items-center gap-1.5 glass rounded-xl px-3 py-1.5 text-sm font-bold transition-all",
            streak > 0 ? "text-xp-400" : "text-[var(--text-3)]",
            streakPop && "animate-streakPop",
          )}
        >
          <span>{streak > 0 ? "🔥" : "💤"}</span>
          <span>{streak}</span>
          <span className="text-[10px] font-medium text-[var(--text-3)] ml-0.5">streak</span>
        </div>

        {/* Progress */}
        <div className="flex-1 mx-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold text-[var(--text-3)] uppercase tracking-wider">
              {masteredCount} / {totalUnique} mastered
            </span>
            <span className="text-[10px] font-semibold text-brand-400">{Math.round(progressPct)}%</span>
          </div>
          <Progress value={progressPct} />
        </div>

        {/* XP badge */}
        <div className="glass rounded-xl px-3 py-1.5 text-sm font-bold text-xp-400">
          {xpTotal} XP
        </div>
      </div>

      {/* Card stack */}
      <div className="relative w-full" style={{ minHeight: "320px" }}>
        {/* Ghost cards behind */}
        <div
          className="absolute inset-x-0 bottom-0 rounded-2xl glass-strong"
          style={{ transform: "translateY(10px) scale(0.94)", opacity: 0.35, zIndex: 0, height: "100%" }}
        />
        <div
          className="absolute inset-x-0 bottom-0 rounded-2xl glass-strong"
          style={{ transform: "translateY(5px) scale(0.97)", opacity: 0.55, zIndex: 1, height: "100%" }}
        />

        {/* Main card */}
        <div
          className={cn(
            "relative z-10 flip-card w-full",
            flipped && "flipped",
            swipeDir === "left" && "animate-swipeLeft",
            swipeDir === "right" && "animate-swipeRight",
          )}
          style={{ minHeight: "320px" }}
        >
          <div className="flip-inner" style={{ minHeight: "320px" }}>
            {/* Front face */}
            <div className="flip-face glass-strong rounded-2xl flex flex-col p-6 sm:p-8 cursor-pointer"
              style={{ minHeight: "320px" }}
              onClick={() => { if (!swipeDir) setFlipped(true) }}
              role="button"
              tabIndex={0}
              aria-label="Flip card to reveal answer"
              onKeyDown={(e) => { if (e.key === "Enter" && !swipeDir) setFlipped(true) }}
            >
              {/* Card header */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-brand-400">
                  Card {currentIdx + 1}
                </span>
                <div className="flex items-center gap-1.5 text-[var(--text-3)]">
                  <RotateCw className="w-3.5 h-3.5" />
                  <span className="text-[10px]">Space to flip</span>
                </div>
              </div>

              {/* Question */}
              <div className="flex-1 flex items-center justify-center">
                <p className="text-[var(--text)] text-lg sm:text-xl font-semibold leading-snug text-center">
                  {current.card.front}
                </p>
              </div>

              {/* Tap hint */}
              <div className="flex items-center justify-center gap-1.5 mt-4 text-[var(--text-3)] text-xs">
                <span>Tap to flip</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Back face */}
            <div
              className="flip-face flip-back rounded-2xl bg-gradient-to-br from-brand-700 to-brand-600 flex flex-col p-6 sm:p-8 border border-brand-500/30"
              style={{ minHeight: "320px" }}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-brand-200">Answer</span>
                <div className="flex items-center gap-1 text-brand-300 text-[10px]">
                  <span>→ Got it</span>
                  <span className="mx-1">·</span>
                  <span>← Learning</span>
                </div>
              </div>

              <div className="flex-1 flex items-center justify-center">
                <p className="text-white text-lg sm:text-xl font-medium leading-snug text-center">
                  {current.card.back}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setFlipped(false)}
                className="mt-4 self-center text-brand-200 hover:text-white text-xs flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Back
              </button>
            </div>
          </div>

          {/* Floating XP badge */}
          {showXp && (
            <span key={xpKey} className="xp-badge animate-xpFloat">
              +10 XP
            </span>
          )}
        </div>
      </div>

      {/* Action buttons — appear after flip */}
      <div
        className={cn(
          "flex gap-4 mt-6 w-full max-w-sm transition-all duration-300",
          flipped && !swipeDir ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none",
        )}
      >
        <button
          type="button"
          onClick={handleLearning}
          disabled={!!swipeDir}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm border transition-all duration-200 cursor-pointer",
            "bg-rose-500/10 border-rose-500/30 text-rose-400",
            "hover:bg-rose-500/20 hover:border-rose-500/50 hover:shadow-[0_0_20px_rgba(244,63,94,0.25)]",
            "active:scale-[0.97]",
          )}
        >
          <XCircle className="w-4 h-4" />
          Still learning
        </button>
        <button
          type="button"
          onClick={handleKnown}
          disabled={!!swipeDir}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm border transition-all duration-200 cursor-pointer",
            "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
            "hover:bg-emerald-500/20 hover:border-emerald-500/50 hover:shadow-[0_0_20px_rgba(52,211,153,0.25)]",
            "active:scale-[0.97]",
          )}
        >
          <CheckCircle2 className="w-4 h-4" />
          Got it! ✓
        </button>
      </div>

      {/* Keyboard hint */}
      <p className="text-[10px] text-[var(--text-3)] mt-4 text-center">
        {flipped ? "→ Got it  ·  ← Still learning" : "Space to flip"}
      </p>
    </div>
  )
}
