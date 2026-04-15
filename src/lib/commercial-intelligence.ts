/**
 * Commercial Intelligence — pure functions, zero external deps.
 * Derives score, next best action, opportunity signals, and message suggestions
 * from account + contract data available at render time.
 */

import type { Account, Contract } from "@/types"
import { deriveContractStatus } from "@/lib/utils"

// ── Types ──────────────────────────────────────────────────────────────────────

export type CommercialScore = "hot" | "warm" | "cold" | "at_risk" | "upsell"

export type NextBestAction = {
  label: string
  description: string
  priority: "urgent" | "high" | "normal"
  type: "follow_up" | "proposal" | "reactivation" | "upsell" | "renewal" | "qualify"
}

export type OpportunitySignal = {
  id: string
  label: string
  description: string
  severity: "critical" | "warning" | "info"
}

export type MessageSuggestion = {
  type: "follow_up" | "upsell" | "reactivation" | "renewal"
  label: string
  text: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

export function daysSince(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

/**
 * Parse frequency string → times per month.
 * Examples: "semanal" → 4.3, "quinzenal" → 2, "mensal" → 1, "diário" → 30
 * Falls back to 1 (mensal) when unrecognizable.
 */
export function parseFrequencyPerMonth(frequency: string | null | undefined): number {
  if (!frequency) return 1

  const f = frequency.toLowerCase().trim()

  // explicit numeric: "3x/mês", "2x semana", "4 vezes", etc.
  const nxMonth = f.match(/(\d+(?:\.\d+)?)\s*[x×\/]\s*m[eê]s/)
  if (nxMonth) return parseFloat(nxMonth[1])

  const nxWeek = f.match(/(\d+(?:\.\d+)?)\s*[x×\/]\s*sem/)
  if (nxWeek) return parseFloat(nxWeek[1]) * 4.3

  const nxDay = f.match(/(\d+(?:\.\d+)?)\s*[x×\/]\s*dia/)
  if (nxDay) return parseFloat(nxDay[1]) * 30

  // keywords
  if (/diári|diario|daily/.test(f))                return 30
  if (/3[x×]\s*sem|três\s*vez.*sem/.test(f))       return 13
  if (/2[x×]\s*sem|duas?\s*vez.*sem/.test(f))      return 8.6
  if (/seman|weekly|semana/.test(f))                return 4.3
  if (/quinzenal|quinzena|biweekly|15\s*dias/.test(f)) return 2
  if (/mensal|monthly|m[eê]s/.test(f))              return 1
  if (/bimestral|bimestre|60\s*dias/.test(f))       return 0.5
  if (/trimestral|trimestre|90\s*dias/.test(f))     return 0.33
  if (/anual|annually|ano/.test(f))                 return 1 / 12

  // bare number → treat as times per month
  const bare = parseFloat(f)
  if (!isNaN(bare) && bare > 0) return bare

  return 1
}

/**
 * LTV = estimated_value × frequency_per_month × avg_lifetime_months
 * avg_lifetime_months defaults to 12 (one year) — reasonable for B2B laundry.
 */
export function computeLTV(
  account: Account,
  avgLifetimeMonths = 12
): number | null {
  if (account.estimated_value == null) return null
  const freq = parseFrequencyPerMonth(account.frequency)
  return account.estimated_value * freq * avgLifetimeMonths
}

// ── Commercial Score ───────────────────────────────────────────────────────────

export function computeCommercialScore(
  account: Account,
  contracts: Contract[]
): CommercialScore {
  const daysSinceContact = daysSince(account.last_contact_at)

  // at_risk: explicit commercial_status or stalled negotiation
  if (account.commercial_status === "at_risk") return "at_risk"
  if (
    account.pipeline_stage === "proposta" &&
    daysSinceContact !== null &&
    daysSinceContact > 14
  ) return "at_risk"

  // upsell: recorrente/sucesso account with expiring contract
  const hasExpiringContract = contracts.some((c) => {
    const status = deriveContractStatus(c.starts_at, c.ends_at)
    return status === "expiring" || status === "active"
  })
  if (
    (account.pipeline_stage === "recorrente" || account.pipeline_stage === "sucesso") &&
    hasExpiringContract
  ) return "upsell"

  // hot: recently contacted + active negotiation phase
  if (
    daysSinceContact !== null &&
    daysSinceContact <= 7 &&
    account.pipeline_stage === "proposta"
  ) return "hot"

  // cold: no contact in 30+ days
  if (daysSinceContact === null || daysSinceContact > 30) return "cold"

  return "warm"
}

export const SCORE_CONFIG: Record<
  CommercialScore,
  { label: string; color: string; bg: string; dot: string }
> = {
  hot:   { label: "Quente",    color: "text-orange-700", bg: "bg-orange-100", dot: "bg-orange-500" },
  warm:  { label: "Morno",     color: "text-yellow-700", bg: "bg-yellow-100", dot: "bg-yellow-500" },
  cold:  { label: "Frio",      color: "text-blue-700",   bg: "bg-blue-100",   dot: "bg-blue-500" },
  at_risk: { label: "Em risco", color: "text-red-700",   bg: "bg-red-100",    dot: "bg-red-500" },
  upsell: { label: "Upsell",   color: "text-emerald-700",bg: "bg-emerald-100",dot: "bg-emerald-500" },
}

// ── Next Best Action ───────────────────────────────────────────────────────────

export function computeNextBestAction(
  account: Account,
  contracts: Contract[],
  score: CommercialScore
): NextBestAction {
  const daysSinceContact = daysSince(account.last_contact_at)

  if (account.commercial_status === "lost") {
    return {
      label: "Tentar reativação",
      description: "Conta marcada como perdida. Considere uma abordagem diferenciada para retomada.",
      priority: "normal",
      type: "reactivation",
    }
  }

  if (score === "at_risk") {
    return {
      label: "Contato urgente",
      description: account.pipeline_stage === "proposta"
        ? `Proposta parada há ${daysSinceContact} dias. Ligue ou envie mensagem hoje.`
        : "Conta em risco. Identifique o bloqueio e aja agora.",
      priority: "urgent",
      type: "follow_up",
    }
  }

  if (score === "upsell") {
    const expiringContract = contracts.find((c) => {
      const status = deriveContractStatus(c.starts_at, c.ends_at)
      return status === "expiring"
    })
    const days = expiringContract ? daysUntil(expiringContract.ends_at) : null
    return {
      label: "Propor renovação",
      description: days !== null
        ? `Contrato vence em ${days} dias. Apresente proposta de renovação ou upgrade.`
        : "Cliente recorrente com potencial de expansão. Agende uma revisão de contrato.",
      priority: "high",
      type: "renewal",
    }
  }

  if (account.pipeline_stage === "proposta") {
    const d = daysSinceContact ?? 0
    return {
      label: "Follow-up de proposta",
      description: d > 7
        ? `Proposta enviada há mais de ${d} dias sem resposta. Faça o follow-up.`
        : "Proposta enviada recentemente. Agende follow-up para 7 dias após envio.",
      priority: d > 7 ? "high" : "normal",
      type: "follow_up",
    }
  }

  if (account.pipeline_stage === "lead") {
    return {
      label: "Qualificar lead",
      description: "Entenda o potencial, necessidade e urgência antes de avançar no funil.",
      priority: "normal",
      type: "qualify",
    }
  }

  if (score === "cold") {
    return {
      label: "Reativar contato",
      description: daysSinceContact
        ? `Sem contato há ${daysSinceContact} dias. Envie uma mensagem de check-in.`
        : "Conta sem histórico de contato. Inicie o relacionamento.",
      priority: "high",
      type: "reactivation",
    }
  }

  // default warm / in_service / recurring
  return {
    label: "Manter relacionamento",
    description: account.next_action
      ? account.next_action
      : "Continue o acompanhamento regular e registre interações.",
    priority: "normal",
    type: "follow_up",
  }
}

// ── Opportunity Signals ────────────────────────────────────────────────────────

export function computeOpportunitySignals(
  account: Account,
  contracts: Contract[]
): OpportunitySignal[] {
  const signals: OpportunitySignal[] = []
  const daysSinceContact = daysSince(account.last_contact_at)

  // Stalled proposal
  if (account.pipeline_stage === "proposta" && daysSinceContact !== null && daysSinceContact > 14) {
    signals.push({
      id: "stalled_negotiation",
      label: "Proposta parada",
      description: `Sem movimentação há ${daysSinceContact} dias nesta etapa.`,
      severity: "critical",
    })
  }

  // Long without contact
  if (daysSinceContact !== null && daysSinceContact > 30) {
    signals.push({
      id: "no_contact",
      label: "Sem contato recente",
      description: `Último contato há ${daysSinceContact} dias.`,
      severity: "warning",
    })
  } else if (daysSinceContact === null) {
    signals.push({
      id: "never_contacted",
      label: "Sem histórico de contato",
      description: "Nenhum contato registrado para esta conta.",
      severity: "warning",
    })
  }

  // Expiring contract
  contracts.forEach((c) => {
    const status = deriveContractStatus(c.starts_at, c.ends_at)
    if (status === "expiring") {
      const days = daysUntil(c.ends_at)
      signals.push({
        id: `expiring_contract_${c.id}`,
        label: "Contrato vencendo",
        description: `"${c.title}" vence em ${days} dias.`,
        severity: days !== null && days <= 15 ? "critical" : "warning",
      })
    }
    if (status === "expired") {
      signals.push({
        id: `expired_contract_${c.id}`,
        label: "Contrato vencido",
        description: `"${c.title}" está vencido sem renovação.`,
        severity: "critical",
      })
    }
  })

  // Low estimated value vs recurring potential
  if (
    account.pipeline_stage === "recorrente" &&
    account.estimated_value !== null &&
    account.estimated_value < 5000
  ) {
    signals.push({
      id: "low_value_recurring",
      label: "Potencial de expansão",
      description: "Cliente recorrente com valor estimado abaixo do potencial. Avalie upsell.",
      severity: "info",
    })
  }

  // At risk explicit
  if (account.commercial_status === "at_risk") {
    signals.push({
      id: "at_risk_status",
      label: "Status de risco",
      description: "Conta marcada manualmente como em risco comercial.",
      severity: "critical",
    })
  }

  return signals
}

// ── Message Suggestions ────────────────────────────────────────────────────────

export function getMessageSuggestions(
  account: Account,
  score: CommercialScore,
  contracts: Contract[]
): MessageSuggestion[] {
  const name = account.contact_name ?? account.name
  const expiringContract = contracts.find(
    (c) => deriveContractStatus(c.starts_at, c.ends_at) === "expiring"
  )

  const suggestions: MessageSuggestion[] = [
    {
      type: "follow_up",
      label: "Follow-up geral",
      text: `Olá, ${name}! Tudo bem? Queria passar para verificar como está sendo a experiência com nossos serviços e se há algo que possamos melhorar. Ficamos à disposição! 😊`,
    },
    {
      type: "reactivation",
      label: "Reativação de contato",
      text: `Olá, ${name}! Faz um tempo que não conversamos e queria retomar o contato. Temos novidades que podem ser relevantes para vocês. Podemos agendar uma conversa rápida?`,
    },
  ]

  if (score === "upsell" || account.pipeline_stage === "recorrente") {
    suggestions.push({
      type: "upsell",
      label: "Oportunidade de expansão",
      text: `Olá, ${name}! Como nosso cliente recorrente, identificamos uma oportunidade de ampliarmos nossa parceria. Temos uma proposta especial que gostaria de apresentar. Tem disponibilidade essa semana?`,
    })
  }

  if (expiringContract) {
    const days = daysUntil(expiringContract.ends_at)
    suggestions.push({
      type: "renewal",
      label: "Renovação de contrato",
      text: `Olá, ${name}! Nosso contrato "${expiringContract.title}" vence em ${days} dias e gostaríamos de garantir a continuidade dos nossos serviços para vocês. Podemos conversar sobre a renovação esta semana?`,
    })
  }

  if (account.pipeline_stage === "proposta") {
    suggestions.push({
      type: "follow_up",
      label: "Follow-up de proposta",
      text: `Olá, ${name}! Enviei nossa proposta recentemente e queria saber se tiveram oportunidade de analisar. Estou disponível para tirar dúvidas ou ajustar qualquer ponto conforme a necessidade de vocês.`,
    })
  }

  return suggestions
}
