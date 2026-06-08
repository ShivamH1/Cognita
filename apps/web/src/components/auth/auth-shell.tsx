import React from "react"
import Link from "next/link"
import { Logo } from "@/components/brand"

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
  footer: React.ReactNode
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[var(--bg)]">
      {/* ── Left brand panel (desktop only) ── */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden p-12">
        {/* Dark gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0c0e1a] via-[#111327] to-[#07080f]" />

        {/* Dot-grid overlay */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(139,92,246,0.35) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* Floating blob orbs */}
        <div className="absolute -top-24 -right-16 w-[28rem] h-[28rem] bg-brand-600/25 rounded-full blur-[80px] animate-floaty pointer-events-none" />
        <div className="absolute top-1/2 -left-20 w-72 h-72 bg-neon-500/15 rounded-full blur-[60px] animate-floaty pointer-events-none" style={{ animationDelay: "1.2s" }} />
        <div className="absolute -bottom-32 right-1/4 w-80 h-80 bg-brand-500/20 rounded-full blur-[70px] pointer-events-none" />

        {/* Content */}
        <div className="relative z-10">
          <Link href="/">
            <Logo />
          </Link>
        </div>

        <div className="relative z-10 max-w-md">
          {/* Neon accent line */}
          <div className="w-12 h-1 rounded-full bg-gradient-to-r from-brand-400 to-neon-400 mb-6" />
          <h2 className="font-display text-4xl font-extrabold leading-tight tracking-tight text-[var(--text)]">
            Learn faster.{" "}
            <span className="text-gradient">Teach smarter.</span>
          </h2>
          <p className="mt-4 text-[var(--text-2)] text-lg leading-relaxed">
            Your documents become tutors, study aids and intelligent assessments — all in one place,
            powered by AI.
          </p>

          {/* Feature bullets */}
          <ul className="mt-8 space-y-3">
            {[
              "Chat with your PDFs — grounded answers with citations",
              "Generate flashcards & summaries in seconds",
              "AI-built assessments with instant grading",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-[var(--text-2)]">
                <span className="mt-1 w-4 h-4 rounded-full bg-brand-500/20 border border-brand-500/40 flex items-center justify-center flex-shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 text-sm text-[var(--text-3)]">
          © {new Date().getFullYear()} Cognita
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex items-center justify-center p-6 sm:p-10 bg-[var(--bg)]">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8">
            <Link href="/">
              <Logo />
            </Link>
          </div>

          {/* Glass card wrapping the form */}
          <div className="glass rounded-3xl p-8 sm:p-10 border border-[var(--border-md)] shadow-[var(--shadow-lg)]">
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-[var(--text)]">
              {title}
            </h1>
            <p className="text-[var(--text-2)] mt-1.5 mb-8">{subtitle}</p>
            {children}
            <div className="mt-6 text-sm text-[var(--text-3)] text-center">{footer}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
