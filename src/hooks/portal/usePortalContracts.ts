import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { Contract } from "@/types"
import { deriveContractStatus } from "@/lib/utils"

export function usePortalContracts(tenantId: string, accountId: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ["portal_contracts", tenantId, accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("account_id", accountId)
        .order("ends_at", { ascending: true })

      if (error) throw error

      return (data ?? []).map((c) => ({
        ...c,
        status: deriveContractStatus(c.starts_at, c.ends_at),
      })) as Contract[]
    },
    staleTime: 60_000,
  })
}
