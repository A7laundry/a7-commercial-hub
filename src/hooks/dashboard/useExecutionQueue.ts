import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import {
  computeCommercialScore,
  computeNextBestAction,
  computeLTV,
  getMessageSuggestions,
  daysSince,
} from "@/lib/commercial-intelligence"
import { MESSAGE_TEMPLATES, interpolateTemplate } from "@/lib/message-templates"
import type { Account, Contract, Deal, Alert } from "@/types"

export type ExecutionItem = {
  id: string
  accountId: string
  accountName: string
  contactName: string | null
  phone: string | null
  priorityScore: number // 0-100
  urgency: "urgent" | "high" | "normal"
  actionLabel: string
  actionType: "follow_up" | "reactivation" | "renewal" | "upsell" | "qualify" | "proposal"
  reason: string
  detail: string | null
  ltv: number | null
  href: string
  messageText: string
  dealId: string | null
  dealTitle: string | null
  alertId: string | null
}

function computePriorityScore(
  account: Account,
  contracts: Contract[],
  stalledDeal: Deal | null,
  openAlert: Alert | null
): number {
  const score = computeCommercialScore(account, contracts)
  const days = daysSince(account.last_contact_at) ?? 999
  const ltv = computeLTV(account) ?? 0

  let base = 20

  // Commercial score baseline
  if (account.commercial_status === "at_risk") base = 90
  else if (score === "at_risk")                base = 85
  else if (score === "hot")                    base = 70
  else if (score === "upsell")                 base = 60
  else if (score === "cold" && days > 60)      base = 55
  else if (score === "cold")                   base = 45
  else if (score === "warm" && account.pipeline_stage === "quote_sent") base = 55
  else if (score === "warm")                   base = 35

  // Stalled deal boost
  if (stalledDeal) {
    const dealDays = daysSince(stalledDeal.updated_at) ?? 0
    if (dealDays > 14) base = Math.max(base, 80)
    else if (dealDays > 7) base = Math.max(base, 65)
  }

  // Critical alert boost
  if (openAlert?.severity === "critical") base = Math.max(base, 80)
  else if (openAlert?.severity === "warning") base = Math.max(base, 65)

  // Modifiers
  if (ltv > 100_000) base = Math.min(100, base + 8)
  else if (ltv > 50_000) base = Math.min(100, base + 5)

  if (stalledDeal?.value && stalledDeal.value > 10_000) base = Math.min(100, base + 5)

  // Recently contacted → lower urgency
  if (days <= 3) base = Math.max(0, base - 15)

  return Math.min(100, Math.max(0, base))
}

export function useExecutionQueue(tenantId: string) {
  const supabase = createClient()

  return useQuery<ExecutionItem[]>({
    queryKey: ["execution_queue", tenantId],
    queryFn: async () => {
      const [accountsRes, contractsRes, dealsRes, alertsRes, snoozesRes] = await Promise.all([
        supabase
          .from("accounts")
          .select("*, phone_mappings(phone)")
          .eq("tenant_id", tenantId)
          .in("status", ["active", "prospect"])
          .limit(10000),
        supabase
          .from("contracts")
          .select("*")
          .eq("tenant_id", tenantId),
        supabase
          .from("deals")
          .select("*")
          .eq("tenant_id", tenantId)
          .not("stage", "in", '("won","lost")')
          .order("updated_at", { ascending: true }),
        supabase
          .from("alerts")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("status", "open"),
        supabase
          .from("execution_snoozes")
          .select("account_id, snoozed_until")
          .eq("tenant_id", tenantId)
          .gt("snoozed_until", new Date().toISOString()),
      ])

      const accounts = (accountsRes.data ?? []) as Account[]
      const contracts = (contractsRes.data ?? []) as Contract[]
      const deals = (dealsRes.data ?? []) as Deal[]
      const alerts = (alertsRes.data ?? []) as Alert[]

      // Build snooze set — accounts to skip
      const snoozedAccountIds = new Set(
        (snoozesRes.data ?? []).map((s: { account_id: string }) => s.account_id)
      )

      // Index contracts, deals, alerts by account_id
      const contractsByAccount = new Map<string, Contract[]>()
      for (const c of contracts) {
        const list = contractsByAccount.get(c.account_id) ?? []
        list.push(c)
        contractsByAccount.set(c.account_id, list)
      }

      const stalledDealByAccount = new Map<string, Deal>()
      for (const d of deals) {
        if ((d.stage === "negotiation" || d.stage === "proposal") && !stalledDealByAccount.has(d.account_id)) {
          stalledDealByAccount.set(d.account_id, d)
        }
      }

      const alertByAccount = new Map<string, Alert>()
      for (const a of alerts) {
        if (!a.account_id) continue
        // Keep the most severe
        const existing = alertByAccount.get(a.account_id)
        const order = { critical: 0, warning: 1, info: 2 }
        if (!existing || order[a.severity] < order[existing.severity]) {
          alertByAccount.set(a.account_id, a)
        }
      }

      const items: ExecutionItem[] = []

      for (const account of accounts.filter((a) => !snoozedAccountIds.has(a.id))) {
        const acctContracts = contractsByAccount.get(account.id) ?? []
        const stalledDeal = stalledDealByAccount.get(account.id) ?? null
        const openAlert = alertByAccount.get(account.id) ?? null

        const commScore = computeCommercialScore(account, acctContracts)
        const nba = computeNextBestAction(account, acctContracts, commScore)
        const priorityScore = computePriorityScore(account, acctContracts, stalledDeal, openAlert)
        const ltv = computeLTV(account)

        // Skip low-priority warm/recurring accounts with recent contact
        if (priorityScore < 25) continue

        // Determine action type
        const actionType = nba.type === "follow_up" || nba.type === "qualify" || nba.type === "proposal"
          ? nba.type
          : nba.type as ExecutionItem["actionType"]

        // Message
        const suggestions = getMessageSuggestions(account, commScore, acctContracts)
        const msgTypeMap: Record<string, ExecutionItem["actionType"]> = {
          follow_up: "follow_up",
          qualify: "follow_up",
          proposal: "follow_up",
          reactivation: "reactivation",
          renewal: "renewal",
          upsell: "upsell",
        }
        const msgType = msgTypeMap[nba.type] ?? "follow_up"
        const suggestion = suggestions.find((s) => s.type === msgType) ?? suggestions[0]

        const tplKey = msgType === "reactivation" ? "reactivation"
          : msgType === "renewal" ? "renewal"
          : msgType === "upsell" ? "upsell"
          : "follow_up"
        const tpl = MESSAGE_TEMPLATES[tplKey]
        const messageText = suggestion?.text ?? interpolateTemplate(tpl.text, {
          name: account.contact_name ?? account.name,
          service: account.segment ?? account.name,
        })

        // Reason string
        let reason = nba.description
        if (stalledDeal) {
          const stalledDays = daysSince(stalledDeal.updated_at) ?? 0
          reason = stalledDays > 7
            ? `Deal "${stalledDeal.title}" parado há ${stalledDays} dias`
            : reason
        }
        if (openAlert?.severity === "critical") {
          reason = openAlert.title
        }

        // Phone: first from phone_mappings
        const mappings = account.phone_mappings as { phone: string }[] | undefined
        const phone = mappings?.[0]?.phone ?? null

        items.push({
          id: account.id,
          accountId: account.id,
          accountName: account.name,
          contactName: account.contact_name,
          phone,
          priorityScore,
          urgency: priorityScore >= 75 ? "urgent" : priorityScore >= 50 ? "high" : "normal",
          actionLabel: nba.label,
          actionType,
          reason,
          detail: account.next_action ?? null,
          ltv,
          href: `/accounts/${account.id}`,
          messageText,
          dealId: stalledDeal?.id ?? null,
          dealTitle: stalledDeal?.title ?? null,
          alertId: openAlert?.id ?? null,
        })
      }

      return items
        .sort((a, b) => b.priorityScore - a.priorityScore)
        .slice(0, 40)
    },
    staleTime: 30_000,
  })
}
