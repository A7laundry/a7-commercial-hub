/**
 * Pure functions for account risk classification and summary generation.
 * No hooks, no Supabase — only data-in, insight-out.
 * Reuses deriveContractStatus / deriveDocumentStatus from utils.
 */

import { deriveContractStatus, deriveDocumentStatus } from "@/lib/utils"
import type { Contract, Document, Alert } from "@/types"

// ── Risk ──────────────────────────────────────────────────────────────────────

export type RiskLevel = "low" | "medium" | "high"

export type RiskFactors = {
  expiredContracts: number
  expiringContracts: number
  expiredDocuments: number
  expiringDocuments: number
  criticalAlerts: number
  openAlerts: number
}

export function computeRiskFactors(
  contracts: Contract[],
  documents: Document[],
  alerts: Alert[]
): RiskFactors {
  return {
    expiredContracts: contracts.filter(
      (c) => deriveContractStatus(c.starts_at, c.ends_at) === "expired"
    ).length,
    expiringContracts: contracts.filter(
      (c) => deriveContractStatus(c.starts_at, c.ends_at) === "expiring"
    ).length,
    expiredDocuments: documents.filter(
      (d) => deriveDocumentStatus(d.expires_at) === "expired"
    ).length,
    expiringDocuments: documents.filter(
      (d) => deriveDocumentStatus(d.expires_at) === "expiring"
    ).length,
    criticalAlerts: alerts.filter(
      (a) => a.status === "open" && a.severity === "critical"
    ).length,
    openAlerts: alerts.filter((a) => a.status === "open").length,
  }
}

export function classifyRisk(factors: RiskFactors): RiskLevel {
  if (
    factors.expiredContracts > 0 ||
    factors.criticalAlerts > 0 ||
    factors.expiredDocuments > 1
  ) {
    return "high"
  }
  if (
    factors.expiringContracts > 0 ||
    factors.expiringDocuments > 0 ||
    factors.expiredDocuments === 1 ||
    factors.openAlerts > 0
  ) {
    return "medium"
  }
  return "low"
}

export function getRiskFactorLabels(factors: RiskFactors): string[] {
  const labels: string[] = []

  if (factors.expiredContracts > 0)
    labels.push(
      `${factors.expiredContracts} contrato${factors.expiredContracts > 1 ? "s" : ""} vencido${factors.expiredContracts > 1 ? "s" : ""}`
    )
  if (factors.expiringContracts > 0)
    labels.push(
      `${factors.expiringContracts} contrato${factors.expiringContracts > 1 ? "s" : ""} vencendo em breve`
    )
  if (factors.expiredDocuments > 0)
    labels.push(
      `${factors.expiredDocuments} documento${factors.expiredDocuments > 1 ? "s" : ""} vencido${factors.expiredDocuments > 1 ? "s" : ""}`
    )
  if (factors.expiringDocuments > 0)
    labels.push(
      `${factors.expiringDocuments} documento${factors.expiringDocuments > 1 ? "s" : ""} vencendo em breve`
    )
  if (factors.criticalAlerts > 0)
    labels.push(
      `${factors.criticalAlerts} alerta${factors.criticalAlerts > 1 ? "s" : ""} crítico${factors.criticalAlerts > 1 ? "s" : ""}`
    )
  else if (factors.openAlerts > 0)
    labels.push(
      `${factors.openAlerts} alerta${factors.openAlerts > 1 ? "s" : ""} aberto${factors.openAlerts > 1 ? "s" : ""}`
    )

  return labels
}

// ── Recommendations ───────────────────────────────────────────────────────────

export type RecommendationPriority = "urgent" | "recommended"

export type RecommendationType =
  | "contract_review"
  | "contract_renew"
  | "document_update"
  | "alert_resolve"

export type Recommendation = {
  id: string
  type: RecommendationType
  priority: RecommendationPriority
  title: string
  description: string
  cta: string
  href: string
}

export function generateRecommendations(
  contracts: Contract[],
  documents: Document[],
  alerts: Alert[]
): Recommendation[] {
  const recs: Recommendation[] = []

  // ── Expired contracts → "Revisar contrato" (urgent) ──────────────────────
  contracts
    .filter((c) => deriveContractStatus(c.starts_at, c.ends_at) === "expired")
    .forEach((c) => {
      recs.push({
        id: `contract-review-${c.id}`,
        type: "contract_review",
        priority: "urgent",
        title: "Revisar contrato vencido",
        description: `"${c.title}" venceu e pode requerer renovação ou encerramento formal.`,
        cta: "Revisar contrato",
        href: `/contracts/${c.id}`,
      })
    })

  // ── Expiring contracts ≤ 7 days → "Renovar urgente" ──────────────────────
  contracts
    .filter((c) => {
      if (deriveContractStatus(c.starts_at, c.ends_at) !== "expiring") return false
      const days = Math.round(
        (new Date(c.ends_at).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) /
          (1000 * 60 * 60 * 24)
      )
      return days <= 7
    })
    .forEach((c) => {
      const days = Math.round(
        (new Date(c.ends_at).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) /
          (1000 * 60 * 60 * 24)
      )
      recs.push({
        id: `contract-renew-urgent-${c.id}`,
        type: "contract_renew",
        priority: "urgent",
        title: "Renovar contrato com urgência",
        description: `"${c.title}" vence ${days === 0 ? "hoje" : days === 1 ? "amanhã" : `em ${days} dias`}. Inicie a renovação imediatamente.`,
        cta: "Renovar contrato",
        href: `/contracts/${c.id}`,
      })
    })

  // ── Expiring contracts 8–30 days → "Planejar renovação" (recommended) ────
  contracts
    .filter((c) => {
      if (deriveContractStatus(c.starts_at, c.ends_at) !== "expiring") return false
      const days = Math.round(
        (new Date(c.ends_at).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) /
          (1000 * 60 * 60 * 24)
      )
      return days > 7
    })
    .forEach((c) => {
      recs.push({
        id: `contract-renew-${c.id}`,
        type: "contract_renew",
        priority: "recommended",
        title: "Planejar renovação de contrato",
        description: `"${c.title}" vence nos próximos 30 dias. Agende a renovação com antecedência.`,
        cta: "Ver contrato",
        href: `/contracts/${c.id}`,
      })
    })

  // ── Expired documents → "Atualizar documento" (urgent) ───────────────────
  const expiredDocs = documents.filter(
    (d) => d.expires_at && deriveDocumentStatus(d.expires_at) === "expired"
  )
  if (expiredDocs.length === 1) {
    recs.push({
      id: `doc-update-${expiredDocs[0].id}`,
      type: "document_update",
      priority: "urgent",
      title: "Atualizar documento vencido",
      description: `"${expiredDocs[0].name}" está com validade expirada. Faça o upload da versão atualizada.`,
      cta: "Atualizar documento",
      href: "/documents",
    })
  } else if (expiredDocs.length > 1) {
    recs.push({
      id: "doc-update-multiple",
      type: "document_update",
      priority: "urgent",
      title: `Atualizar ${expiredDocs.length} documentos vencidos`,
      description: `${expiredDocs.length} documentos estão com validade expirada. Faça o upload das versões atualizadas.`,
      cta: "Ver documentos",
      href: "/documents",
    })
  }

  // ── Expiring documents → "Verificar vencimento" (recommended) ────────────
  const expiringDocs = documents.filter(
    (d) => d.expires_at && deriveDocumentStatus(d.expires_at) === "expiring"
  )
  if (expiringDocs.length > 0) {
    recs.push({
      id: "doc-expiring",
      type: "document_update",
      priority: "recommended",
      title: `Verificar vencimento de documento${expiringDocs.length > 1 ? "s" : ""}`,
      description:
        expiringDocs.length === 1
          ? `"${expiringDocs[0].name}" vence em breve. Verifique se precisa de renovação.`
          : `${expiringDocs.length} documentos vencem em breve. Verifique quais precisam de renovação.`,
      cta: "Ver documentos",
      href: "/documents",
    })
  }

  // ── Open critical alerts → "Resolver alertas" (urgent) ───────────────────
  const criticalAlerts = alerts.filter(
    (a) => a.status === "open" && a.severity === "critical"
  )
  if (criticalAlerts.length > 0) {
    recs.push({
      id: "alerts-critical",
      type: "alert_resolve",
      priority: "urgent",
      title: `Resolver ${criticalAlerts.length} alerta${criticalAlerts.length > 1 ? "s" : ""} crítico${criticalAlerts.length > 1 ? "s" : ""}`,
      description: "Alertas críticos requerem ação imediata para evitar impacto operacional.",
      cta: "Resolver alertas",
      href: "/alerts",
    })
  }

  // ── Open warning alerts → "Verificar alertas" (recommended) ──────────────
  const warningAlerts = alerts.filter(
    (a) => a.status === "open" && a.severity !== "critical"
  )
  if (warningAlerts.length > 0) {
    recs.push({
      id: "alerts-warning",
      type: "alert_resolve",
      priority: "recommended",
      title: `Verificar ${warningAlerts.length} alerta${warningAlerts.length > 1 ? "s" : ""} em aberto`,
      description: "Revise os alertas abertos e resolva ou reconheça cada um conforme necessário.",
      cta: "Ver alertas",
      href: "/alerts",
    })
  }

  // Sort: urgent before recommended
  return recs.sort((a, b) => {
    if (a.priority === b.priority) return 0
    return a.priority === "urgent" ? -1 : 1
  })
}

// ── Smart Summary ─────────────────────────────────────────────────────────────

export function generateAccountSummary(
  accountName: string,
  factors: RiskFactors,
  risk: RiskLevel,
  totalContracts: number
): string {
  const {
    expiredContracts,
    expiringContracts,
    expiredDocuments,
    expiringDocuments,
    criticalAlerts,
    openAlerts,
  } = factors

  if (totalContracts === 0) {
    return `${accountName} não possui contratos cadastrados. Crie um contrato para começar o acompanhamento.`
  }

  if (risk === "high") {
    const parts: string[] = []

    if (expiredContracts > 0) {
      parts.push(
        expiredContracts === 1
          ? "1 contrato vencido sem renovação"
          : `${expiredContracts} contratos vencidos sem renovação`
      )
    }
    if (criticalAlerts > 0) {
      parts.push(
        criticalAlerts === 1 ? "1 alerta crítico aberto" : `${criticalAlerts} alertas críticos abertos`
      )
    }
    if (expiredDocuments > 1) {
      parts.push(
        `${expiredDocuments} documentos com validade expirada`
      )
    }

    const issueText = parts.length > 1
      ? parts.slice(0, -1).join(", ") + " e " + parts[parts.length - 1]
      : parts[0]

    return `Conta requer ação imediata. Identificado: ${issueText}. Recomenda-se contato urgente com o cliente.`
  }

  if (risk === "medium") {
    const parts: string[] = []

    if (expiringContracts > 0) {
      parts.push(
        expiringContracts === 1
          ? "1 contrato vencendo nos próximos 30 dias"
          : `${expiringContracts} contratos vencendo nos próximos 30 dias`
      )
    }
    if (expiringDocuments > 0) {
      parts.push(
        expiringDocuments === 1
          ? "1 documento com vencimento próximo"
          : `${expiringDocuments} documentos com vencimento próximo`
      )
    }
    if (expiredDocuments === 1) {
      parts.push("1 documento com validade expirada")
    }
    if (openAlerts > 0 && criticalAlerts === 0) {
      parts.push(
        openAlerts === 1 ? "1 alerta em aberto" : `${openAlerts} alertas em aberto`
      )
    }

    const issueText = parts.length > 1
      ? parts.slice(0, -1).join(", ") + " e " + parts[parts.length - 1]
      : parts[0]

    return `Conta está estável, mas requer atenção. ${issueText ? `Identificado: ${issueText}.` : ""} Acompanhe os prazos para evitar vencimentos.`
  }

  // low risk
  if (totalContracts === 1) {
    return `Conta está em dia. O contrato ativo está dentro do prazo e não há alertas ou documentos vencidos.`
  }
  return `Conta está em dia. Todos os ${totalContracts} contratos estão dentro do prazo e não há pendências identificadas.`
}
