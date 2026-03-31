import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { PortalClient } from "@/types"

export type PortalClientWithAccount = PortalClient & {
  account_name: string
}

export function usePortalClients(tenantId: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ["portal_clients", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portal_clients")
        .select("*, accounts(name)")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })

      if (error) throw error

      return (data ?? []).map((row) => ({
        ...row,
        account_name: (row.accounts as { name: string } | null)?.name ?? "—",
      })) as PortalClientWithAccount[]
    },
    staleTime: 30_000,
  })
}
