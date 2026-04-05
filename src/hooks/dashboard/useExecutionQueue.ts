import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import {
  computeCommercialScore,
  computeLTV,
  daysSince,
} from "@/lib/commercial-intelligence"
import { evaluateRules, computeFinalScore } from "@/lib/execution-rules"
import { MESSAGE_TEMPLATES, interpolateTemplate } from "@/lib/message-templates"
import { getMessageSuggestions } from "@/lib/commercial-intelligence"
import type { Account, Contract, Deal, Alert } from "@/types"
import type { RuleActionType } from "@/lib/execution-rules"

export type ExecutionItem = {
  id: string
  accountId: string
  accountName: string
  contactName: string | null
  phone: string | null
  priorityScore: number             // 0–100, computed from matched rule
  urgency: "urgent" | "high" | "normal"
  actionLabel: string               // "Reativar cliente", "Follow-up urgente", etc.
  actionType: RuleActionType
  reason: string                    // specific context from the matched rule
  detail: string | null
  ltv: number | null
  href: string
  messageText: string
  dealId: string | null
  dealTitle: string | null
  alertId: string | null
  ruleId: string                    // which rule triggered this item
  // Memory context
  lastActionSummary: string | null
  lastActionType: string | null
  lastActionAt: string | null
  consecutiveUnanswered: number
}

type TimelineEvent = {
  account_id: string
  event_type: string
  summary: string | null
  created_at: string
}

type WaMessage = {
  account_id: string
  direction: "inbound" | "outbound"
  received_at: string
}

export function useExecutionQueue(tenantId: string) {
  const supabase = createClient()

  return useQuery<ExecutionItem[]>({
    queryKey: ["execution_queue", tenantId],
    queryFn: async () => {
      const [
        accountsRes, contractsRes, dealsRes, alertsRes, snoozesRes,
        timelineRes, waMessagesRes,
      ] = await Promise.all([
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
        supabase
          .from("account_timeline")
          .select("account_id, event_type, summary, created_at")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("whatsapp_messages")
          .select("account_id, direction, received_at")
          .eq("tenant_id", tenantId)
          .order("received_at", { ascending: false })
          .limit(1000),
      ])

      const accounts   = (accountsRes.data   ?? []) as Account[]
      const contracts  = (contractsRes.data  ?? []) as Contract[]
      const deals      = (dealsRes.data      ?? []) as Deal[]
      const alerts     = (alertsRes.data     ?? []) as Alert[]
      const timelineEvents = (timelineRes.data    ?? []) as TimelineEvent[]
      const waMessages     = (waMessagesRes.data  ?? []) as WaMessage[]

      // ── Snoozed accounts ────────────────────────────────────────────────────
      const snoozedIds = new Set(
        (snoozesRes.data ?? []).map((s: { account_id: string }) => s.account_id)
      )

      // ── Index: contracts by account ─────────────────────────────────────────
      const contractsByAccount = new Map<string, Contract[]>()
      for (const c of contracts) {
        const list = contractsByAccount.get(c.account_id) ?? []
        list.push(c)
        contractsByAccount.set(c.account_id, list)
      }

      // ── Index: most-stalled active deal per account ─────────────────────────
      const stalledDealByAccount = new Map<string, Deal>()
      for (const d of deals) {
        if (d.stage === "negotiation" || d.stage === "proposal") {
          const existing = stalledDealByAccount.get(d.account_id)
          const dDays = daysSince(d.updated_at) ?? 0
          const eDays = existing ? (daysSince(existing.updated_at) ?? 0) : -1
          if (!existing || dDays > eDays) stalledDealByAccount.set(d.account_id, d)
        }
      }

      // ── Index: most severe open alert per account ───────────────────────────
      const alertByAccount = new Map<string, Alert>()
      const severityOrder = { critical: 0, warning: 1, info: 2 }
      for (const a of alerts) {
        if (!a.account_id) continue
        const existing = alertByAccount.get(a.account_id)
        if (!existing || severityOrder[a.severity] < severityOrder[existing.severity]) {
          alertByAccount.set(a.account_id, a)
        }
      }

      // ── Index: most recent timeline event per account ───────────────────────
      const lastTimelineByAccount = new Map<string, TimelineEvent>()
      for (const evt of timelineEvents) {
        if (!lastTimelineByAccount.has(evt.account_id)) {
          lastTimelineByAccount.set(evt.account_id, evt)
        }
      }

      // ── Index: last message_sent event per account ─────────────────────────
      const lastMessageSentByAccount = new Map<string, TimelineEvent>()
      for (const evt of timelineEvents) {
        if (evt.event_type === "message_sent" && !lastMessageSentByAccount.has(evt.account_id)) {
          lastMessageSentByAccount.set(evt.account_id, evt)
        }
      }

      // ── Index: consecutive unanswered outbound WA messages per account ──────
      const consecutiveOutboundByAccount = new Map<string, number>()
      const waByAccount = new Map<string, WaMessage[]>()
      for (const msg of waMessages) {
        const list = waByAccount.get(msg.account_id) ?? []
        list.push(msg)
        waByAccount.set(msg.account_id, list)
      }
      for (const [accountId, msgs] of waByAccount) {
        let count = 0
        for (const msg of msgs) { // already ordered desc
          if (msg.direction === "outbound") count++
          else break
        }
        consecutiveOutboundByAccount.set(accountId, count)
      }

      // ── Evaluate rules for each account ────────────────────────────────────
      const items: ExecutionItem[] = []

      for (const account of accounts) {
        if (snoozedIds.has(account.id)) continue

        const acctContracts       = contractsByAccount.get(account.id)  ?? []
        const stalledDeal         = stalledDealByAccount.get(account.id) ?? null
        const openAlert           = alertByAccount.get(account.id)       ?? null
        const lastTimeline        = lastTimelineByAccount.get(account.id) ?? null
        const lastMessageSent     = lastMessageSentByAccount.get(account.id) ?? null
        const consecutiveUnanswered = consecutiveOutboundByAccount.get(account.id) ?? 0

        const commScore       = computeCommercialScore(account, acctContracts)
        const daysSinceContact = daysSince(account.last_contact_at) ?? 999

        const ctx = {
          account,
          contracts: acctContracts,
          stalledDeal,
          openAlert,
          consecutiveUnanswered,
          lastMessageSentAt: lastMessageSent?.created_at ?? null,
          daysSinceContact,
          commScore,
        }

        const matched = evaluateRules(ctx, 25)
        if (!matched) continue

        const priorityScore = computeFinalScore(matched)
        const ltv = computeLTV(account)

        // Build message text for the composer
        const suggestions = getMessageSuggestions(account, commScore, acctContracts)
        const msgTypeMap: Record<RuleActionType, "follow_up" | "reactivation" | "renewal" | "upsell"> = {
          follow_up:   "follow_up",
          qualify:     "follow_up",
          proposal:    "follow_up",
          call:        "follow_up",
          reactivation:"reactivation",
          renewal:     "renewal",
          upsell:      "upsell",
        }
        const msgType = msgTypeMap[matched.actionType]
        const suggestion = suggestions.find((s) => s.type === msgType) ?? suggestions[0]
        const tpl = MESSAGE_TEMPLATES[msgType] ?? MESSAGE_TEMPLATES.follow_up
        const messageText = suggestion?.text ?? interpolateTemplate(tpl.text, {
          name: account.contact_name ?? account.name,
          service: account.segment ?? account.name,
        })

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
          actionLabel: matched.actionLabel,
          actionType: matched.actionType,
          reason: matched.reason,
          detail: account.next_action ?? null,
          ltv,
          href: `/accounts/${account.id}`,
          messageText,
          dealId: stalledDeal?.id ?? null,
          dealTitle: stalledDeal?.title ?? null,
          alertId: openAlert?.id ?? null,
          ruleId: matched.ruleId,
          lastActionSummary: lastTimeline?.summary ?? null,
          lastActionType: lastTimeline?.event_type ?? null,
          lastActionAt: lastTimeline?.created_at ?? null,
          consecutiveUnanswered,
        })
      }

      return items
        .sort((a, b) => b.priorityScore - a.priorityScore)
        .slice(0, 40)
    },
    staleTime: 30_000,
  })
}
