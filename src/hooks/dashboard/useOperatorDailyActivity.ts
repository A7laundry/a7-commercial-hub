import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"

// ── Types ─────────────────────────────────────────────────────────────────────

export type OperatorActivityStatus = "active" | "attention" | "inactive"

export type OperatorActivity = {
  operator_name: string
  total_interactions: number
  total_sales: number
  revenue: number
  status: OperatorActivityStatus
}

// ── Status rules ──────────────────────────────────────────────────────────────
// inactive  = 0 interactions
// attention = 1–4 interactions
// active    = 5+ interactions

function deriveStatus(total: number): OperatorActivityStatus {
  if (total === 0) return "inactive"
  if (total < 5) return "attention"
  return "active"
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useOperatorDailyActivity(tenantId: string, date?: string) {
  const supabase = createClient()

  // Use local date (sv locale gives YYYY-MM-DD) to avoid UTC vs Brazil (UTC-3) mismatch
  const resolvedDate =
    date ?? new Date().toLocaleDateString("sv")

  const query = useQuery<OperatorActivity[]>({
    enabled: !!tenantId,
    queryKey: ["operator_daily_activity", tenantId, resolvedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interaction_outcomes")
        .select("operator_name, outcome_type, revenue_amount")
        .eq("tenant_id", tenantId)
        .eq("date", resolvedDate)

      if (error) throw error

      const rows = data ?? []

      // Aggregate by operator_name in memory
      const map = new Map<
        string,
        { total_interactions: number; total_sales: number; revenue: number }
      >()

      for (const row of rows) {
        const name = row.operator_name ?? "Desconhecido"
        const existing = map.get(name) ?? {
          total_interactions: 0,
          total_sales: 0,
          revenue: 0,
        }
        existing.total_interactions += 1
        if (row.outcome_type === "sale") {
          existing.total_sales += 1
          existing.revenue += row.revenue_amount ?? 0
        }
        map.set(name, existing)
      }

      return Array.from(map.entries())
        .map(([operator_name, stats]) => ({
          operator_name,
          total_interactions: stats.total_interactions,
          total_sales: stats.total_sales,
          revenue: stats.revenue,
          status: deriveStatus(stats.total_interactions),
        }))
        .sort((a, b) => b.total_interactions - a.total_interactions)
    },
    staleTime: 30_000,
  })

  const data = query.data ?? []
  const activeCount = data.filter((op) => op.status === "active").length
  const inactiveCount = data.filter((op) => op.status === "inactive").length

  return {
    data,
    isPending: query.isPending,
    activeCount,
    inactiveCount,
  }
}
