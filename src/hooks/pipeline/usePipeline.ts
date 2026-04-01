import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { Account, PipelineStage } from "@/types"

export const PIPELINE_STAGES: PipelineStage[] = [
  "lead",
  "in_service",
  "quote_sent",
  "negotiating",
  "closed",
  "recurring",
]

export const STAGE_CONFIG: Record<
  PipelineStage,
  { label: string; color: string; headerBg: string; dot: string }
> = {
  lead:        { label: "Lead",          color: "border-slate-200",  headerBg: "bg-slate-50",   dot: "bg-slate-400" },
  in_service:  { label: "Em serviço",    color: "border-blue-200",   headerBg: "bg-blue-50",    dot: "bg-blue-500" },
  quote_sent:  { label: "Proposta",      color: "border-purple-200", headerBg: "bg-purple-50",  dot: "bg-purple-500" },
  negotiating: { label: "Negociando",    color: "border-amber-200",  headerBg: "bg-amber-50",   dot: "bg-amber-500" },
  closed:      { label: "Fechado",       color: "border-green-200",  headerBg: "bg-green-50",   dot: "bg-green-500" },
  recurring:   { label: "Recorrente",    color: "border-emerald-200",headerBg: "bg-emerald-50", dot: "bg-emerald-500" },
}

export type PipelineBoard = Record<PipelineStage, Account[]>

export type PipelineStats = {
  totalAccounts: number
  totalEstimatedValue: number
  byStage: Record<PipelineStage, { count: number; value: number }>
}

export function usePipeline(tenantId: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ["pipeline", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("name")
        .limit(10000)

      if (error) throw error

      const accounts = (data ?? []) as Account[]

      const board = PIPELINE_STAGES.reduce((acc, stage) => {
        acc[stage] = accounts.filter((a) => a.pipeline_stage === stage)
        return acc
      }, {} as PipelineBoard)

      const stats: PipelineStats = {
        totalAccounts: accounts.length,
        totalEstimatedValue: accounts.reduce((s, a) => s + (a.estimated_value ?? 0), 0),
        byStage: PIPELINE_STAGES.reduce((acc, stage) => {
          const stageAccounts = board[stage]
          acc[stage] = {
            count: stageAccounts.length,
            value: stageAccounts.reduce((s, a) => s + (a.estimated_value ?? 0), 0),
          }
          return acc
        }, {} as PipelineStats["byStage"]),
      }

      return { board, stats }
    },
    staleTime: 30_000,
  })
}
