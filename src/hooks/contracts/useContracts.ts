"use client"

import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { deriveContractStatus } from "@/lib/utils"
import type { Contract } from "@/types"

export type ContractFilters = {
  status?: Contract["status"] | "all"
  accountId?: string
}

export function useContracts(tenantId: string, filters: ContractFilters = {}) {
  return useQuery({
    queryKey: ["contracts:list", tenantId, filters],
    queryFn: async (): Promise<Contract[]> => {
      const supabase = createClient()
      let query = supabase
        .from("contracts")
        .select("*, accounts(name)")
        .eq("tenant_id", tenantId)
        .order("ends_at", { ascending: true })

      if (filters.accountId) {
        query = query.eq("account_id", filters.accountId)
      }

      const { data, error } = await query
      if (error) throw new Error(error.message)

      return (data as any[]).map((row) => ({
        ...row,
        account_name: row.accounts?.name ?? null,
        // Derive display status from dates (always fresh)
        status: deriveContractStatus(row.starts_at, row.ends_at),
      })) as Contract[]
    },
    enabled: Boolean(tenantId),
    staleTime: 30_000,
  })
}
