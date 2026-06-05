import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date | undefined | null): string {
  if (!date) return "—"
  const d = typeof date === "string" ? new Date(date) : date
  if (isNaN(d.getTime())) return "—"
  return d.toLocaleDateString(undefined, { dateStyle: "medium" })
}

export function formatDateTime(date: string | Date | undefined | null): string {
  if (!date) return "—"
  const d = typeof date === "string" ? new Date(date) : date
  if (isNaN(d.getTime())) return "—"
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}

export function questionTypeLabel(type: string): string {
  const map: Record<string, string> = {
    mcq: "Multiple Choice",
    short_answer: "Short Answer",
    long_answer: "Long Answer",
    true_false: "True / False",
    fill_blank: "Fill in the Blank",
  }
  return map[type] ?? type.replace(/_/g, " ")
}
