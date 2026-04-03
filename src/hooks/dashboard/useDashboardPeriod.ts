import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"

export type PeriodType = "week" | "month" | "quarter"

export type PeriodData = {
  dealsCreated: number
  dealsCreatedValue: number
  dealsWon: number
  dealsWonValue: number
  dealsLost: number
  conversionRate: number   // 0-100, percentage. 0 if no closed deals in period.
  newAccounts: number
  alertsGenerated: number
  periodLabel: string      // e.g. "Abril 2026", "Semana 14", "T2 2026"
  fromDate: string         // ISO string
}

function getDateRange(period: PeriodType): { fromDate: Date; periodLabel: string } {
  const now = new Date()

  switch (period) {
    case "week": {
      const dayOfWeek = now.getDay()
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      const monday = new Date(now)
      monday.setDate(now.getDate() - daysToMonday)
      monday.setHours(0, 0, 0, 0)

      // Calculate ISO week number
      const startOfYear = new Date(monday.getFullYear(), 0, 1)
      const daysSinceStartOfYear = Math.floor((monday.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
      const weekNumber = Math.ceil((daysSinceStartOfYear + startOfYear.getDay() + 1) / 7)

      return {
        fromDate: monday,
        periodLabel: `Semana ${weekNumber} de ${monday.getFullYear()}`
      }
    }

    case "month": {
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
      const monthName = firstDayOfMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })

      return {
        fromDate: firstDayOfMonth,
        periodLabel: `Mês atual — ${monthName}`
      }
    }

    case "quarter": {
      const currentQuarter = Math.floor(now.getMonth() / 3) + 1
      const firstMonthOfQuarter = (currentQuarter - 1) * 3
      const firstDayOfQuarter = new Date(now.getFullYear(), firstMonthOfQuarter, 1, 0, 0, 0, 0)

      return {
        fromDate: firstDayOfQuarter,
        periodLabel: `T${currentQuarter} ${now.getFullYear()}`
      }
    }
  }
}

export function useDashboardPeriod(tenantId: string, period: PeriodType) {
  return useQuery({
    queryKey: ["dashboard-period", tenantId, period],
    queryFn: async (): Promise<PeriodData> => {
      const supabase = createClient()
      const { fromDate, periodLabel } = getDateRange(period)
      const fromISO = fromDate.toISOString()

      const [
        dealsCreatedResult,
        dealsWonResult,
        dealsLostResult,
        newAccountsResult,
        alertsResult
      ] = await Promise.all([
        supabase
          .from("deals")
          .select("id, value")
          .eq("tenant_id", tenantId)
          .gte("created_at", fromISO),

        supabase
          .from("deals")
          .select("id, value")
          .eq("tenant_id", tenantId)
          .gte("won_at", fromISO)
          .not("won_at", "is", null),

        supabase
          .from("deals")
          .select("id")
          .eq("tenant_id", tenantId)
          .gte("lost_at", fromISO)
          .not("lost_at", "is", null),

        supabase
          .from("accounts")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .gte("created_at", fromISO),

        supabase
          .from("alerts")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .gte("created_at", fromISO)
      ])

      if (dealsCreatedResult.error) throw dealsCreatedResult.error
      if (dealsWonResult.error) throw dealsWonResult.error
      if (dealsLostResult.error) throw dealsLostResult.error
      if (newAccountsResult.error) throw newAccountsResult.error
      if (alertsResult.error) throw alertsResult.error

      const dealsCreated = dealsCreatedResult.data?.length || 0
      const dealsCreatedValue = dealsCreatedResult.data?.reduce((sum, deal) => sum + (Number(deal.value) || 0), 0) || 0
      const dealsWon = dealsWonResult.data?.length || 0
      const dealsWonValue = dealsWonResult.data?.reduce((sum, deal) => sum + (Number(deal.value) || 0), 0) || 0
      const dealsLost = dealsLostResult.data?.length || 0

      const totalClosedDeals = dealsWon + dealsLost
      const conversionRate = totalClosedDeals > 0 ? Math.round((dealsWon / totalClosedDeals) * 1000) / 10 : 0

      const newAccounts = newAccountsResult.count || 0
      const alertsGenerated = alertsResult.count || 0

      return {
        dealsCreated,
        dealsCreatedValue,
        dealsWon,
        dealsWonValue,
        dealsLost,
        conversionRate,
        newAccounts,
        alertsGenerated,
        periodLabel,
        fromDate: fromISO
      }
    },
    staleTime: 30_000
  })
}