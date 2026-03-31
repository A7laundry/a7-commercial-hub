"use client"

import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { deriveContractStatus } from "@/lib/utils"
import type { Contract } from "@/types"

export function useContract(tenantId: string, contractId: string) {
  return useQuery({
    queryKey: ["contracts", tenantId, contractId],
    queryFn: async (): Promise<Contract> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("contracts")
        .select("*, accounts(name)")
        .eq("tenant_id", tenantId)
        .eq("id", contractId)
        .single()

      if (error) throw new Error(error.message)

      return {
        ...data,
        account_name: (data as any).accounts?.name ?? null,
        status: deriveContractStatus(data.starts_at, data.ends_at),
      } as Contract
    },
    enabled: Boolean(tenantId) && Boolean(contractId),
  })
}
