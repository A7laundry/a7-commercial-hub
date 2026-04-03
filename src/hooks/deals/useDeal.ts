import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { Deal } from "@/types"

export function useDeal(tenantId: string, dealId: string) {
  const supabase = createClient()

  return useQuery<Deal>({
    queryKey: ["deals", tenantId, dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("*, accounts!inner(name)")
        .eq("id", dealId)
        .eq("tenant_id", tenantId)
        .single()

      if (error) throw error

      const row = data as Record<string, unknown>
      const accountJoin = row.accounts as { name?: string } | null
      return {
        ...row,
        account_name: accountJoin?.name ?? undefined,
      } as Deal
    },
    staleTime: 30_000,
  })
}
