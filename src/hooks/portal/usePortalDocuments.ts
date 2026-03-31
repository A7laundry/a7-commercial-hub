import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { Document } from "@/types"
import { deriveDocumentStatus } from "@/lib/utils"

export function usePortalDocuments(tenantId: string, accountId: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ["portal_documents", tenantId, accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("account_id", accountId)
        .order("created_at", { ascending: false })

      if (error) throw error

      return (data ?? []).map((d) => ({
        ...d,
        _status: deriveDocumentStatus(d.expires_at),
      })) as (Document & { _status: string })[]
    },
    staleTime: 60_000,
  })
}
