import React from "react"
import { cn } from "@/lib/utils"
import { Loader2, ChevronDown } from "lucide-react"

// ─── CARD ────────────────────────────────────────────────────────────────────
export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-2xl border bg-[var(--card)] border-[var(--border)] backdrop-blur-md shadow-[var(--shadow)] transition-all duration-300",
        className,
      )}
      {...props}
    />
  ),
)
Card.displayName = "Card"

// ─── BUTTON ──────────────────────────────────────────────────────────────────
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "neon"
  size?: "sm" | "md" | "lg"
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-brand-500/30 active:scale-[0.96]",
          "disabled:opacity-40 disabled:pointer-events-none cursor-pointer",
          variant === "primary" &&
            "bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white shadow-[var(--shadow-brand)] hover:shadow-[0_6px_32px_rgba(139,92,246,0.45)]",
          variant === "neon" &&
            "bg-gradient-to-r from-neon-500 to-brand-500 hover:from-neon-600 hover:to-brand-600 text-white shadow-[0_4px_20px_rgba(34,211,238,0.30)]",
          variant === "secondary" &&
            "bg-[var(--card-hi)] hover:bg-[var(--border-md)] text-[var(--text)] border border-[var(--border)]",
          variant === "outline" &&
            "border border-[var(--border-md)] hover:border-[var(--border-hi)] hover:bg-[var(--card-hi)] text-[var(--text-2)] hover:text-[var(--text)]",
          variant === "ghost" &&
            "hover:bg-[var(--card-hi)] text-[var(--text-2)] hover:text-[var(--text)]",
          variant === "danger" &&
            "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-500/40",
          size === "sm" && "px-3 py-1.5 text-xs",
          size === "md" && "px-4 py-2.5 text-sm",
          size === "lg" && "px-6 py-3 text-base",
          className,
        )}
        {...props}
      />
    )
  },
)
Button.displayName = "Button"

// ─── INPUT ───────────────────────────────────────────────────────────────────
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex w-full rounded-xl px-3.5 py-2.5 text-sm transition-all duration-200",
        "bg-[var(--input-bg)] border border-[var(--border)] text-[var(--text)]",
        "placeholder:text-[var(--text-3)]",
        "focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 focus:outline-none",
        "hover:border-[var(--border-md)]",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
)
Input.displayName = "Input"

// ─── SELECT ──────────────────────────────────────────────────────────────────
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          "flex w-full appearance-none rounded-xl px-3.5 py-2.5 pr-10 text-sm transition-all duration-200 cursor-pointer",
          "bg-[var(--input-bg)] border border-[var(--border)] text-[var(--text)]",
          "focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 focus:outline-none",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-3)] pointer-events-none" />
    </div>
  ),
)
Select.displayName = "Select"

// ─── TEXTAREA ────────────────────────────────────────────────────────────────
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-xl px-3.5 py-2.5 text-sm transition-all duration-200",
        "bg-[var(--input-bg)] border border-[var(--border)] text-[var(--text)]",
        "placeholder:text-[var(--text-3)]",
        "focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 focus:outline-none",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
)
Textarea.displayName = "Textarea"

// ─── LABEL ───────────────────────────────────────────────────────────────────
export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("text-xs font-semibold text-[var(--text-2)] tracking-wide uppercase mb-1.5 block", className)}
      {...props}
    />
  )
}

// ─── BADGE ───────────────────────────────────────────────────────────────────
export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "success" | "warning" | "error" | "brand" | "neon" | "xp"
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border transition-colors duration-200",
        variant === "default" && "bg-[var(--card-hi)] text-[var(--text-2)] border-[var(--border)]",
        variant === "brand"   && "bg-brand-500/10 text-brand-400 border-brand-500/20",
        variant === "neon"    && "bg-neon-500/10 text-neon-400 border-neon-500/20",
        variant === "xp"      && "bg-xp-500/10 text-xp-400 border-xp-500/20",
        variant === "success" && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        variant === "warning" && "bg-amber-500/10 text-amber-400 border-amber-500/20",
        variant === "error"   && "bg-rose-500/10 text-rose-400 border-rose-500/20",
        className,
      )}
      {...props}
    />
  )
}

// ─── PROGRESS ────────────────────────────────────────────────────────────────
export function Progress({ value = 0, className }: { value?: number; className?: string }) {
  return (
    <div className={cn("xp-bar", className)}>
      <div className="xp-bar-fill" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  )
}

// ─── SPINNER ─────────────────────────────────────────────────────────────────
export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("w-5 h-5 animate-spin text-brand-400", className)} />
}

// ─── LOADING STATE ────────────────────────────────────────────────────────────
export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-2 border-brand-500/20" />
        <div className="absolute inset-0 rounded-full border-t-2 border-brand-400 animate-spin" />
        <div className="absolute inset-2 rounded-full bg-brand-500/10 animate-pulse" />
      </div>
      <p className="text-sm font-semibold text-[var(--text-3)] tracking-wide animate-pulse">{label}</p>
    </div>
  )
}

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      {icon && (
        <div className="w-14 h-14 rounded-2xl bg-brand-500/10 text-brand-400 flex items-center justify-center mb-4 border border-brand-500/20">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-bold text-[var(--text)] font-display">{title}</h3>
      {description && <p className="text-sm text-[var(--text-3)] mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

// ─── ERROR STATE ──────────────────────────────────────────────────────────────
export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mb-3 text-xl font-bold">
        !
      </div>
      <p className="text-sm font-semibold text-rose-400 max-w-md">{message}</p>
      {retry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={retry}>
          Try again
        </Button>
      )}
    </div>
  )
}

// ─── SKELETON ────────────────────────────────────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />
}

// ─── CONFIRM MODAL ────────────────────────────────────────────────────────────
export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  variant = "danger",
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  variant?: "danger" | "primary"
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative glass-strong rounded-2xl border border-[var(--border-md)] p-6 max-w-sm w-full shadow-[var(--shadow-lg)] space-y-4">
        <h3 className="font-display text-lg font-bold text-[var(--text)]">{title}</h3>
        {description && <p className="text-sm text-[var(--text-2)]">{description}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={loading}>Cancel</Button>
          <Button variant={variant} size="sm" onClick={onConfirm} disabled={loading}>
            {loading ? "Deleting…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
