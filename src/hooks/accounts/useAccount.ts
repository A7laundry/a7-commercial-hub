"use client"

import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { Account } from "@/types"

export function useAccount(tenantId: string, accountId: string) {
  return useQuery({
    queryKey: ["accounts", tenantId, accountId],
    queryFn: async (): Promise<Account> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("id", accountId)
        .single()

      if (error) throw new Error(error.message)
      return data as Account
    },
    enabled: Boolean(tenantId) && Boolean(accountId),
  })
}
