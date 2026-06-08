"use client"

import React, { useEffect, useRef } from "react"
import Link from "next/link"
import {
  BookOpen,
  MessageSquareText,
  Sparkles,
  GraduationCap,
  BarChart3,
  FileText,
  ArrowRight,
  Brain,
  Zap,
  ShieldCheck,
} from "lucide-react"
import { Logo } from "@/components/brand"

const features = [
  {
    icon: <MessageSquareText className="w-6 h-6" />,
    title: "Chat with your PDFs",
    body: "Ask questions and get grounded answers with citations pulled straight from your documents.",
    accent: "brand",
  },
  {
    icon: <Sparkles className="w-6 h-6" />,
    title: "Instant study aids",
    body: "Generate crisp summaries and flippable flashcards from any uploaded material in seconds.",
    accent: "cyan",
  },
  {
    icon: <GraduationCap className="w-6 h-6" />,
    title: "AI-built assessments",
    body: "Design papers section by section — MCQs, short, long, true/false — with difficulty mixes.",
    accent: "brand",
  },
  {
    icon: <FileText className="w-6 h-6" />,
    title: "Auto-grading & feedback",
    body: "Students submit, AI grades each answer with a score and personalised written feedback.",
    accent: "cyan",
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: "Progress analytics",
    body: "Track scores, submissions and learning activity for every learner and class.",
    accent: "brand",
  },
  {
    icon: <BookOpen className="w-6 h-6" />,
    title: "Grounded in your content",
    body: "Retrieval-augmented generation keeps every output anchored to your own sources.",
    accent: "cyan",
  },
]

const steps = [
  { n: "01", title: "Upload", body: "Drop in PDFs or notes. Cognita ingests and indexes them for retrieval." },
  { n: "02", title: "Learn", body: "Chat with a tutor, generate summaries, drill flashcards." },
  { n: "03", title: "Assess", body: "Build or take assessments, then get instant AI grading and feedback." },
]

export function Landing() {
  const rootRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // GSAP scroll-triggered reveals + Locomotive smooth scrolling (client-only).
  useEffect(() => {
    let locoScroll: import("locomotive-scroll").default | null = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let ctx: any = null
    let cancelled = false

    ;(async () => {
      const [{ default: LocomotiveScroll }, gsapMod, stMod] = await Promise.all([
        import("locomotive-scroll"),
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ])
      if (cancelled) return

      const gsap = gsapMod.gsap ?? gsapMod.default
      const ScrollTrigger = stMod.ScrollTrigger ?? stMod.default
      gsap.registerPlugin(ScrollTrigger)

      const el = scrollRef.current
      if (!el) return

      locoScroll = new LocomotiveScroll({ el, smooth: true, lerp: 0.08, multiplier: 0.9 })

      // Bridge Locomotive Scroll with ScrollTrigger.
      locoScroll.on("scroll", () => ScrollTrigger.update())

      ScrollTrigger.scrollerProxy(el, {
        scrollTop(value?: number) {
          if (arguments.length && typeof value === "number") {
            locoScroll?.scrollTo(value, { duration: 0, disableLerp: true })
            return
          }
          return locoScroll?.scroll.instance.scroll.y ?? 0
        },
        getBoundingClientRect() {
          return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight }
        },
      })

      ctx = gsap.context(() => {
        gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((node) => {
          gsap.fromTo(
            node,
            { y: 40, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.9,
              ease: "power3.out",
              scrollTrigger: { trigger: node, scroller: el, start: "top 88%" },
            },
          )
        })
      }, rootRef)

      ScrollTrigger.addEventListener("refresh", () => locoScroll?.update())
      setTimeout(() => {
        locoScroll?.update()
        ScrollTrigger.refresh()
      }, 300)
    })()

    return () => {
      cancelled = true
      ctx?.revert()
      locoScroll?.destroy()
    }
  }, [])

  return (
    <div ref={rootRef} className="bg-[var(--bg)]">
      {/* ── Fixed top nav ── */}
      <header className="fixed top-0 inset-x-0 z-50">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          {/* Glass logo pill */}
          <div className="glass rounded-2xl border border-[var(--border-md)] px-3.5 py-2 shadow shadow-black/20">
            <Logo />
          </div>
          {/* Nav actions */}
          <div className="glass flex items-center gap-1 rounded-2xl border border-[var(--border-md)] px-2 py-1.5 shadow shadow-black/20">
            <Link
              href="/login"
              className="px-4 py-1.5 rounded-xl text-sm font-semibold text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--card-hi)] transition-all"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="px-4 py-1.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 shadow shadow-brand-500/30 transition-all"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <div ref={scrollRef} data-scroll-container>
        {/* ── HERO ── */}
        <section className="relative min-h-screen flex items-center overflow-hidden bg-[var(--bg)]">
          {/* Dot-grid overlay (from globals.css) */}
          <div
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(139,92,246,0.3) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />

          {/* Animated orbs */}
          <div className="absolute -top-32 -right-32 w-[40rem] h-[40rem] bg-brand-600/20 rounded-full blur-[100px] animate-floaty pointer-events-none" />
          <div className="absolute top-1/3 -left-24 w-[28rem] h-[28rem] bg-neon-500/10 rounded-full blur-[80px] animate-floaty pointer-events-none" style={{ animationDelay: "1.5s" }} />
          <div className="absolute -bottom-40 left-1/3 w-[36rem] h-[36rem] bg-brand-700/15 rounded-full blur-[90px] pointer-events-none" />

          <div className="relative max-w-6xl mx-auto px-5 sm:px-8 pt-28 pb-16 w-full">
            <div className="max-w-3xl">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 glass border border-brand-500/30 px-3.5 py-1.5 rounded-full text-brand-400 font-bold text-xs tracking-wide mb-6">
                <Brain className="w-4 h-4" /> AI learning &amp; assessment platform
              </div>

              {/* Headline */}
              <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-[var(--text)] leading-[1.05]">
                Turn documents into{" "}
                <span className="text-gradient">tutors</span>, study aids &amp;{" "}
                <span className="text-gradient">assessments</span>.
              </h1>

              <p className="mt-6 text-lg text-[var(--text-2)] max-w-xl leading-relaxed">
                Cognita reads your material, answers your questions with citations, builds practice
                papers, and grades them — so learners go faster and educators do less busywork.
              </p>

              {/* CTAs */}
              <div className="mt-9 flex flex-wrap gap-3">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl text-base font-bold text-white bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 shadow-lg shadow-brand-500/30 hover:shadow-brand-500/50 transition-all glow-brand"
                >
                  Start free <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl text-base font-bold text-[var(--text-2)] glass border border-[var(--border-md)] hover:border-[var(--border-hi)] hover:text-[var(--text)] transition-all"
                >
                  I have an account
                </Link>
              </div>

              {/* Trust chips */}
              <div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-3 text-sm font-semibold text-[var(--text-3)]">
                <span className="inline-flex items-center gap-2">
                  <Zap className="w-4 h-4 text-neon-400" /> Instant generation
                </span>
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-brand-400" /> Grounded in your sources
                </span>
                <span className="inline-flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-brand-400" /> For students &amp; teachers
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section className="relative py-24 border-y border-[var(--border)]">
          {/* Subtle bg */}
          <div className="absolute inset-0 bg-[var(--surface)]/60 pointer-events-none" />
          <div className="relative max-w-6xl mx-auto px-5 sm:px-8">
            <div data-reveal className="max-w-2xl mb-14">
              <p className="text-brand-400 font-bold text-sm uppercase tracking-widest mb-3">
                Everything in one place
              </p>
              <h2 className="font-display text-4xl font-extrabold text-[var(--text)] tracking-tight">
                A complete learning loop, powered by AI
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {features.map((f) => (
                <div
                  key={f.title}
                  data-reveal
                  className="group glass rounded-2xl border border-[var(--border)] p-6 hover:border-brand-500/30 hover:-translate-y-1 transition-all duration-300 hover:shadow-lg hover:shadow-brand-500/10"
                >
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform ${
                      f.accent === "cyan"
                        ? "bg-neon-500/10 text-neon-400"
                        : "bg-brand-500/10 text-brand-400"
                    }`}
                  >
                    {f.icon}
                  </div>
                  <h3 className="font-display text-lg font-bold text-[var(--text)] mb-1.5">{f.title}</h3>
                  <p className="text-sm text-[var(--text-2)] leading-relaxed">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className="relative py-24 bg-[var(--bg)]">
          <div className="max-w-6xl mx-auto px-5 sm:px-8">
            <div data-reveal className="text-center max-w-2xl mx-auto mb-16">
              <p className="text-brand-400 font-bold text-sm uppercase tracking-widest mb-3">How it works</p>
              <h2 className="font-display text-4xl font-extrabold text-[var(--text)] tracking-tight">
                From raw material to mastery in three steps
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {steps.map((s, i) => (
                <div
                  key={s.n}
                  data-reveal
                  className="relative glass rounded-3xl border border-[var(--border)] p-8 hover:border-brand-500/20 transition-all group"
                >
                  {/* Ghost step number */}
                  <span className="font-display text-6xl font-extrabold text-brand-500/10 group-hover:text-brand-500/20 transition-colors select-none">
                    {s.n}
                  </span>
                  {/* Step connector line */}
                  {i < steps.length - 1 && (
                    <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-px bg-gradient-to-r from-brand-500/40 to-transparent" />
                  )}
                  <h3 className="font-display text-xl font-bold text-[var(--text)] mt-3 mb-2">{s.title}</h3>
                  <p className="text-sm text-[var(--text-2)] leading-relaxed">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="relative py-24 bg-[var(--bg)]">
          <div className="max-w-5xl mx-auto px-5 sm:px-8">
            <div
              data-reveal
              className="relative overflow-hidden rounded-[2rem] px-8 py-16 sm:px-16 text-center"
              style={{
                background: "linear-gradient(135deg, #1a0e35 0%, #111327 40%, #0a1628 100%)",
                boxShadow: "0 0 80px rgba(139,92,246,0.2), 0 40px 80px rgba(0,0,0,0.4)",
              }}
            >
              {/* Border glow */}
              <div className="absolute inset-0 rounded-[2rem] border border-brand-500/20 pointer-events-none" />

              {/* Orbs */}
              <div className="absolute -top-20 -right-10 w-72 h-72 bg-brand-600/20 rounded-full blur-[70px] pointer-events-none" />
              <div className="absolute -bottom-24 -left-10 w-72 h-72 bg-neon-500/10 rounded-full blur-[60px] pointer-events-none animate-floaty" />

              <div className="relative z-10">
                <h2 className="font-display text-4xl sm:text-5xl font-extrabold text-[var(--text)] tracking-tight">
                  Ready to learn smarter?
                </h2>
                <p className="mt-4 text-[var(--text-2)] text-lg max-w-xl mx-auto">
                  Join Cognita and turn your documents into an interactive learning experience today.
                </p>
                <Link
                  href="/register"
                  className="mt-8 inline-flex items-center gap-2 px-7 py-4 rounded-2xl text-base font-bold text-[var(--bg)] bg-gradient-to-r from-brand-400 to-neon-400 hover:from-brand-500 hover:to-neon-500 shadow-lg shadow-brand-500/30 transition-all glow-brand"
                >
                  Create your account <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="py-10 border-t border-[var(--border)] bg-[var(--bg)]">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <Logo />
            <p className="text-sm text-[var(--text-3)]">
              © {new Date().getFullYear()} Cognita. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}
