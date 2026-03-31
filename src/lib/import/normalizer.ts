/**
 * Data normalizer — cleans and standardizes raw import rows.
 * Pure functions, no side effects.
 */

import type { ColumnMapping } from "./column-detector"
import type { PipelineStage, CommercialStatus, AccountStatus } from "@/types"

export type RawRow = Record<string, string>

export type ImportRow = {
  // CRM fields
  name: string
  contact_name: string | null
  contact_email: string | null
  phone: string | null
  segment: string | null
  status: AccountStatus
  estimated_value: number | null
  frequency: string | null
  last_contact_at: string | null
  notes: string | null
  pipeline_stage: PipelineStage
  commercial_status: CommercialStatus
  // Quality metadata
  _issues: string[]
  _duplicate: boolean
  _duplicateOf: string | null
  // Intelligence (filled in by intelligence-analyzer)
  _score: "hot" | "warm" | "cold" | "at_risk" | "upsell" | null
  _opportunities: string[]
  _segment_group: "high_value" | "recurring" | "inactive" | "lead" | "upsell" | null
}

// ── Phone normalization ────────────────────────────────────────────────────────

export function normalizePhone(raw: string): string | null {
  if (!raw) return null
  const digits = raw.replace(/\D/g, "")
  if (digits.length < 8) return null

  // Already has country code 55
  if (digits.startsWith("55") && digits.length >= 12) {
    return `+${digits}`
  }
  // Brazilian mobile (11 digits with DDD)
  if (digits.length === 11) return `+55${digits}`
  // Brazilian landline (10 digits)
  if (digits.length === 10) return `+55${digits}`
  // Just 9 digits — assume missing DDD, keep as-is
  return `+55${digits}`
}

// ── Name normalization ─────────────────────────────────────────────────────────

export function normalizeName(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w) =>
      w.length <= 2 && w === w.toUpperCase()
        ? w // keep acronyms like "SA" or "ME"
        : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    )
    .join(" ")
}

// ── Value parsing ──────────────────────────────────────────────────────────────

export function parseValue(raw: string): number | null {
  if (!raw) return null
  // Handle Brazilian number format: 1.500,00 → 1500.00
  const cleaned = raw
    .replace(/[R$\s]/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

// ── Date parsing ───────────────────────────────────────────────────────────────

export function parseDate(raw: string): string | null {
  if (!raw) return null
  // Try DD/MM/YYYY
  const brMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (brMatch) {
    const [, d, m, y] = brMatch
    const date = new Date(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`)
    return isNaN(date.getTime()) ? null : date.toISOString()
  }
  // Try ISO or US format
  const date = new Date(raw)
  return isNaN(date.getTime()) ? null : date.toISOString()
}

// ── Status normalization ───────────────────────────────────────────────────────

const ACTIVE_PATTERNS   = /^(ativ|active|sim|s|yes|y|1|ativo)$/i
const INACTIVE_PATTERNS = /^(inativ|inactive|não|nao|n|no|0|ex|encerr)$/i
const PROSPECT_PATTERNS = /^(prospect|potencial|lead|novo|new)$/i

export function normalizeStatus(raw: string): AccountStatus {
  if (!raw) return "active"
  if (ACTIVE_PATTERNS.test(raw.trim()))   return "active"
  if (INACTIVE_PATTERNS.test(raw.trim())) return "inactive"
  if (PROSPECT_PATTERNS.test(raw.trim())) return "prospect"
  return "active" // default
}

// ── Pipeline stage inference ───────────────────────────────────────────────────

export function inferPipelineStage(row: Partial<ImportRow>): PipelineStage {
  if (row.status === "inactive") return "lead"
  if (row.status === "prospect") return "lead"

  const hasValue = row.estimated_value != null && row.estimated_value > 0
  const hasFrequency = row.frequency && row.frequency.length > 0
  const isRecurring = /mensal|seman|diári|recorr|fixo|regular/i.test(row.frequency ?? "")

  if (hasValue && isRecurring) return "recurring"
  if (hasValue) return "in_service"
  return "lead"
}

// ── Process all rows ───────────────────────────────────────────────────────────

export function processRows(
  rawRows: RawRow[],
  mapping: ColumnMapping
): ImportRow[] {
  const get = (row: RawRow, field: keyof ColumnMapping) => {
    const col = mapping[field]
    return col ? (row[col] ?? "").trim() : ""
  }

  const namesSeen = new Map<string, string>() // normalized name → first occurrence
  const emailsSeen = new Map<string, string>()
  const phonesSeen = new Map<string, string>()

  const results: ImportRow[] = []

  for (const raw of rawRows) {
    const rawName = get(raw, "name")
    if (!rawName) continue // skip empty rows

    const name = normalizeName(rawName)
    const normalizedKey = name.toLowerCase().replace(/[^a-z0-9]/g, "")

    const contact_email = get(raw, "contact_email") || null
    const rawPhone = get(raw, "phone")
    const phone = normalizePhone(rawPhone)
    const estimated_value = parseValue(get(raw, "estimated_value"))
    const last_contact_at = parseDate(get(raw, "last_contact_at"))
    const status = normalizeStatus(get(raw, "status"))
    const rawNotes = get(raw, "notes")

    // Include phone in notes if present
    const noteParts: string[] = []
    if (rawPhone && !phone) noteParts.push(`Tel: ${rawPhone}`)
    if (rawNotes) noteParts.push(rawNotes)
    const notes = noteParts.join(" | ") || null

    // Duplicate detection
    let _duplicate = false
    let _duplicateOf: string | null = null

    if (namesSeen.has(normalizedKey)) {
      _duplicate = true
      _duplicateOf = namesSeen.get(normalizedKey)!
    } else if (contact_email && emailsSeen.has(contact_email.toLowerCase())) {
      _duplicate = true
      _duplicateOf = emailsSeen.get(contact_email.toLowerCase())!
    } else if (phone && phonesSeen.has(phone)) {
      _duplicate = true
      _duplicateOf = phonesSeen.get(phone)!
    } else {
      namesSeen.set(normalizedKey, name)
      if (contact_email) emailsSeen.set(contact_email.toLowerCase(), name)
      if (phone) phonesSeen.set(phone, name)
    }

    const issues: string[] = []
    if (!contact_email && !phone) issues.push("Sem email ou telefone")
    if (estimated_value === null && get(raw, "estimated_value")) issues.push("Valor inválido")

    const partial: Partial<ImportRow> = { status, estimated_value, frequency: get(raw, "frequency") || null }
    const pipeline_stage = inferPipelineStage(partial)

    results.push({
      name,
      contact_name: get(raw, "contact_name") || null,
      contact_email,
      phone,
      segment: get(raw, "segment") || null,
      status,
      estimated_value,
      frequency: get(raw, "frequency") || null,
      last_contact_at,
      notes,
      pipeline_stage,
      commercial_status: "active",
      _issues: issues,
      _duplicate,
      _duplicateOf,
      _score: null,
      _opportunities: [],
      _segment_group: null,
    })
  }

  return results
}
