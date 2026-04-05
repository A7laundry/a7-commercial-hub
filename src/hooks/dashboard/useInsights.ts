import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { computeInsights, type Insight } from "@/lib/insights"
import { deriveContractStatus } from "@/lib/utils"
import type { Account, Contract, Deal } from "@/types"

export function useInsights(tenantId: string) {
  const supabase = createClient()

  return useQuery<Insight[]>({
    queryKey: ["insights", tenantId],
    queryFn: async () => {
      const [accountsRes, contractsRes, dealsRes] = await Promise.all([
        supabase
          .from("accounts")
          .select("id, name, status, commercial_status, pipeline_stage, last_contact_at, estimated_value, frequency")
          .eq("tenant_id", tenantId)
          .in("status", ["active", "prospect"]),
        supabase
          .from("contracts")
          .select("id, title, account_id, total_value, starts_at, ends_at, status, auto_renew")
          .eq("tenant_id", tenantId),
        supabase
          .from("deals")
          .select("id, account_id, title, value, stage, updated_at")
          .eq("tenant_id", tenantId)
          .not("stage", "in", '("won","lost")'),
      ])

      const accounts = (accountsRes.data ?? []) as Account[]
      const contracts = (contractsRes.data ?? []).map((c) => ({
        ...c,
        status: deriveContractStatus(c.starts_at, c.ends_at),
      })) as Contract[]
      const deals = (dealsRes.data ?? []) as Deal[]

      return computeInsights(accounts, contracts, deals)
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
  })
}
