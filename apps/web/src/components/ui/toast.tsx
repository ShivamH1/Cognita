"use client"

import React, { createContext, useCallback, useContext, useState } from "react"
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react"
import { cn } from "@/lib/utils"

type ToastVariant = "success" | "error" | "info"

interface Toast {
  id: number
  message: string
  variant: ToastVariant
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) return { toast: () => {} }
  return ctx
}

let counter = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const toast = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = ++counter
      setToasts((t) => [...t, { id, message, variant }])
      setTimeout(() => remove(id), 4500)
    },
    [remove],
  )

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-5 right-5 z-[100] flex flex-col gap-2.5 w-[min(92vw,360px)]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-md animate-slideDown text-sm font-medium",
              t.variant === "success" && "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
              t.variant === "error" && "bg-rose-500/15 border-rose-500/30 text-rose-300",
              t.variant === "info" && "bg-[var(--card-hi)] border-[var(--border-md)] text-[var(--text)]",
            )}
            role="status"
          >
            {t.variant === "success" && <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />}
            {t.variant === "error" && <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />}
            {t.variant === "info" && <Info className="w-5 h-5 flex-shrink-0 text-brand-400" />}
            <span className="flex-1 leading-snug">{t.message}</span>
            <button
              onClick={() => remove(t.id)}
              className="text-[var(--text-3)] hover:text-[var(--text)] transition-colors cursor-pointer"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
