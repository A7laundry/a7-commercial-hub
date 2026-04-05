/**
 * Operational Insights Engine — pure functions, zero external deps.
 * Derives actionable insights from accounts, contracts, and deals at render time.
 * Each insight represents a pattern that requires attention.
 */

import type { Account, Contract, Deal } from "@/types"
import { daysSince, daysUntil, computeCommercialScore, computeLTV } from "./commercial-intelligence"
import { deriveContractStatus } from "./utils"

export type InsightSeverity = "critical" | "warning" | "info"

export type Insight = {
  id: string
  title: string
  description: string
  count: number
  value?: string         // monetary value when relevant
  severity: InsightSeverity
  href: string
  actionLabel: string
}

// ── Individual insight computers ──────────────────────────────────────────────

/** Contracts expiring in the next 30 days */
function insightContractsExpiring(contracts: Contract[]): Insight | null {
  const expiring = contracts.filter((c) => {
    const d = daysUntil(c.ends_at)
    return d !== null && d >= 0 && d <= 30 && c.status !== "cancelled"
  })
  if (expiring.length === 0) return null
  const total = expiring.reduce((sum, c) => sum + c.total_value, 0)
  return {
    id: "contracts_expiring",
    title: `${expiring.length} contrato${expiring.length !== 1 ? "s" : ""} vence${expiring.length !== 1 ? "m" : ""} em 30 dias`,
    description: "Renove antes do vencimento para evitar ruptura.",
    count: expiring.length,
    value: total > 0
      ? total.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
      : undefined,
    severity: "critical",
    href: "/contracts?status=expiring",
    actionLabel: "Ver contratos",
  }
}

/** Active accounts with no contact in 45+ days */
function insightSilentClients(accounts: Account[]): Insight | null {
  const silent = accounts.filter((a) => {
    if (a.status !== "active") return false
    const d = daysSince(a.last_contact_at)
    return d === null || d >= 45
  })
  if (silent.length === 0) return null
  const ltv = silent.reduce((sum, a) => sum + (computeLTV(a) ?? 0), 0)
  return {
    id: "silent_clients",
    title: `${silent.length} cliente${silent.length !== 1 ? "s" : ""} sem contato há 45+ dias`,
    description: "Clientes ativos esquecidos têm alto risco de churn.",
    count: silent.length,
    value: ltv > 0
      ? ltv.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }) + " em LTV"
      : undefined,
    severity: "warning",
    href: "/accounts",
    actionLabel: "Ver clientes",
  }
}

/** Accounts at commercial risk */
function insightAtRiskAccounts(accounts: Account[]): Insight | null {
  const atRisk = accounts.filter((a) => a.commercial_status === "at_risk")
  if (atRisk.length === 0) return null
  const ltv = atRisk.reduce((sum, a) => sum + (computeLTV(a) ?? 0), 0)
  return {
    id: "at_risk_accounts",
    title: `${atRisk.length} conta${atRisk.length !== 1 ? "s" : ""} em risco`,
    description: "Clientes em risco de perda. Aja antes que saiam.",
    count: atRisk.length,
    value: ltv > 0
      ? ltv.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }) + " em risco"
      : undefined,
    severity: "critical",
    href: "/accounts",
    actionLabel: "Ver em risco",
  }
}

/** Hot/warm accounts with no active proposal */
function insightHotWithoutProposal(accounts: Account[], deals: Deal[]): Insight | null {
  const activeDealsPerAccount = new Set(
    deals
      .filter((d) => d.stage === "proposal" || d.stage === "negotiation")
      .map((d) => d.account_id)
  )
  const hotNoProposal = accounts.filter((a) => {
    const score = computeCommercialScore(a, [])
    return (score === "hot" || score === "upsell") && !activeDealsPerAccount.has(a.id)
  })
  if (hotNoProposal.length === 0) return null
  const ltv = hotNoProposal.reduce((sum, a) => sum + (computeLTV(a) ?? 0), 0)
  return {
    id: "hot_without_proposal",
    title: `${hotNoProposal.length} conta${hotNoProposal.length !== 1 ? "s" : ""} quente${hotNoProposal.length !== 1 ? "s" : ""} sem proposta`,
    description: "Clientes com alto potencial esperando uma oferta.",
    count: hotNoProposal.length,
    value: ltv > 0
      ? ltv.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }) + " em LTV"
      : undefined,
    severity: "warning",
    href: "/deals",
    actionLabel: "Criar deal",
  }
}

/** Deals stalled for 30+ days without stage change */
function insightStalledDeals(deals: Deal[]): Insight | null {
  const active = deals.filter((d) => d.stage !== "won" && d.stage !== "lost")
  const stalled = active.filter((d) => {
    const d2 = daysSince(d.updated_at)
    return d2 !== null && d2 >= 30
  })
  if (stalled.length === 0) return null
  const total = stalled.reduce((sum, d) => sum + (d.value ?? 0), 0)
  return {
    id: "stalled_deals",
    title: `${stalled.length} deal${stalled.length !== 1 ? "s" : ""} parado${stalled.length !== 1 ? "s" : ""} há 30+ dias`,
    description: "Oportunidades sem evolução perdem momentum e convertem menos.",
    count: stalled.length,
    value: total > 0
      ? total.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
      : undefined,
    severity: "warning",
    href: "/deals",
    actionLabel: "Ver pipeline",
  }
}

/** High-value deals near closing (negotiation stage) */
function insightDealsNearClose(deals: Deal[]): Insight | null {
  const nearClose = deals.filter((d) => d.stage === "negotiation" && (d.value ?? 0) > 0)
  if (nearClose.length === 0) return null
  const total = nearClose.reduce((sum, d) => sum + (d.value ?? 0), 0)
  return {
    id: "deals_near_close",
    title: `${nearClose.length} deal${nearClose.length !== 1 ? "s" : ""} em negociação`,
    description: "Estão a um passo do fechamento — priorize esses agora.",
    count: nearClose.length,
    value: total.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }),
    severity: "info",
    href: "/deals",
    actionLabel: "Fechar deals",
  }
}

// ── Main function ─────────────────────────────────────────────────────────────

const SEVERITY_ORDER: Record<InsightSeverity, number> = { critical: 0, warning: 1, info: 2 }

export function computeInsights(
  accounts: Account[],
  contracts: Contract[],
  deals: Deal[],
): Insight[] {
  const raw = [
    insightAtRiskAccounts(accounts),
    insightContractsExpiring(contracts),
    insightSilentClients(accounts),
    insightHotWithoutProposal(accounts, deals),
    insightStalledDeals(deals),
    insightDealsNearClose(deals),
  ]

  return raw
    .filter((i): i is Insight => i !== null)
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
}
