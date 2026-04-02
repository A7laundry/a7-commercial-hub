import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { Deal, DealStage } from "@/types"

export const DEAL_STAGES: DealStage[] = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
]

export const DEAL_STAGE_CONFIG: Record<
  DealStage,
  { label: string; color: string; headerBg: string; dot: string }
> = {
  new:         { label: "Novo",          color: "border-slate-200",  headerBg: "bg-slate-50",   dot: "bg-slate-400" },
  contacted:   { label: "Contactado",    color: "border-blue-200",   headerBg: "bg-blue-50",    dot: "bg-blue-500" },
  qualified:   { label: "Qualificado",   color: "border-indigo-200", headerBg: "bg-indigo-50",  dot: "bg-indigo-500" },
  proposal:    { label: "Proposta",      color: "border-purple-200", headerBg: "bg-purple-50",  dot: "bg-purple-500" },
  negotiation: { label: "Negociação",    color: "border-amber-200",  headerBg: "bg-amber-50",   dot: "bg-amber-500" },
  won:         { label: "Ganho",         color: "border-green-200",  headerBg: "bg-green-50",   dot: "bg-green-500" },
  lost:        { label: "Perdido",       color: "border-red-200",    headerBg: "bg-red-50",     dot: "bg-red-500" },
}

export type DealsBoard = Record<DealStage, Deal[]>

export type DealsStats = {
  total: number
  byStage: Record<DealStage, { count: number; value: number }>
  totalValue: number
  wonValue: number
  conversionRate: number
}

export function useDeals(tenantId: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ["deals", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select(`
          *,
          accounts!inner(name)
        `)
        .eq("tenant_id", tenantId)
        .order("updated_at", { ascending: false })

      if (error) throw error

      // Build board grouped by stage
      const board = DEAL_STAGES.reduce((acc, stage) => {
        acc[stage] = []
        return acc
      }, {} as DealsBoard)

      for (const row of data ?? []) {
        const deal: Deal = {
          ...row,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          account_name: (row as any).accounts?.name ?? undefined,
        }
        const stage = deal.stage as DealStage
        if (board[stage]) {
          board[stage].push(deal)
        }
      }

      // Compute stats
      const stats: DealsStats = {
        total: (data ?? []).length,
        byStage: DEAL_STAGES.reduce((acc, stage) => {
          const stageDeals = board[stage]
          acc[stage] = {
            count: stageDeals.length,
            value: stageDeals.reduce((s, d) => s + (d.value ?? 0), 0),
          }
          return acc
        }, {} as DealsStats["byStage"]),
        totalValue: (data ?? []).reduce((s, d) => s + (Number(d.value) || 0), 0),
        wonValue: 0,
        conversionRate: 0,
      }

      stats.wonValue = board.won.reduce((s, d) => s + (d.value ?? 0), 0)
      const closedDeals = board.won.length + board.lost.length
      stats.conversionRate = closedDeals > 0
        ? Math.round((board.won.length / closedDeals) * 100)
        : 0

      return { board, stats }
    },
    staleTime: 30_000,
  })
}

export function useDealsRefetch(tenantId: string) {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: ["deals", tenantId] })
}
