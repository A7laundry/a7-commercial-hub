import { useEffect, useRef } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import {
  computeCommercialScore,
  computeLTV,
  daysSince,
} from "@/lib/commercial-intelligence"
import { evaluateRules, computeFinalScore } from "@/lib/execution-rules"
import { MESSAGE_VARIANTS, interpolateTemplate } from "@/lib/message-templates"
import { getMessageSuggestions } from "@/lib/commercial-intelligence"
import type { Account, Contract, Deal, Alert } from "@/types"
import type { RuleActionType, RuleContext, MatchedRule } from "@/lib/execution-rules"

export type EscalationLevel = 0 | 1 | 2 | 3

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
  daysOverdue: number               // days past expected contact interval (0 if not overdue)
  // Memory context
  lastActionSummary: string | null
  lastActionType: string | null
  lastActionAt: string | null
  consecutiveUnanswered: number
  // Escalation context (T4)
  escalationLevel: EscalationLevel  // 0=normal, 1=attention, 2=change approach, 3=urgent/switch channel
  escalationReason: string | null   // human-readable explanation of strategy change
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

// ── Escalation computation ────────────────────────────────────────────────────

function computeEscalation(
  ctx: RuleContext,
  matched: MatchedRule,
): { level: EscalationLevel; reason: string | null } {
  const ltv = computeLTV(ctx.account) ?? 0

  // Consecutive unanswered takes priority — it's the strongest signal
  if (ctx.consecutiveUnanswered >= 3) {
    return {
      level: 3,
      reason: `${ctx.consecutiveUnanswered} mensagens ignoradas — mude de canal`,
    }
  }
  if (ctx.consecutiveUnanswered === 2) {
    return {
      level: 2,
      reason: "2ª tentativa ignorada — seja mais direto",
    }
  }
  if (ctx.consecutiveUnanswered === 1) {
    return {
      level: 1,
      reason: "Aguardando retorno da última mensagem",
    }
  }

  // Days overdue pressure
  if (matched.daysOverdue >= 21) {
    return {
      level: 3,
      reason: `${matched.daysOverdue}d de atraso — ação imediata`,
    }
  }
  if (matched.daysOverdue >= 14) {
    return {
      level: 2,
      reason: `${matched.daysOverdue}d de atraso — mude a abordagem`,
    }
  }
  if (matched.daysOverdue >= 7) {
    return { level: 1, reason: `${matched.daysOverdue}d de atraso` }
  }

  // High-value at-risk client
  if (ctx.account.commercial_status === "at_risk" && ltv > 50_000) {
    return {
      level: 3,
      reason: "Cliente de alto valor em risco — intervenção prioritária",
    }
  }

  return { level: 0, reason: null }
}

// ── Variant selection based on escalation level ───────────────────────────────
// Level 0-1 → V1 (formal), Level 2 → V2 (casual/human), Level 3 → V3 (brief/direct)

function pickVariantIdx(escalationLevel: EscalationLevel, variantCount: number): number {
  const preferred = escalationLevel <= 1 ? 0 : escalationLevel === 2 ? 1 : 2
  return Math.min(preferred, variantCount - 1)
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useExecutionQueue(tenantId: string) {
  const supabase = createClient()
  const qc = useQueryClient()
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Realtime: account_timeline INSERT → debounced queue invalidation ────────
  useEffect(() => {
    if (!tenantId) return

    const channel = supabase
      .channel(`realtime:exec:${tenantId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "account_timeline",
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          if (debounceTimer.current) clearTimeout(debounceTimer.current)
          debounceTimer.current = setTimeout(() => {
            qc.invalidateQueries({ queryKey: ["execution_queue", tenantId] })
          }, 5_000)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, qc])

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
          .eq("tenant_id", tenantId)
          .limit(1000),
        supabase
          .from("deals")
          .select("*")
          .eq("tenant_id", tenantId)
          .not("stage", "in", '("won","lost")')
          .order("updated_at", { ascending: true })
          .limit(500),
        supabase
          .from("alerts")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("status", "open")
          .limit(300),
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

        const acctContracts         = contractsByAccount.get(account.id)  ?? []
        const stalledDeal           = stalledDealByAccount.get(account.id) ?? null
        const openAlert             = alertByAccount.get(account.id)       ?? null
        const lastTimeline          = lastTimelineByAccount.get(account.id) ?? null
        const lastMessageSent       = lastMessageSentByAccount.get(account.id) ?? null
        const consecutiveUnanswered = consecutiveOutboundByAccount.get(account.id) ?? 0

        const commScore        = computeCommercialScore(account, acctContracts)
        const daysSinceContact = daysSince(account.last_contact_at) ?? 999

        const ctx: RuleContext = {
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

        // ── Escalation level + reason ───────────────────────────────────────
        const { level: escalationLevel, reason: escalationReason } =
          computeEscalation(ctx, matched)

        // ── Message variant — chosen by escalation context ──────────────────
        const msgTypeMap: Record<RuleActionType, "follow_up" | "reactivation" | "renewal" | "upsell"> = {
          follow_up:    "follow_up",
          qualify:      "follow_up",
          proposal:     "follow_up",
          call:         "follow_up",
          reactivation: "reactivation",
          renewal:      "renewal",
          upsell:       "upsell",
        }
        const msgType = msgTypeMap[matched.actionType]
        const variants = MESSAGE_VARIANTS[msgType]
        const variantIdx = pickVariantIdx(escalationLevel, variants.length)
        const chosenVariant = variants[variantIdx]

        const suggestions = getMessageSuggestions(account, commScore, acctContracts)
        const suggestion = suggestions.find((s) => s.type === msgType)

        // Level 0-1: prefer getMessageSuggestions (contextual) over template
        // Level 2-3: use escalation-aware variant directly (more precise)
        const messageText = escalationLevel <= 1 && suggestion
          ? suggestion.text
          : interpolateTemplate(chosenVariant.text, {
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
          daysOverdue: matched.daysOverdue,
          lastActionSummary: lastTimeline?.summary ?? null,
          lastActionType: lastTimeline?.event_type ?? null,
          lastActionAt: lastTimeline?.created_at ?? null,
          consecutiveUnanswered,
          escalationLevel,
          escalationReason,
        })
      }

      return items
        .sort((a, b) => b.priorityScore - a.priorityScore)
        .slice(0, 100)
    },
    staleTime: 30_000,
  })
}
