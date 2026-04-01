import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import {
  computeCommercialScore,
  computeNextBestAction,
  computeOpportunitySignals,
  computeLTV,
  getMessageSuggestions,
  daysSince,
} from "@/lib/commercial-intelligence"
import { deriveContractStatus } from "@/lib/utils"
import type { Account, Contract } from "@/types"

export type OpportunityItem = {
  id: string
  accountId: string
  accountName: string
  signal: string
  action: string
  actionType: "upsell" | "follow_up" | "renewal" | "reactivation"
  severity: "critical" | "warning" | "info"
  detail: string | null
  ltv: number | null
  href: string
  messageText: string | null
}

export function useOpportunities(tenantId: string) {
  const supabase = createClient()

  return useQuery<OpportunityItem[]>({
    queryKey: ["opportunities", tenantId],
    queryFn: async () => {
      const [accountsRes, contractsRes] = await Promise.all([
        supabase
          .from("accounts")
          .select("*")
          .eq("tenant_id", tenantId)
          .in("status", ["active", "prospect"]),
        supabase
          .from("contracts")
          .select("*")
          .eq("tenant_id", tenantId),
      ])

      const accounts = (accountsRes.data ?? []) as Account[]
      const allContracts = (contractsRes.data ?? []) as Contract[]

      const items: OpportunityItem[] = []

      for (const account of accounts) {
        const contracts = allContracts.filter((c) => c.account_id === account.id)
        const score = computeCommercialScore(account, contracts)
        const nba = computeNextBestAction(account, contracts, score)
        const signals = computeOpportunitySignals(account, contracts)
        const ltv = computeLTV(account)
        const suggestions = getMessageSuggestions(account, score, contracts)

        for (const signal of signals) {
          const actionTypeMap: Record<string, OpportunityItem["actionType"]> = {
            stalled_negotiation: "follow_up",
            no_contact:          "reactivation",
            never_contacted:     "reactivation",
            low_value_recurring: "upsell",
            at_risk_status:      "follow_up",
          }

          let actionType: OpportunityItem["actionType"] = actionTypeMap[signal.id] ?? "follow_up"
          let action = nba.label

          if (signal.id.startsWith("expiring_contract")) {
            actionType = "renewal"
            action = "Renovação"
          }
          if (signal.id.startsWith("expired_contract")) {
            actionType = "renewal"
            action = "Renovação urgente"
          }
          if (signal.id === "low_value_recurring") {
            action = "Upsell"
          }
          if (signal.id === "stalled_negotiation") {
            action = "Follow-up"
          }
          if (signal.id === "no_contact" || signal.id === "never_contacted") {
            action = "Reativar contato"
          }

          const msgType = actionType === "follow_up" ? "follow_up"
            : actionType === "upsell" ? "upsell"
            : actionType === "renewal" ? "renewal"
            : "reactivation"
          const suggestion = suggestions.find((s) => s.type === msgType)
            ?? suggestions[0]
            ?? null

          items.push({
            id: `${account.id}-${signal.id}`,
            accountId: account.id,
            accountName: account.name,
            signal: signal.description,
            action,
            actionType,
            severity: signal.severity,
            detail: account.contact_name ?? null,
            ltv,
            href: `/accounts/${account.id}`,
            messageText: suggestion?.text ?? null,
          })
        }
      }

      // Sort: critical → warning → info, then by LTV desc
      return items
        .sort((a, b) => {
          const severityOrder = { critical: 0, warning: 1, info: 2 }
          const diff = severityOrder[a.severity] - severityOrder[b.severity]
          if (diff !== 0) return diff
          return (b.ltv ?? 0) - (a.ltv ?? 0)
        })
        .slice(0, 20)
    },
    staleTime: 60_000,
  })
}
