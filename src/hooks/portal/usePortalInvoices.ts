import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { Invoice } from "@/types"

export function usePortalInvoices(tenantId: string, accountId: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ["portal_invoices", tenantId, accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("account_id", accountId)
        .order("due_date", { ascending: false })

      if (error) throw error
      return (data ?? []) as Invoice[]
    },
    staleTime: 60_000,
  })
}
