/**
 * Import intelligence — derives commercial score, opportunities, and segmentation
 * from import rows. No DB access. Pure functions.
 */

import type { ImportRow } from "./normalizer"

type Score = "hot" | "warm" | "cold" | "at_risk" | "upsell"
type SegmentGroup = "high_value" | "recurring" | "inactive" | "lead" | "upsell"

// ── Score derivation ───────────────────────────────────────────────────────────

function daysSince(iso: string | null): number | null {
  if (!iso) return null
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

function deriveScore(row: ImportRow): Score {
  const days = daysSince(row.last_contact_at)
  const hasValue = (row.estimated_value ?? 0) > 0
  const isRecurring = /mensal|seman|diári|recorr|fixo/i.test(row.frequency ?? "")

  if (row.status === "inactive" && hasValue) return "at_risk"
  if (row.status === "inactive") return "cold"

  if (hasValue && isRecurring && (days === null || days <= 30)) return "hot"
  if (hasValue && isRecurring) return "upsell" // recurring but long without contact
  if (hasValue && days !== null && days <= 30) return "warm"
  if (hasValue) return "warm"
  if (days !== null && days > 60) return "cold"

  return "cold" // no value, no recent contact
}

function deriveOpportunities(row: ImportRow, score: Score): string[] {
  const ops: string[] = []
  const days = daysSince(row.last_contact_at)
  const value = row.estimated_value ?? 0

  if (score === "at_risk") ops.push("Reativar cliente — conta inativa com histórico de valor")
  if (score === "upsell") ops.push("Upsell — cliente recorrente sem contato recente")
  if (score === "cold" && value > 0) ops.push("Follow-up — cliente com valor sem contato recente")
  if (days !== null && days > 90) ops.push(`Sem contato há ${days} dias`)
  if (value > 5000) ops.push("Alto valor — prioridade comercial")
  if (row.pipeline_stage === "recurring" && value < 3000) ops.push("Potencial de expansão de contrato")

  return ops
}

function deriveSegmentGroup(row: ImportRow, score: Score): SegmentGroup {
  const value = row.estimated_value ?? 0
  const isRecurring = row.pipeline_stage === "recurring"

  if (row.status === "inactive") return "inactive"
  if (value > 5000) return "high_value"
  if (isRecurring) return "recurring"
  if (score === "upsell") return "upsell"
  if (value === 0 && !row.contact_email && !row.phone) return "lead"

  return "lead"
}

// ── Enrich all rows ────────────────────────────────────────────────────────────

export function analyzeRows(rows: ImportRow[]): ImportRow[] {
  return rows.map((row) => {
    const score = deriveScore(row)
    const opportunities = deriveOpportunities(row, score)
    const segment_group = deriveSegmentGroup(row, score)

    return {
      ...row,
      commercial_status: score === "at_risk" ? "at_risk" : "active",
      _score: score,
      _opportunities: opportunities,
      _segment_group: segment_group,
    }
  })
}

// ── Summary statistics ─────────────────────────────────────────────────────────

export type ImportSummaryStats = {
  total: number
  unique: number
  duplicates: number
  withIssues: number
  byScore: Record<Score, number>
  bySegment: Record<SegmentGroup, number>
  totalEstimatedValue: number
  highValueCount: number
  priorityList: ImportRow[]   // top 10 to contact first
  sdrTargets: ImportRow[]     // reactivation + cold outreach
  closerTargets: ImportRow[]  // upsell + high value
  messages: Record<string, string[]>
}

export function buildSummary(rows: ImportRow[]): ImportSummaryStats {
  const unique = rows.filter((r) => !r._duplicate)
  const duplicates = rows.filter((r) => r._duplicate).length
  const withIssues = unique.filter((r) => r._issues.length > 0).length

  const byScore: Record<Score, number> = { hot: 0, warm: 0, cold: 0, at_risk: 0, upsell: 0 }
  const bySegment: Record<SegmentGroup, number> = { high_value: 0, recurring: 0, inactive: 0, lead: 0, upsell: 0 }

  let totalEstimatedValue = 0

  for (const row of unique) {
    if (row._score) byScore[row._score]++
    if (row._segment_group) bySegment[row._segment_group]++
    totalEstimatedValue += row.estimated_value ?? 0
  }

  const highValueCount = unique.filter((r) => (r.estimated_value ?? 0) > 5000).length

  // Priority: hot + high value first, then at_risk, then upsell
  const priorityList = [...unique]
    .filter((r) => r._score === "hot" || r._score === "at_risk" || r._score === "upsell")
    .sort((a, b) => {
      const scoreOrder: Record<string, number> = { hot: 0, at_risk: 1, upsell: 2 }
      const aOrder = scoreOrder[a._score ?? ""] ?? 9
      const bOrder = scoreOrder[b._score ?? ""] ?? 9
      if (aOrder !== bOrder) return aOrder - bOrder
      return (b.estimated_value ?? 0) - (a.estimated_value ?? 0)
    })
    .slice(0, 10)

  const sdrTargets = unique
    .filter((r) => r._score === "cold" || r._score === "at_risk" || r.status === "inactive")
    .sort((a, b) => (b.estimated_value ?? 0) - (a.estimated_value ?? 0))
    .slice(0, 15)

  const closerTargets = unique
    .filter((r) => r._score === "hot" || r._score === "upsell" || (r.estimated_value ?? 0) > 3000)
    .sort((a, b) => (b.estimated_value ?? 0) - (a.estimated_value ?? 0))
    .slice(0, 15)

  return {
    total: rows.length,
    unique: unique.length,
    duplicates,
    withIssues,
    byScore,
    bySegment,
    totalEstimatedValue,
    highValueCount,
    priorityList,
    sdrTargets,
    closerTargets,
    messages: buildMessageTemplates(unique),
  }
}

function buildMessageTemplates(rows: ImportRow[]): Record<string, string[]> {
  const reactivation = rows
    .filter((r) => r.status === "inactive" || r._score === "at_risk")
    .slice(0, 3)
    .map(
      (r) =>
        `Olá${r.contact_name ? ", " + r.contact_name.split(" ")[0] : ""}! Aqui é da equipe comercial. Temos novidades e gostaríamos de retomar o contato com a ${r.name}. Tem disponibilidade para uma conversa rápida esta semana?`
    )

  const upsell = rows
    .filter((r) => r._score === "upsell" || r._segment_group === "high_value")
    .slice(0, 3)
    .map(
      (r) =>
        `Olá${r.contact_name ? ", " + r.contact_name.split(" ")[0] : ""}! Identificamos uma oportunidade de ampliar nossa parceria com a ${r.name}. Temos uma proposta especial preparada. Podemos conversar ainda essa semana?`
    )

  const followUp = rows
    .filter((r) => r._score === "cold" && (r.estimated_value ?? 0) > 0)
    .slice(0, 3)
    .map(
      (r) =>
        `Olá${r.contact_name ? ", " + r.contact_name.split(" ")[0] : ""}! Como estão as coisas na ${r.name}? Passando para verificar se está tudo certo com nossos serviços e se há algo que possamos melhorar. 😊`
    )

  return { reactivation, upsell, followUp }
}
