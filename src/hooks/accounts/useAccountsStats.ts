"use client"

import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"

export type AccountsStats = {
  total: number
  ativos: number
  emRisco: number
  inativos: number
}

/**
 * Returns accurate account counts via HEAD queries — no row data transferred.
 * Use this for KPI display instead of deriving counts from a limited list query.
 */
export function useAccountsStats(tenantId: string) {
  return useQuery<AccountsStats>({
    queryKey: ["accounts_stats", tenantId],
    queryFn: async () => {
      const supabase = createClient()
      const [totalRes, ativosRes, emRiscoRes, inativosRes] = await Promise.all([
        supabase
          .from("accounts")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenantId),
        supabase
          .from("accounts")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("commercial_status", "active"),
        supabase
          .from("accounts")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("commercial_status", "at_risk"),
        supabase
          .from("accounts")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("status", "inactive"),
      ])
      return {
        total:    totalRes.count    ?? 0,
        ativos:   ativosRes.count   ?? 0,
        emRisco:  emRiscoRes.count  ?? 0,
        inativos: inativosRes.count ?? 0,
      }
    },
    enabled: Boolean(tenantId),
    staleTime: 60_000,
  })
}
