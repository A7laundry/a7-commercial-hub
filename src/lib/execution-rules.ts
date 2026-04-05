/**
 * Execution Rules Engine
 *
 * Declarative rules: each rule has a condition (match) and produces
 * a specific named action with a reason and base priority score.
 *
 * Rules are evaluated in order (highest baseScore first).
 * The FIRST matching rule produces the execution item.
 *
 * To add a new rule: append to EXECUTION_RULES, set baseScore relative
 * to existing rules, write a match() + reason() + optionally adjust score
 * based on context (e.g., LTV, days overdue).
 */

import type { Account, Contract, Deal, Alert } from "@/types"
import { computeCommercialScore, computeLTV, daysSince, daysUntil } from "./commercial-intelligence"
import { deriveContractStatus } from "./utils"

export type RuleActionType =
  | "follow_up"
  | "reactivation"
  | "renewal"
  | "upsell"
  | "qualify"
  | "proposal"
  | "call"

export type RuleContext = {
  account: Account
  contracts: Contract[]
  stalledDeal: Deal | null          // deal in negotiation/proposal stage
  openAlert: Alert | null
  consecutiveUnanswered: number     // consecutive outbound WA messages without reply
  lastMessageSentAt: string | null  // last message_sent timeline event timestamp
  daysSinceContact: number          // from account.last_contact_at (or 999 if never)
  commScore: ReturnType<typeof computeCommercialScore>
}

export type MatchedRule = {
  ruleId: string
  actionLabel: string
  actionType: RuleActionType
  reason: string
  baseScore: number
  scoreModifier: number             // LTV boost, urgency override, etc.
}

type ExecutionRule = {
  id: string
  label: string
  actionType: RuleActionType
  baseScore: number
  match: (ctx: RuleContext) => boolean
  reason: (ctx: RuleContext) => string
  /** Optional extra modifier on top of baseScore (e.g. +LTV, +days) */
  modifier?: (ctx: RuleContext) => number
}

// ── Rules (highest priority first) ────────────────────────────────────────────

const EXECUTION_RULES: ExecutionRule[] = [
  // ── Critical: immediate action required ────────────────────────────────────

  {
    id: "critical_alert",
    label: "Resolver alerta crítico",
    actionType: "follow_up",
    baseScore: 95,
    match: (ctx) => ctx.openAlert?.severity === "critical",
    reason: (ctx) => ctx.openAlert!.title,
  },

  {
    id: "at_risk_commercial",
    label: "Risco de perda — agir agora",
    actionType: "reactivation",
    baseScore: 90,
    match: (ctx) => ctx.account.commercial_status === "at_risk",
    reason: (ctx) => ctx.stalledDeal
      ? `Negociação "${ctx.stalledDeal.title}" parou · conta em risco comercial`
      : `Conta marcada como em risco · identifique o bloqueio e aja hoje`,
  },

  // ── High: pattern requires specific action ─────────────────────────────────

  {
    id: "ignored_change_approach",
    label: "Mudar abordagem — tente ligação",
    actionType: "call",
    baseScore: 85,
    match: (ctx) => ctx.consecutiveUnanswered >= 3,
    reason: (ctx) => `${ctx.consecutiveUnanswered} mensagens sem resposta · enviar mais não adianta`,
    modifier: (ctx) => ctx.consecutiveUnanswered >= 5 ? 5 : 0,
  },

  {
    id: "negotiation_stalled_14d",
    label: "Desbloquear negociação",
    actionType: "proposal",
    baseScore: 82,
    match: (ctx) => {
      if (!ctx.stalledDeal || ctx.stalledDeal.stage !== "negotiation") return false
      return (daysSince(ctx.stalledDeal.updated_at) ?? 0) >= 14
    },
    reason: (ctx) => {
      const d = daysSince(ctx.stalledDeal!.updated_at) ?? 0
      return `Negociação "${ctx.stalledDeal!.title}" parada há ${d}d — feche ou descarte`
    },
  },

  {
    id: "message_followup_urgent",
    label: "Follow-up urgente",
    actionType: "follow_up",
    baseScore: 78,
    match: (ctx) => {
      if (!ctx.lastMessageSentAt) return false
      return (daysSince(ctx.lastMessageSentAt) ?? 0) >= 10
    },
    reason: (ctx) => {
      const d = daysSince(ctx.lastMessageSentAt!) ?? 0
      return `Mensagem enviada há ${d}d sem retorno — siga em frente ou encerre`
    },
  },

  {
    id: "contract_expiring",
    label: "Renovar contrato",
    actionType: "renewal",
    baseScore: 75,
    match: (ctx) => {
      const expiring = ctx.contracts.find((c) => {
        const status = deriveContractStatus(c.starts_at, c.ends_at)
        return status === "expiring"
      })
      return !!expiring
    },
    reason: (ctx) => {
      const c = ctx.contracts.find((c) => deriveContractStatus(c.starts_at, c.ends_at) === "expiring")!
      const d = daysUntil(c.ends_at) ?? 0
      return `Contrato "${c.title}" vence em ${d} dias — apresente proposta de renovação`
    },
  },

  {
    id: "warning_alert",
    label: "Responder alerta",
    actionType: "follow_up",
    baseScore: 70,
    match: (ctx) => ctx.openAlert?.severity === "warning",
    reason: (ctx) => ctx.openAlert!.title,
  },

  {
    id: "proposal_followup_7d",
    label: "Follow-up de proposta",
    actionType: "follow_up",
    baseScore: 68,
    match: (ctx) => {
      if (ctx.account.pipeline_stage !== "quote_sent") return false
      return ctx.daysSinceContact >= 7
    },
    reason: (ctx) => `Proposta enviada há ${ctx.daysSinceContact}d sem resposta — faça o acompanhamento`,
  },

  {
    id: "negotiation_stalled_7d",
    label: "Avançar negociação",
    actionType: "proposal",
    baseScore: 65,
    match: (ctx) => {
      if (!ctx.stalledDeal || ctx.stalledDeal.stage !== "negotiation") return false
      return (daysSince(ctx.stalledDeal.updated_at) ?? 0) >= 7
    },
    reason: (ctx) => {
      const d = daysSince(ctx.stalledDeal!.updated_at) ?? 0
      return `Negociação "${ctx.stalledDeal!.title}" parada há ${d}d — defina próximo passo`
    },
  },

  {
    id: "message_followup_pending",
    label: "Follow-up pendente",
    actionType: "follow_up",
    baseScore: 58,
    match: (ctx) => {
      if (!ctx.lastMessageSentAt) return false
      const d = daysSince(ctx.lastMessageSentAt) ?? 0
      return d >= 2 && d < 10
    },
    reason: (ctx) => {
      const d = daysSince(ctx.lastMessageSentAt!) ?? 0
      return `Mensagem enviada há ${d}d sem retorno — hora do follow-up`
    },
  },

  // ─── THE KEY RULE: 45 days silent active client → reativar cliente ──────────

  {
    id: "silent_client_45d",
    label: "Reativar cliente",
    actionType: "reactivation",
    baseScore: 55,
    match: (ctx) => ctx.account.status === "active" && ctx.daysSinceContact >= 45,
    reason: (ctx) => `Sem contato há ${ctx.daysSinceContact} dias · cliente ativo esquecido`,
    modifier: (ctx) => {
      // Extra urgency for very long silence
      const extra = Math.min(20, Math.floor((ctx.daysSinceContact - 45) / 15) * 5)
      return extra
    },
  },

  {
    id: "upsell_opportunity",
    label: "Oportunidade de upsell",
    actionType: "upsell",
    baseScore: 50,
    match: (ctx) => ctx.commScore === "upsell",
    reason: () => "Cliente recorrente com potencial de expansão — apresente proposta de upgrade",
  },

  {
    id: "qualify_lead",
    label: "Qualificar lead",
    actionType: "qualify",
    baseScore: 40,
    match: (ctx) => ctx.account.pipeline_stage === "lead",
    reason: () => "Entenda o potencial, necessidade e urgência antes de avançar no funil",
  },

  {
    id: "cold_client_30d",
    label: "Reativar contato",
    actionType: "reactivation",
    baseScore: 38,
    match: (ctx) => ctx.commScore === "cold" && ctx.daysSinceContact >= 30,
    reason: (ctx) => `Sem contato há ${ctx.daysSinceContact} dias — envie uma mensagem de check-in`,
  },

  {
    id: "routine_contact",
    label: "Manter relacionamento",
    actionType: "follow_up",
    baseScore: 28,
    match: () => true, // catch-all — always matches
    reason: (ctx) => ctx.account.next_action ?? "Continue o acompanhamento regular",
  },
]

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Evaluate rules for a given account context and return the first match.
 * Returns null if no rule with baseScore >= minScore matches.
 */
export function evaluateRules(ctx: RuleContext, minScore = 25): MatchedRule | null {
  for (const rule of EXECUTION_RULES) {
    if (rule.baseScore < minScore) continue
    if (!rule.match(ctx)) continue

    const ltv = computeLTV(ctx.account) ?? 0
    const ltvBonus = ltv > 100_000 ? 8 : ltv > 50_000 ? 5 : 0
    const dealValueBonus = ctx.stalledDeal?.value && ctx.stalledDeal.value > 10_000 ? 5 : 0
    const recentContactPenalty = ctx.daysSinceContact <= 3 ? -15 : 0
    const patternModifier = rule.modifier?.(ctx) ?? 0

    return {
      ruleId: rule.id,
      actionLabel: rule.label,
      actionType: rule.actionType,
      reason: rule.reason(ctx),
      baseScore: rule.baseScore,
      scoreModifier: ltvBonus + dealValueBonus + recentContactPenalty + patternModifier,
    }
  }
  return null
}

/** Compute final priority score from a matched rule */
export function computeFinalScore(matched: MatchedRule): number {
  return Math.min(100, Math.max(0, matched.baseScore + matched.scoreModifier))
}
