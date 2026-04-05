import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { deriveContractStatus, deriveDocumentStatus } from "@/lib/utils"
import type { ContractStatus, DocumentStatus, AlertSeverity, AlertStatus } from "@/types"

// ── Output types ─────────────────────────────────────────────────────────────

export type UrgentActionType =
  | "contract_expiring_soon"
  | "contract_expired"
  | "document_expiring"
  | "document_expired"
  | "critical_alert"

export type UrgentAction = {
  id: string
  type: UrgentActionType
  title: string
  subtitle: string
  href: string
  severity: "critical" | "warning"
}

export type ContractSummary = {
  id: string
  title: string
  account_id: string
  account_name: string
  ends_at: string
  status: ContractStatus
  daysUntilExpiry: number
}

export type DocumentSummary = {
  id: string
  name: string
  account_id: string | null
  account_name: string | null
  contract_id: string | null
  expires_at: string
  status: DocumentStatus
  daysUntilExpiry: number
}

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
  activeContracts: number
  expiringContracts: number
  expiredContracts: number
  openAlerts: number
  expiredDocuments: number
  expiringDocuments: number
  totalCarteiraValue: number

  // Widgets
  urgentActions: UrgentAction[]
  expiringContractsList: ContractSummary[]
  expiringDocsList: DocumentSummary[]
  recentAlerts: RecentAlert[]
  accountsAtRisk: AccountRisk[]
}

// ── Helper ────────────────────────────────────────────────────────────────────

function daysDiff(date: string): number {
  const d = new Date(date)
  const now = new Date()
  d.setHours(0, 0, 0, 0)
  now.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useDashboardData(tenantId: string) {
  const supabase = createClient()

  return useQuery<DashboardData>({
    queryKey: ["dashboard", tenantId],
    queryFn: async () => {
      const [accountsRes, contractsRes, documentsRes, alertsRes, openAlertsCountRes] = await Promise.all([
        supabase
          .from("accounts")
          .select("id, name, status, estimated_value")
          .eq("tenant_id", tenantId)
          .limit(10000),

        supabase
          .from("contracts")
          .select("id, title, account_id, starts_at, ends_at, accounts(name)")
          .eq("tenant_id", tenantId)
          .limit(1000),

        supabase
          .from("documents")
          .select("id, name, account_id, contract_id, expires_at, accounts(name)")
          .eq("tenant_id", tenantId)
          .not("expires_at", "is", null)
          .limit(500),

        supabase
          .from("alerts")
          .select("id, title, severity, status, account_id, contract_id, created_at, accounts(name)")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false })
          .limit(20),

        // Separate count query — avoids underreporting from the .limit(20) above
        supabase
          .from("alerts")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("status", "open"),
      ])

      const accounts = accountsRes.data ?? []
      const rawContracts = contractsRes.data ?? []
      const rawDocuments = documentsRes.data ?? []
      const rawAlerts = alertsRes.data ?? []
      const trueOpenAlertsCount = openAlertsCountRes.count ?? 0

      // ── Process contracts ─────────────────────────────────────────────────

      const contracts: ContractSummary[] = rawContracts.map((c) => {
        const accountJoin = c.accounts as { name?: string } | null
        return {
          id: c.id,
          title: c.title,
          account_id: c.account_id,
          account_name: accountJoin?.name ?? "—",
          ends_at: c.ends_at,
          status: deriveContractStatus(c.starts_at, c.ends_at),
          daysUntilExpiry: daysDiff(c.ends_at),
        }
      })

      // ── Process documents ─────────────────────────────────────────────────

      const documents: DocumentSummary[] = rawDocuments.map((d) => {
        const accountJoin = d.accounts as { name?: string } | null
        const expiresAt = d.expires_at as string
        return {
          id: d.id,
          name: d.name,
          account_id: d.account_id,
          account_name: accountJoin?.name ?? null,
          contract_id: d.contract_id,
          expires_at: expiresAt,
          status: deriveDocumentStatus(expiresAt),
          daysUntilExpiry: daysDiff(expiresAt),
        }
      })

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

      // ── KPI counts ────────────────────────────────────────────────────────

      const totalCarteiraValue = accounts.reduce((sum, a) => sum + ((a.estimated_value as number | null) ?? 0), 0)
      const activeAccounts = accounts.filter((a) => a.status === "active").length
      const activeContracts = contracts.filter((c) => c.status === "active").length
      const expiringContracts = contracts.filter((c) => c.status === "expiring").length
      const expiredContracts = contracts.filter((c) => c.status === "expired").length
      const openAlerts = trueOpenAlertsCount
      const expiredDocuments = documents.filter((d) => d.status === "expired").length
      const expiringDocuments = documents.filter((d) => d.status === "expiring").length

      // ── Urgent actions ────────────────────────────────────────────────────

      const urgentActions: UrgentAction[] = []

      // Critical: open critical alerts
      recentAlerts
        .filter((a) => a.status === "open" && a.severity === "critical")
        .slice(0, 3)
        .forEach((a) => {
          urgentActions.push({
            id: `alert-${a.id}`,
            type: "critical_alert",
            title: a.title,
            subtitle: a.account_name ?? "Ver alerta",
            href: "/alerts",
            severity: "critical",
          })
        })

      // Critical: expired contracts
      contracts
        .filter((c) => c.status === "expired")
        .slice(0, 3)
        .forEach((c) => {
          urgentActions.push({
            id: `contract-expired-${c.id}`,
            type: "contract_expired",
            title: `Contrato vencido: ${c.title}`,
            subtitle: `${c.account_name} · venceu há ${Math.abs(c.daysUntilExpiry)} dia${Math.abs(c.daysUntilExpiry) !== 1 ? "s" : ""}`,
            href: `/contracts/${c.id}`,
            severity: "critical",
          })
        })

      // Critical: expired documents
      documents
        .filter((d) => d.status === "expired")
        .slice(0, 3)
        .forEach((d) => {
          urgentActions.push({
            id: `doc-expired-${d.id}`,
            type: "document_expired",
            title: `Documento vencido: ${d.name}`,
            subtitle: `${d.account_name ?? "Sem conta"} · venceu há ${Math.abs(d.daysUntilExpiry)} dia${Math.abs(d.daysUntilExpiry) !== 1 ? "s" : ""}`,
            href: "/documents",
            severity: "critical",
          })
        })

      // Warning: contracts expiring in ≤ 7 days
      contracts
        .filter((c) => c.status === "expiring" && c.daysUntilExpiry <= 7)
        .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)
        .slice(0, 3)
        .forEach((c) => {
          urgentActions.push({
            id: `contract-expiring-${c.id}`,
            type: "contract_expiring_soon",
            title: `Contrato vence em breve: ${c.title}`,
            subtitle: `${c.account_name} · vence em ${c.daysUntilExpiry} dia${c.daysUntilExpiry !== 1 ? "s" : ""}`,
            href: `/contracts/${c.id}`,
            severity: "warning",
          })
        })

      // Warning: documents expiring in ≤ 7 days
      documents
        .filter((d) => d.status === "expiring" && d.daysUntilExpiry <= 7)
        .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)
        .slice(0, 3)
        .forEach((d) => {
          urgentActions.push({
            id: `doc-expiring-${d.id}`,
            type: "document_expiring",
            title: `Documento vence em breve: ${d.name}`,
            subtitle: `${d.account_name ?? "Sem conta"} · vence em ${d.daysUntilExpiry} dia${d.daysUntilExpiry !== 1 ? "s" : ""}`,
            href: "/documents",
            severity: "warning",
          })
        })

      // Sort: critical first, then warning
      urgentActions.sort((a, b) => {
        if (a.severity === b.severity) return 0
        return a.severity === "critical" ? -1 : 1
      })

      // ── Expiring contracts list ────────────────────────────────────────────

      const expiringContractsList = contracts
        .filter((c) => c.status === "expiring")
        .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)

      // ── Expiring/expired documents list ───────────────────────────────────

      const expiringDocsList = documents
        .filter((d) => d.status === "expired" || d.status === "expiring")
        .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)

      // ── Accounts at risk ──────────────────────────────────────────────────

      const riskMap = new Map<string, { name: string; expiring: number; expired: number; alerts: number }>()

      for (const acc of accounts) {
        riskMap.set(acc.id, { name: acc.name, expiring: 0, expired: 0, alerts: 0 })
      }

      for (const c of contracts) {
        if (c.status === "expiring") riskMap.get(c.account_id)!.expiring++
        if (c.status === "expired") riskMap.get(c.account_id)!.expired++
      }

      for (const a of recentAlerts) {
        if (a.status === "open" && a.account_id && riskMap.has(a.account_id)) {
          riskMap.get(a.account_id)!.alerts++
        }
      }

      const accountsAtRisk: AccountRisk[] = Array.from(riskMap.entries())
        .map(([id, r]) => {
          const riskLevel: AccountRisk["riskLevel"] =
            r.expired > 0 || r.alerts > 0
              ? "high"
              : r.expiring > 0
              ? "medium"
              : "low"
          return {
            id,
            name: r.name,
            expiringContracts: r.expiring,
            expiredContracts: r.expired,
            openAlerts: r.alerts,
            riskLevel,
          }
        })
        .filter((a) => a.riskLevel !== "low")
        .sort((a, b) => {
          const order = { high: 0, medium: 1, low: 2 }
          return order[a.riskLevel] - order[b.riskLevel]
        })
        .slice(0, 8)

      return {
        totalAccounts: accounts.length,
        activeAccounts,
        activeContracts,
        expiringContracts,
        expiredContracts,
        openAlerts,
        expiredDocuments,
        expiringDocuments,
        totalCarteiraValue,
        urgentActions,
        expiringContractsList,
        expiringDocsList,
        recentAlerts: recentAlerts.filter((a) => a.status === "open").slice(0, 5),
        accountsAtRisk,
      }
    },
    staleTime: 15_000, // 15s — low enough to reflect recent deal/alert changes
  })
}
