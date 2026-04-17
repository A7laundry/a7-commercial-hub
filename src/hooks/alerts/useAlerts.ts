import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { Alert, AlertStatus } from "@/types"

type AlertFilters = {
  status?: AlertStatus | "all"
  accountId?: string
}

export function useAlerts(tenantId: string, filters: AlertFilters = {}) {
  const supabase = createClient()

  return useQuery<Alert[]>({
    queryKey: ["alerts", tenantId, filters],
    queryFn: async () => {
      let q = supabase
        .from("alerts")
        .select("*, accounts(name)")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })

      if (filters.status && filters.status !== "all") {
        q = q.eq("status", filters.status)
      }
      if (filters.accountId) q = q.eq("account_id", filters.accountId)

      const { data, error } = await q
      if (error) throw error

      return (data ?? []).map((row: Record<string, unknown>) => ({
        ...row,
        account_name: (row.accounts as { name?: string } | null)?.name ?? undefined,
      })) as Alert[]
    },
    staleTime: 30_000,
  })
}
