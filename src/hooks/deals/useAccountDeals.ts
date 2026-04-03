import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { DEAL_STAGES, DEAL_STAGE_CONFIG } from "./useDeals"
import type { Deal, DealStage } from "@/types"

export type AccountDeal = Deal & {
  stageLabel: string
  stageColor: string
}

export function useAccountDeals(tenantId: string, accountId: string) {
  const supabase = createClient()

  return useQuery<AccountDeal[]>({
    queryKey: ["deals", tenantId, "account", accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("account_id", accountId)
        .order("updated_at", { ascending: false })

      if (error) throw error

      return (data ?? []).map((row) => {
        const stage = row.stage as DealStage
        const config = DEAL_STAGE_CONFIG[stage]
        return {
          ...(row as Deal),
          stageLabel: config?.label ?? stage,
          stageColor: config?.dot ?? "bg-slate-400",
        }
      })
    },
    staleTime: 30_000,
    enabled: !!accountId,
  })
}
