import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"

export function useAccountPhone(tenantId: string, accountId: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ["account_phone", tenantId, accountId],
    queryFn: async () => {
      const { data } = await supabase
        .from("phone_mappings")
        .select("phone")
        .eq("tenant_id", tenantId)
        .eq("account_id", accountId)
        .limit(1)
        .maybeSingle()
      return data?.phone ?? null
    },
    staleTime: 300_000,
  })
}
