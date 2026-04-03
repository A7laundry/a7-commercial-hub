import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { Document } from "@/types"

export function useDocument(tenantId: string, documentId: string) {
  const supabase = createClient()

  return useQuery<Document & { account_name?: string; contract_title?: string }>({
    queryKey: ["documents", tenantId, documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*, accounts(name), contracts(title)")
        .eq("id", documentId)
        .eq("tenant_id", tenantId)
        .single()

      if (error) throw error

      const row = data as Record<string, unknown>
      const accountJoin = row.accounts as { name?: string } | null
      const contractJoin = row.contracts as { title?: string } | null

      return {
        ...row,
        account_name: accountJoin?.name ?? undefined,
        contract_title: contractJoin?.title ?? undefined,
      } as Document & { account_name?: string; contract_title?: string }
    },
    staleTime: 30_000,
  })
}
