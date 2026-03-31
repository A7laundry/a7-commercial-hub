"use client"

import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { Account } from "@/types"

export type AccountFilters = {
  search?: string
  status?: Account["status"] | "all"
}

export function useAccounts(tenantId: string, filters: AccountFilters = {}) {
  return useQuery({
    queryKey: ["accounts", tenantId, filters],
    queryFn: async (): Promise<Account[]> => {
      const supabase = createClient()
      let query = supabase
        .from("accounts")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("name")

      if (filters.search) {
        query = query.ilike("name", `%${filters.search}%`)
      }
      if (filters.status && filters.status !== "all") {
        query = query.eq("status", filters.status)
      }

      const { data, error } = await query
      if (error) throw new Error(error.message)
      return data as Account[]
    },
    enabled: Boolean(tenantId),
  })
}
