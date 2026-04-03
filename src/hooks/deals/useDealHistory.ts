import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { DEAL_STAGE_CONFIG } from "./useDeals"
import type { DealStage } from "@/types"

export type DealHistoryEntry = {
  id: string
  from_stage: DealStage | null
  to_stage: DealStage
  changed_at: string
  notes: string | null
  fromLabel: string | null
  toLabel: string
}

export function useDealHistory(tenantId: string, dealId: string | null) {
  const supabase = createClient()

  return useQuery<DealHistoryEntry[]>({
    queryKey: ["deal-history", tenantId, dealId],
    enabled: Boolean(dealId),
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_stage_history")
        .select("id, from_stage, to_stage, changed_at, notes")
        .eq("tenant_id", tenantId)
        .eq("deal_id", dealId!)
        .order("changed_at", { ascending: true })

      return (data ?? []).map((row) => ({
        id: row.id,
        from_stage: (row.from_stage as DealStage | null) ?? null,
        to_stage: row.to_stage as DealStage,
        changed_at: row.changed_at,
        notes: row.notes ?? null,
        fromLabel: row.from_stage ? (DEAL_STAGE_CONFIG[row.from_stage as DealStage]?.label ?? row.from_stage) : null,
        toLabel: DEAL_STAGE_CONFIG[row.to_stage as DealStage]?.label ?? row.to_stage,
      }))
    },
    staleTime: 30_000,
  })
}
