import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { Document } from "@/types"

type DocumentFilters = {
  accountId?: string
  contractId?: string
  docType?: string
}

export function useDocuments(tenantId: string, filters: DocumentFilters = {}) {
  const supabase = createClient()

  return useQuery<Document[]>({
    queryKey: ["documents", tenantId, filters],
    queryFn: async () => {
      let q = supabase
        .from("documents")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })

      if (filters.accountId) q = q.eq("account_id", filters.accountId)
      if (filters.contractId) q = q.eq("contract_id", filters.contractId)
      if (filters.docType) q = q.eq("doc_type", filters.docType)

      const { data, error } = await q
      if (error) throw error
      return data as Document[]
    },
    staleTime: 30_000,
  })
}
