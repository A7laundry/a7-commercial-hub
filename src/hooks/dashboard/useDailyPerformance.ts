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
}

// ── Internal constants ────────────────────────────────────────────────────────

const PIPELINE_LABELS: Record<string, string> = {
  lead: "Lead",
  in_service: "Em serviço",
  quote_sent: "Proposta",
  negotiating: "Negociando",
  closed: "Fechado",
  recurring: "Recorrente",
}

const PIPELINE_ORDER = ["lead", "in_service", "quote_sent", "negotiating", "closed", "recurring"]

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useDailyPerformance(tenantId: string, date: string) {
  const supabase = createClient()

  return useQuery<DailyPerformanceData>({
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
      ])

      const waMessages = waMessagesRes.data ?? []
      const closedToday = closedTodayRes.data ?? []
      const lostToday = lostTodayRes.data ?? []
      const pipelineSnapshot = pipelineSnapshotRes.data ?? []

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
