import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"

/**
 * Lightweight hook that returns only the count of open alerts for a tenant.
 * Uses head:true so no row data is fetched — minimal overhead.
 * Designed for the sidebar badge; React Query deduplicates concurrent callers.
 */
export function useOpenAlertsCount(tenantId: string) {
  const supabase = createClient()

  return useQuery<number>({
    queryKey: ["alerts:open-count", tenantId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("alerts")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("status", "open")

      if (error) throw error
      return count ?? 0
    },
    staleTime: 10_000,
  })
}
