import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { AlertSeverity, AlertStatus } from "@/types"

// ── Output types ─────────────────────────────────────────────────────────────

export type AccountRisk = {
  id: string
  name: string
  expiringContracts: number
  expiredContracts: number
  openAlerts: number
  riskLevel: "high" | "medium" | "low"
}

export type RecentAlert = {
  id: string
  title: string
  severity: AlertSeverity
  status: AlertStatus
  account_id: string | null
  account_name: string | null
  contract_id: string | null
  created_at: string
}

export type DashboardData = {
  // KPIs
  totalAccounts: number
  activeAccounts: number
  clientAccounts: number   // apenas cliente + recorrente
  openAlerts: number
  totalCarteiraValue: number

  // Widgets
  recentAlerts: RecentAlert[]
  accountsAtRisk: AccountRisk[]
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useDashboardData(tenantId: string) {
  const supabase = createClient()

  return useQuery<DashboardData>({
    queryKey: ["dashboard", tenantId],
    queryFn: async () => {
      const [accountsRes, alertsRes, openAlertsCountRes] = await Promise.all([
        supabase
          .from("accounts")
          .select("id, name, status, estimated_value, pipeline_stage")
          .eq("tenant_id", tenantId)
          .eq("in_pipeline", true)
          .limit(10000),

        supabase
          .from("alerts")
          .select("id, title, severity, status, account_id, contract_id, created_at, accounts(name)")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false })
          .limit(20),

        supabase
          .from("alerts")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("status", "open"),
      ])

      const accounts = accountsRes.data ?? []
      const rawAlerts = alertsRes.data ?? []
      const openAlerts = openAlertsCountRes.count ?? 0

      // ── Process alerts ────────────────────────────────────────────────────

      const recentAlerts: RecentAlert[] = rawAlerts.map((a) => {
        const accountJoin = a.accounts as { name?: string } | null
        return {
          id: a.id,
          title: a.title,
          severity: a.severity as AlertSeverity,
          status: a.status as AlertStatus,
          account_id: a.account_id,
          account_name: accountJoin?.name ?? null,
          contract_id: a.contract_id,
          created_at: a.created_at,
        }
      })

      // ── KPIs ─────────────────────────────────────────────────────────────

      // Carteira = sucesso + cliente + recorrente (venda fechada a partir do Sucesso)
      const CLIENT_STAGES = ["sucesso", "cliente", "recorrente"]
      const clientOnly = accounts.filter((a) => CLIENT_STAGES.includes(a.pipeline_stage as string))
      const totalCarteiraValue = clientOnly.reduce(
        (sum, a) => sum + ((a.estimated_value as number | null) ?? 0),
        0,
      )
      const clientAccounts = clientOnly.length
      const activeAccounts = accounts.filter((a) => a.status === "active").length

      // ── Accounts at risk (based on open alerts) ───────────────────────────

      const riskMap = new Map<string, { name: string; alerts: number }>()
      for (const acc of accounts) {
        riskMap.set(acc.id, { name: acc.name, alerts: 0 })
      }
      for (const a of recentAlerts) {
        if (a.status === "open" && a.account_id && riskMap.has(a.account_id)) {
          riskMap.get(a.account_id)!.alerts++
        }
      }

      const accountsAtRisk: AccountRisk[] = Array.from(riskMap.entries())
        .filter(([, r]) => r.alerts > 0)
        .map(([id, r]) => ({
          id,
          name: r.name,
          expiringContracts: 0,
          expiredContracts: 0,
          openAlerts: r.alerts,
          riskLevel: "high" as const,
        }))
        .slice(0, 8)

      return {
        totalAccounts: accounts.length,
        activeAccounts,
        clientAccounts,
        openAlerts,
        totalCarteiraValue,
        recentAlerts: recentAlerts.filter((a) => a.status === "open").slice(0, 5),
        accountsAtRisk,
      }
    },
    staleTime: 45_000,
  })
}
