import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { ContractStatus, DocumentStatus } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number, currency = "BRL"): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format(value)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(date))
}

export function deriveContractStatus(starts_at: string, ends_at: string): ContractStatus {
  const now = new Date()
  const end = new Date(ends_at)
  const start = new Date(starts_at)
  const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  if (end < now) return "expired"
  if (end <= thirtyDaysOut) return "expiring"
  if (start > now) return "draft"
  return "active"
}

export function deriveDocumentStatus(expires_at: string | null): DocumentStatus {
  if (!expires_at) return "no_expiry"
  const now = new Date()
  const exp = new Date(expires_at)
  const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  if (exp < now) return "expired"
  if (exp <= thirtyDaysOut) return "expiring"
  return "valid"
}

export function formatDaysRelative(date: string | Date): string {
  const d = new Date(date)
  const now = new Date()
  // Compare at day granularity
  const diffMs = d.setHours(0, 0, 0, 0) - now.setHours(0, 0, 0, 0)
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "hoje"
  if (diffDays === 1) return "amanhã"
  if (diffDays === -1) return "ontem"
  if (diffDays > 0) return `em ${diffDays} dia${diffDays > 1 ? "s" : ""}`
  return `há ${Math.abs(diffDays)} dia${Math.abs(diffDays) > 1 ? "s" : ""}`
}

export function formatFileSize(bytes: number | null): string {
  if (!bytes) return "—"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
