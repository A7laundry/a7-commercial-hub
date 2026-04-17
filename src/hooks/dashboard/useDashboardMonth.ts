import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"

// ── Types ─────────────────────────────────────────────────────────────────────

export type DashboardMonthData = {
  // KPIs
  revenueMonth: number
  contactsMonth: number
  salesMonth: number
  conversionRate: number

  // Metas agregadas do mês
  goals: {
    totalGoalRevenue: number
    totalGoalSales: number
    totalGoalContacts: number
    daysWithGoal: number
  }

  // Timeline
  recentActivity: Array<{
    id: string
    eventType: string
    description: string | null
    accountName: string | null
    accountId: string | null
    createdAt: string
  }>
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getMonthBounds(): { monthStart: string; monthEnd: string } {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0)

  // Use sv locale to get YYYY-MM-DD format using local time
  const monthStart = start.toLocaleDateString("sv")
  const monthEnd = end.toLocaleDateString("sv")

  return { monthStart, monthEnd }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useDashboardMonth(tenantId: string) {
  const supabase = createClient()

  return useQuery<DashboardMonthData>({
    queryKey: ["dashboard_month", tenantId],
    queryFn: async () => {
      const { monthStart, monthEnd } = getMonthBounds()

      const [outcomesRes, goalsRes, timelineRes] = await Promise.all([
        supabase
          .from("interaction_outcomes")
          .select("outcome_type, revenue_amount, operator_name, date")
          .eq("tenant_id", tenantId)
          .gte("date", monthStart)
          .lte("date", monthEnd),

        supabase
          .from("daily_goals")
          .select("goal_contacts, goal_sales, goal_revenue, date")
          .eq("tenant_id", tenantId)
          .gte("date", monthStart)
          .lte("date", monthEnd),

        supabase
          .from("account_timeline")
          .select("id, created_by, created_at, event_type, description, account_id")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false })
          .limit(8),
      ])

      const outcomes = outcomesRes.data ?? []
      const goalsRows = goalsRes.data ?? []
      const timelineRows = timelineRes.data ?? []

      // ── KPIs from outcomes ────────────────────────────────────────────────

      const contactsMonth = outcomes.length
      const salesMonth = outcomes.filter((o) => o.outcome_type === "sale").length
      const revenueMonth = outcomes
        .filter((o) => o.outcome_type === "sale")
        .reduce((sum, o) => sum + ((o.revenue_amount as number | null) ?? 0), 0)

      const conversionRate =
        contactsMonth > 0 ? Math.round((salesMonth / contactsMonth) * 100) : 0

      // ── Goals aggregation ────────────────────────────────────────────────

      const goals = goalsRows.reduce(
        (acc, row) => {
          acc.totalGoalRevenue += (row.goal_revenue as number | null) ?? 0
          acc.totalGoalSales += (row.goal_sales as number | null) ?? 0
          acc.totalGoalContacts += (row.goal_contacts as number | null) ?? 0
          acc.daysWithGoal += 1
          return acc
        },
        { totalGoalRevenue: 0, totalGoalSales: 0, totalGoalContacts: 0, daysWithGoal: 0 }
      )

      // ── Account names for timeline ────────────────────────────────────────

      const accountIds = [
        ...new Set(timelineRows.map((t) => t.account_id).filter(Boolean) as string[]),
      ]

      let accountNameMap = new Map<string, string>()

      if (accountIds.length > 0) {
        const { data: accountsData } = await supabase
          .from("accounts")
          .select("id, name")
          .in("id", accountIds)

        for (const acc of accountsData ?? []) {
          accountNameMap.set(acc.id, acc.name)
        }
      }

      // ── Build activity feed ───────────────────────────────────────────────

      const recentActivity = timelineRows.map((t) => ({
        id: t.id as string,
        eventType: (t.event_type as string | null) ?? "unknown",
        description: t.description as string | null,
        accountName: t.account_id ? (accountNameMap.get(t.account_id as string) ?? null) : null,
        accountId: t.account_id as string | null,
        createdAt: t.created_at as string,
      }))

      return {
        revenueMonth,
        contactsMonth,
        salesMonth,
        conversionRate,
        goals,
        recentActivity,
      }
    },
    staleTime: 60_000,
  })
}
