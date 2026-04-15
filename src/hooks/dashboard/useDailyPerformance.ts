import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"

// ── Loss reason labels ────────────────────────────────────────────────────────

export const LOSS_REASON_LABELS: Record<string, string> = {
  only_quote: "Apenas orçamento",
  no_response: "Sem retorno",
  out_of_area: "Fora da área",
  info_only: "Só quis informação",
  price: "Preço alto",
  other: "Outro motivo",
}

// ── Outcome labels & constants ────────────────────────────────────────────────

export const OUTCOME_LABELS: Record<string, string> = {
  sale: "Venda",
  quote_only: "Só orçamento",
  no_response: "Sem retorno",
  out_of_area: "Fora da área",
  info_only: "Só informação",
  lost_price: "Perdeu por preço",
  follow_up_pending: "Follow-up pendente",
}

export const OUTCOME_NEGATIVE = [
  "quote_only",
  "no_response",
  "out_of_area",
  "info_only",
  "lost_price",
]

// ── Output types ──────────────────────────────────────────────────────────────

export type PipelineCount = { stage: string; label: string; count: number }
export type LossReasonCount = { reason: string; label: string; count: number }
export type UnitBreakdown = { unit: string; sales: number; revenue: number }

export type DailyGoal = {
  id?: string
  goal_contacts: number
  goal_sales: number
  goal_revenue: number
}

export type OperatorStat = {
  operator: string
  contacts: number
  sales: number
  revenue: number
  convRate: number   // sales/contacts as 0–100 integer
  topOutcome: string // most frequent non-sale outcome type label
}

export type OutcomeBreakdown = {
  type: string
  label: string
  count: number
  revenue: number
}

export type NewAccountEntry = {
  id: string
  name: string
  client_type: string | null
  pipeline_stage: string
  estimated_value: number | null
  segment: string | null
}

export type DailyPerformanceData = {
  date: string // YYYY-MM-DD
  // WhatsApp
  waContactsTotal: number      // unique phones messaged today
  waAccountsAttended: number   // unique accounts with messages today
  waInbound: number            // inbound messages today
  waOutbound: number           // outbound messages today
  // Sales
  salesClosed: number          // accounts moved to pipeline_stage=closed today
  revenueToday: number         // sum of estimated_value for closed today
  // Pipeline snapshot
  pipelineCounts: PipelineCount[]
  // Loss reasons (updated_at today + commercial_status=lost)
  lossReasons: LossReasonCount[]
  // Unit breakdown (closed today grouped by unit)
  unitBreakdown: UnitBreakdown[]
  // Goal
  goal: DailyGoal | null
  // Interaction outcomes
  outcomes: any[]
  totalOutcomes: number
  salesFromOutcomes: number
  revenueFromOutcomes: number
  conversionContactToSale: number   // outcomes with type=sale / total outcomes (0 if no outcomes)
  conversionAttendedToSale: number  // sales / (total - no_response - out_of_area)
  quoteOnlyCount: number
  followUpPendingCount: number
  operatorBreakdown: OperatorStat[]
  outcomeBreakdown: OutcomeBreakdown[]
  // New accounts registered today
  newAccounts: NewAccountEntry[]
}

// ── Internal constants ────────────────────────────────────────────────────────

const PIPELINE_LABELS: Record<string, string> = {
  lead:       "Lead",
  em_contato: "Em contato",
  proposta:   "Proposta",
  sucesso:    "Sucesso",
  cliente:    "Cliente ativo",
  recorrente: "Recorrente",
}

const PIPELINE_ORDER = ["lead", "em_contato", "proposta", "sucesso", "cliente", "recorrente"]

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useDailyPerformance(tenantId: string, date: string) {
  const supabase = createClient()

  return useQuery<DailyPerformanceData>({
    enabled: !!date,
    queryKey: ["daily_performance", tenantId, date],
    queryFn: async () => {
      const dayStart = new Date(date + "T00:00:00").toISOString()
      const dayEnd = new Date(date + "T23:59:59").toISOString()

      const [
        waMessagesRes,
        closedTodayRes,
        lostTodayRes,
        pipelineSnapshotRes,
        dailyGoalRes,
        outcomesRes,
        newAccountsRes,
      ] = await Promise.all([
        // 1. WhatsApp messages today
        supabase
          .from("whatsapp_messages")
          .select("phone, account_id, direction")
          .eq("tenant_id", tenantId)
          .gte("created_at", dayStart)
          .lte("created_at", dayEnd)
          .limit(5000),

        // 2. Accounts closed today
        supabase
          .from("accounts")
          .select("id, name, estimated_value, unit")
          .eq("tenant_id", tenantId)
          .eq("pipeline_stage", "closed")
          .gte("updated_at", dayStart)
          .lte("updated_at", dayEnd),

        // 3. Accounts lost today (with a loss_reason)
        supabase
          .from("accounts")
          .select("loss_reason")
          .eq("tenant_id", tenantId)
          .eq("commercial_status", "lost")
          .gte("updated_at", dayStart)
          .lte("updated_at", dayEnd)
          .not("loss_reason", "is", null),

        // 4. Full pipeline snapshot (all stages)
        supabase
          .from("accounts")
          .select("pipeline_stage")
          .eq("tenant_id", tenantId)
          .limit(10000),

        // 5. Daily goal for this date (may not exist)
        supabase
          .from("daily_goals")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("date", date)
          .maybeSingle(),

        // 6. Interaction outcomes for the day
        supabase
          .from("interaction_outcomes")
          .select("id, operator_name, unit, outcome_type, revenue_amount, account_id, account_name")
          .eq("tenant_id", tenantId)
          .eq("date", date)
          .order("created_at", { ascending: false })
          .limit(500),

        // 7. New accounts registered today
        supabase
          .from("accounts")
          .select("id, name, client_type, pipeline_stage, estimated_value, segment")
          .eq("tenant_id", tenantId)
          .gte("created_at", dayStart)
          .lte("created_at", dayEnd)
          .order("created_at", { ascending: false }),
      ])

      const waMessages = waMessagesRes.data ?? []
      const closedToday = closedTodayRes.data ?? []
      const lostToday = lostTodayRes.data ?? []
      const pipelineSnapshot = pipelineSnapshotRes.data ?? []
      const outcomes = outcomesRes.data ?? []
      const newAccounts: NewAccountEntry[] = (newAccountsRes.data ?? []).map((a) => ({
        id: a.id,
        name: a.name,
        client_type: a.client_type ?? null,
        pipeline_stage: a.pipeline_stage,
        estimated_value: a.estimated_value ?? null,
        segment: a.segment ?? null,
      }))

      // ── WhatsApp metrics ──────────────────────────────────────────────────

      const uniquePhones = new Set(waMessages.map((m) => m.phone).filter(Boolean))
      const uniqueAccounts = new Set(
        waMessages.map((m) => m.account_id).filter((id): id is string => id != null),
      )

      const waContactsTotal = uniquePhones.size
      const waAccountsAttended = uniqueAccounts.size
      const waInbound = waMessages.filter((m) => m.direction === "inbound").length
      const waOutbound = waMessages.filter((m) => m.direction === "outbound").length

      // ── Sales metrics ─────────────────────────────────────────────────────

      const salesClosed = closedToday.length
      const revenueToday = closedToday.reduce(
        (sum, acc) => sum + (acc.estimated_value ?? 0),
        0,
      )

      // ── Pipeline snapshot ─────────────────────────────────────────────────

      const stageCountMap = new Map<string, number>()
      for (const acc of pipelineSnapshot) {
        if (!acc.pipeline_stage) continue
        stageCountMap.set(acc.pipeline_stage, (stageCountMap.get(acc.pipeline_stage) ?? 0) + 1)
      }

      const pipelineCounts: PipelineCount[] = PIPELINE_ORDER.filter((stage) =>
        stageCountMap.has(stage),
      ).map((stage) => ({
        stage,
        label: PIPELINE_LABELS[stage] ?? stage,
        count: stageCountMap.get(stage) ?? 0,
      }))

      // Include any stage not in the canonical order list
      for (const [stage, count] of stageCountMap.entries()) {
        if (!PIPELINE_ORDER.includes(stage)) {
          pipelineCounts.push({ stage, label: stage, count })
        }
      }

      // ── Loss reasons ──────────────────────────────────────────────────────

      const reasonCountMap = new Map<string, number>()
      for (const acc of lostToday) {
        if (!acc.loss_reason) continue
        reasonCountMap.set(acc.loss_reason, (reasonCountMap.get(acc.loss_reason) ?? 0) + 1)
      }

      const lossReasons: LossReasonCount[] = Array.from(reasonCountMap.entries()).map(
        ([reason, count]) => ({
          reason,
          label: LOSS_REASON_LABELS[reason] ?? reason,
          count,
        }),
      )

      // ── Unit breakdown ────────────────────────────────────────────────────

      const unitMap = new Map<string, { sales: number; revenue: number }>()
      for (const acc of closedToday) {
        const unit = acc.unit ?? "Sem unidade"
        const existing = unitMap.get(unit) ?? { sales: 0, revenue: 0 }
        unitMap.set(unit, {
          sales: existing.sales + 1,
          revenue: existing.revenue + (acc.estimated_value ?? 0),
        })
      }

      const unitBreakdown: UnitBreakdown[] = Array.from(unitMap.entries()).map(
        ([unit, { sales, revenue }]) => ({ unit, sales, revenue }),
      )

      // ── Interaction outcome metrics ───────────────────────────────────────

      const totalOutcomes = outcomes.length
      const salesFromOutcomes = outcomes.filter((o) => o.outcome_type === "sale").length
      const revenueFromOutcomes = outcomes
        .filter((o) => o.outcome_type === "sale")
        .reduce((sum, o) => sum + (o.revenue_amount ?? 0), 0)

      const noResponse = outcomes.filter(
        (o) => o.outcome_type === "no_response" || o.outcome_type === "out_of_area",
      ).length

      const conversionContactToSale =
        totalOutcomes > 0 ? Math.round((salesFromOutcomes / totalOutcomes) * 100) : 0

      const attended = totalOutcomes - noResponse
      const conversionAttendedToSale =
        attended > 0 ? Math.round((salesFromOutcomes / attended) * 100) : 0

      const quoteOnlyCount = outcomes.filter((o) => o.outcome_type === "quote_only").length
      const followUpPendingCount = outcomes.filter(
        (o) => o.outcome_type === "follow_up_pending",
      ).length

      // Operator breakdown
      const operatorMap = new Map<
        string,
        { contacts: number; sales: number; revenue: number; nonSaleTypes: string[] }
      >()
      for (const o of outcomes) {
        const op = o.operator_name ?? "Desconhecido"
        const existing = operatorMap.get(op) ?? {
          contacts: 0,
          sales: 0,
          revenue: 0,
          nonSaleTypes: [],
        }
        existing.contacts += 1
        if (o.outcome_type === "sale") {
          existing.sales += 1
          existing.revenue += o.revenue_amount ?? 0
        } else if (o.outcome_type) {
          existing.nonSaleTypes.push(o.outcome_type)
        }
        operatorMap.set(op, existing)
      }

      const operatorBreakdown: OperatorStat[] = Array.from(operatorMap.entries())
        .map(([operator, stats]) => {
          // Find most frequent non-sale outcome type
          const typeFreq = new Map<string, number>()
          for (const t of stats.nonSaleTypes) {
            typeFreq.set(t, (typeFreq.get(t) ?? 0) + 1)
          }
          let topOutcomeType = ""
          let topCount = 0
          for (const [t, c] of typeFreq.entries()) {
            if (c > topCount) {
              topCount = c
              topOutcomeType = t
            }
          }
          return {
            operator,
            contacts: stats.contacts,
            sales: stats.sales,
            revenue: stats.revenue,
            convRate: Math.round((stats.sales / stats.contacts) * 100),
            topOutcome: topOutcomeType ? (OUTCOME_LABELS[topOutcomeType] ?? topOutcomeType) : "—",
          }
        })
        .sort((a, b) => b.sales - a.sales)

      // Outcome breakdown
      const outcomeTypeMap = new Map<string, { count: number; revenue: number }>()
      for (const o of outcomes) {
        const t = o.outcome_type ?? "unknown"
        const existing = outcomeTypeMap.get(t) ?? { count: 0, revenue: 0 }
        existing.count += 1
        existing.revenue += o.revenue_amount ?? 0
        outcomeTypeMap.set(t, existing)
      }

      const outcomeBreakdown: OutcomeBreakdown[] = Array.from(outcomeTypeMap.entries())
        .map(([type, { count, revenue }]) => ({
          type,
          label: OUTCOME_LABELS[type] ?? type,
          count,
          revenue,
        }))
        .sort((a, b) => b.count - a.count)

      return {
        date,
        waContactsTotal,
        waAccountsAttended,
        waInbound,
        waOutbound,
        salesClosed,
        revenueToday,
        pipelineCounts,
        lossReasons,
        unitBreakdown,
        goal: dailyGoalRes.data ?? null,
        outcomes,
        totalOutcomes,
        salesFromOutcomes,
        revenueFromOutcomes,
        conversionContactToSale,
        conversionAttendedToSale,
        quoteOnlyCount,
        followUpPendingCount,
        operatorBreakdown,
        outcomeBreakdown,
        newAccounts,
      }
    },
    staleTime: 30_000,
  })
}

// ── Mutation hook ─────────────────────────────────────────────────────────────

export function useSaveDailyGoal(tenantId: string, date: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (goal: Omit<DailyGoal, "id">) => {
      const { data, error } = await supabase
        .from("daily_goals")
        .upsert(
          { tenant_id: tenantId, date, ...goal },
          { onConflict: "tenant_id,date" },
        )
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily_performance", tenantId, date] })
    },
  })
}
