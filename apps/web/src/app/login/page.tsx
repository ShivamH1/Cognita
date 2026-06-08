"use client"

import React, { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import { AuthShell } from "@/components/auth/auth-shell"
import { Button, Input, Label } from "@/components/ui"
import { Mail, Lock, Loader2 } from "lucide-react"

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const callbackUrl = params.get("callbackUrl") || "/dashboard"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await signIn("credentials", { email, password, redirect: false })

    if (res?.error) {
      setError("Invalid email or password.")
      setLoading(false)
      return
    }

    router.push(callbackUrl)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-sm font-medium text-rose-400">
          {error}
        </div>
      )}

      <div>
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-3)]" />
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="pl-10" autoComplete="email" />
        </div>
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-3)]" />
          <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pl-10" autoComplete="current-password" />
        </div>
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Log in"}
      </Button>
    </form>
  )
}

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to continue your learning journey."
      footer={
        <>
          New to Cognita?{" "}
          <Link href="/register" className="font-semibold text-brand-400 hover:text-brand-300">
            Create an account
          </Link>
        </>
      }
    >
      <Suspense fallback={<div className="h-48" />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  )
}
