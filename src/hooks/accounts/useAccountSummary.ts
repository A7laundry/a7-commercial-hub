import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { deriveContractStatus, deriveDocumentStatus } from "@/lib/utils"
import {
  computeRiskFactors,
  classifyRisk,
  getRiskFactorLabels,
  generateAccountSummary,
  generateRecommendations,
  type RiskLevel,
  type RiskFactors,
  type Recommendation,
} from "@/lib/account-summary"
import type { Account, Contract, Document, Alert, ContractStatus, DocumentStatus } from "@/types"

export type ContractWithStatus = Contract & { derivedStatus: ContractStatus }
export type DocumentWithStatus = Document & { derivedStatus: DocumentStatus }

export type AccountSummaryData = {
  account: Account

  // Contracts
  contracts: ContractWithStatus[]
  totalContracts: number
  activeContracts: number
  totalContractValue: number
  expiringContracts: ContractWithStatus[]
  expiredContracts: ContractWithStatus[]

  // Documents
  documents: DocumentWithStatus[]
  totalDocuments: number
  expiringDocuments: DocumentWithStatus[]
  expiredDocuments: DocumentWithStatus[]

  // Alerts
  alerts: Alert[]
  openAlerts: Alert[]

  // Risk
  riskFactors: RiskFactors
  riskLevel: RiskLevel
  riskFactorLabels: string[]

  // Smart summary
  summary: string

  // Recommendations
  recommendations: Recommendation[]
}

export function useAccountSummary(tenantId: string, accountId: string) {
  const supabase = createClient()

  return useQuery<AccountSummaryData>({
    queryKey: ["account-summary", tenantId, accountId],
    queryFn: async () => {
      const [accountRes, contractsRes, documentsRes, alertsRes] = await Promise.all([
        supabase
          .from("accounts")
          .select("*")
          .eq("id", accountId)
          .eq("tenant_id", tenantId)
          .single(),

        supabase
          .from("contracts")
          .select("*")
          .eq("account_id", accountId)
          .eq("tenant_id", tenantId)
          .order("ends_at", { ascending: true }),

        supabase
          .from("documents")
          .select("*")
          .eq("account_id", accountId)
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false }),

        supabase
          .from("alerts")
          .select("*")
          .eq("account_id", accountId)
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false }),
      ])

      if (!accountRes.data) throw new Error("Account not found")

      const account = accountRes.data as Account
      const rawContracts = (contractsRes.data ?? []) as Contract[]
      const rawDocuments = (documentsRes.data ?? []) as Document[]
      const rawAlerts = (alertsRes.data ?? []) as Alert[]

      // Attach derived status to contracts
      const contracts: ContractWithStatus[] = rawContracts.map((c) => ({
        ...c,
        derivedStatus: deriveContractStatus(c.starts_at, c.ends_at),
      }))

      // Attach derived status to documents
      const documents: DocumentWithStatus[] = rawDocuments.map((d) => ({
        ...d,
        derivedStatus: deriveDocumentStatus(d.expires_at),
      }))

      // Aggregations
      const activeContracts = contracts.filter((c) => c.derivedStatus === "active").length
      const totalContractValue = contracts
        .filter((c) => c.derivedStatus === "active" || c.derivedStatus === "expiring")
        .reduce((sum, c) => sum + c.total_value, 0)

      const expiringContracts = contracts.filter((c) => c.derivedStatus === "expiring")
      const expiredContracts = contracts.filter((c) => c.derivedStatus === "expired")
      const expiringDocuments = documents.filter((d) => d.derivedStatus === "expiring")
      const expiredDocuments = documents.filter((d) => d.derivedStatus === "expired")
      const openAlerts = rawAlerts.filter((a) => a.status === "open")

      // Risk
      const riskFactors = computeRiskFactors(rawContracts, rawDocuments, rawAlerts)
      const riskLevel = classifyRisk(riskFactors)
      const riskFactorLabels = getRiskFactorLabels(riskFactors)

      // Smart summary
      const summary = generateAccountSummary(
        account.name,
        riskFactors,
        riskLevel,
        contracts.length
      )

      // Recommendations
      const recommendations = generateRecommendations(rawContracts, rawDocuments, rawAlerts)

      return {
        account,
        contracts,
        totalContracts: contracts.length,
        activeContracts,
        totalContractValue,
        expiringContracts,
        expiredContracts,
        documents,
        totalDocuments: documents.length,
        expiringDocuments,
        expiredDocuments,
        alerts: rawAlerts,
        openAlerts,
        riskFactors,
        riskLevel,
        riskFactorLabels,
        summary,
        recommendations,
      }
    },
    staleTime: 30_000,
  })
}
