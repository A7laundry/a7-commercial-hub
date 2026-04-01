import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { Account, PipelineStage, CommercialStatus, AccountStatus } from "@/types"

export type SortField =
  | "name" | "pipeline_stage" | "commercial_status" | "estimated_value"
  | "frequency" | "last_contact_at" | "next_action" | "segment" | "status"

export type SortDir = "asc" | "desc"

export type ScoreFilter = "hot" | "warm" | "cold" | "at_risk" | "upsell" | "all"

export type TableFilters = {
  search: string
  pipeline_stage: PipelineStage | "all"
  commercial_status: CommercialStatus | "all"
  status: AccountStatus | "all"
  score: ScoreFilter
  valueMin: string
  valueMax: string
  frequency: string
  segment: string
  noPhone: boolean
}

export type TableParams = {
  filters: TableFilters
  sort: { field: SortField; dir: SortDir }
  page: number
  pageSize: number
}

export type AccountsTableResult = {
  accounts: Account[]
  total: number
  pages: number
}

export const DEFAULT_FILTERS: TableFilters = {
  search: "",
  pipeline_stage: "all",
  commercial_status: "all",
  status: "all",
  score: "all",
  valueMin: "",
  valueMax: "",
  frequency: "",
  segment: "",
  noPhone: false,
}

export const DEFAULT_PARAMS: TableParams = {
  filters: DEFAULT_FILTERS,
  sort: { field: "name", dir: "asc" },
  page: 1,
  pageSize: 50,
}

export function useAccountsTable(tenantId: string, params: TableParams) {
  const supabase = createClient()

  return useQuery<AccountsTableResult>({
    queryKey: ["accounts_table", tenantId, params],
    queryFn: async () => {
      const { filters, sort, page, pageSize } = params
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      // --- noPhone: get account_ids that DO have a phone mapping ---
      let idsWithPhone: string[] | null = null
      if (filters.noPhone) {
        const { data: phoned } = await supabase
          .from("phone_mappings")
          .select("account_id")
          .eq("tenant_id", tenantId)
          .limit(10000)
        idsWithPhone = (phoned ?? []).map((r) => r.account_id)
      }

      // --- count query ---
      let countQ = supabase
        .from("accounts")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)

      countQ = applyFilters(countQ, filters)
      if (idsWithPhone !== null) {
        if (idsWithPhone.length > 0) countQ = countQ.not("id", "in", `(${idsWithPhone.join(",")})`)
      }

      // --- data query ---
      let dataQ = supabase
        .from("accounts")
        .select("*, phone_mappings(phone)")
        .eq("tenant_id", tenantId)

      dataQ = applyFilters(dataQ, filters)
      if (idsWithPhone !== null) {
        if (idsWithPhone.length > 0) dataQ = dataQ.not("id", "in", `(${idsWithPhone.join(",")})`)
      }
      dataQ = dataQ
        .order(sort.field, { ascending: sort.dir === "asc" })
        .range(from, to)

      const [countRes, dataRes] = await Promise.all([countQ, dataQ])

      const total = countRes.count ?? 0
      const accounts = (dataRes.data ?? []) as Account[]

      return {
        accounts,
        total,
        pages: Math.ceil(total / pageSize),
      }
    },
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
}

function applyFilters(q: any, filters: TableFilters) {
  if (filters.search) {
    q = q.or(
      `name.ilike.%${filters.search}%,contact_name.ilike.%${filters.search}%,contact_email.ilike.%${filters.search}%,segment.ilike.%${filters.search}%`
    )
  }
  if (filters.status !== "all") q = q.eq("status", filters.status)
  if (filters.pipeline_stage !== "all") q = q.eq("pipeline_stage", filters.pipeline_stage)
  if (filters.commercial_status !== "all") q = q.eq("commercial_status", filters.commercial_status)
  if (filters.segment) q = q.ilike("segment", `%${filters.segment}%`)
  if (filters.frequency) q = q.ilike("frequency", `%${filters.frequency}%`)
  if (filters.valueMin) q = q.gte("estimated_value", Number(filters.valueMin))
  if (filters.valueMax) q = q.lte("estimated_value", Number(filters.valueMax))

  // score approximation
  if (filters.score !== "all") {
    const now = new Date()
    const d7 = new Date(now.getTime() - 7 * 86400000).toISOString()
    const d14 = new Date(now.getTime() - 14 * 86400000).toISOString()
    const d30 = new Date(now.getTime() - 30 * 86400000).toISOString()

    if (filters.score === "at_risk") {
      q = q.or(`commercial_status.eq.at_risk,and(pipeline_stage.eq.negotiating,last_contact_at.lt.${d14})`)
    } else if (filters.score === "hot") {
      q = q
        .in("pipeline_stage", ["negotiating", "quote_sent"])
        .gte("last_contact_at", d7)
        .eq("commercial_status", "active")
    } else if (filters.score === "cold") {
      q = q.or(`last_contact_at.is.null,last_contact_at.lt.${d30}`)
    } else if (filters.score === "upsell") {
      q = q.in("pipeline_stage", ["recurring", "closed"])
    } else if (filters.score === "warm") {
      q = q
        .gte("last_contact_at", d30)
        .not("pipeline_stage", "in", '("negotiating","quote_sent","recurring","closed")')
        .eq("commercial_status", "active")
    }
  }

  return q
}
