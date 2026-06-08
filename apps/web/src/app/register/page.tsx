"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { AuthShell } from "@/components/auth/auth-shell"
import { Button, Input, Label } from "@/components/ui"
import { cn } from "@/lib/utils"
import { Mail, Lock, User, GraduationCap, BookOpen, Loader2 } from "lucide-react"

type Role = "STUDENT" | "TEACHER"

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<Role>("STUDENT")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Registration failed.")
        setLoading(false)
        return
      }

      // Auto sign-in after successful registration.
      const signInRes = await signIn("credentials", { email, password, redirect: false })
      if (signInRes?.error) {
        router.push("/login")
        return
      }
      router.push("/dashboard")
      router.refresh()
    } catch {
      setError("Something went wrong. Please try again.")
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Pick your role and start in seconds."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-700">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-sm font-medium text-rose-400">
            {error}
          </div>
        )}

        {/* Role picker */}
        <div>
          <Label>I am a</Label>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                { value: "STUDENT", label: "Student", icon: <BookOpen className="w-5 h-5" /> },
                { value: "TEACHER", label: "Teacher", icon: <GraduationCap className="w-5 h-5" /> },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRole(opt.value)}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl border px-4 py-3 font-semibold text-sm transition-all",
                  role === opt.value
                    ? "border-brand-500/40 bg-brand-500/10 text-brand-300 ring-1 ring-brand-500/20"
                    : "border-[var(--border)] text-[var(--text-2)] hover:border-[var(--border-md)]",
                )}
              >
                <span className={role === opt.value ? "text-brand-400" : "text-[var(--text-3)]"}>{opt.icon}</span>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="name">Full name</Label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-3)]" />
            <Input
              id="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ada Lovelace"
              className="pl-10"
              autoComplete="name"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-3)]" />
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="pl-10"
              autoComplete="email"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-3)]" />
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="pl-10"
              autoComplete="new-password"
            />
          </div>
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create account"}
        </Button>
      </form>
    </AuthShell>
  )
}
