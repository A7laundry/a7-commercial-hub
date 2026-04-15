// src/lib/campaign-rules.ts
// Smart audience presets — rules-based auto-segmentation

import {
  computeCommercialScore,
  parseFrequencyPerMonth,
  computeLTV,
  daysSince,
} from "@/lib/commercial-intelligence"
import type { Account, CampaignType } from "@/types"

export type AudiencePreset = {
  id: string
  label: string
  description: string
  emoji: string
  campaignType: CampaignType
  filter: (account: Account) => boolean
  messageHint: string
}

export const AUDIENCE_PRESETS: AudiencePreset[] = [
  {
    id: "inactive_30",
    label: "Inativos 30+ dias",
    description: "Clientes sem contato há mais de 30 dias",
    emoji: "🔴",
    campaignType: "reactivation",
    filter: (a) => {
      const d = daysSince(a.last_contact_at)
      return d !== null && d > 30 && a.status !== "inactive"
    },
    messageHint: "Reativar clientes que sumiram",
  },
  {
    id: "stalled_negotiation",
    label: "Negociações paradas",
    description: "Em negociação sem contato há mais de 7 dias",
    emoji: "⚠️",
    campaignType: "follow_up",
    filter: (a) => {
      const d = daysSince(a.last_contact_at)
      return a.pipeline_stage === "proposta" && d !== null && d > 7
    },
    messageHint: "Retomar negociações que esfriaram",
  },
  {
    id: "upsell_recurring",
    label: "Upsell — Recorrentes",
    description: "Clientes recorrentes com ticket abaixo de R$ 500",
    emoji: "💰",
    campaignType: "upsell",
    filter: (a) => {
      return (
        a.pipeline_stage === "recorrente" &&
        a.estimated_value !== null &&
        a.estimated_value < 500
      )
    },
    messageHint: "Aumentar ticket de clientes fiéis",
  },
  {
    id: "at_risk",
    label: "Em risco de churn",
    description: "Status comercial 'em risco' — precisa de atenção urgente",
    emoji: "🚨",
    campaignType: "risk",
    filter: (a) => a.commercial_status === "at_risk",
    messageHint: "Recuperar clientes em risco",
  },
  {
    id: "cold_leads",
    label: "Leads frios",
    description: "Leads sem contato há mais de 14 dias",
    emoji: "🌱",
    campaignType: "acquisition",
    filter: (a) => {
      const d = daysSince(a.last_contact_at)
      return a.pipeline_stage === "lead" && (d === null || d > 14)
    },
    messageHint: "Reengajar leads que não avançaram",
  },
  {
    id: "high_ltv_recurrence",
    label: "Alta frequência — Reter",
    description: "Clientes em serviço ativo sem contato recente",
    emoji: "🔄",
    campaignType: "recurrence",
    filter: (a) => {
      const d = daysSince(a.last_contact_at)
      const freq = parseFrequencyPerMonth(a.frequency)
      return (
        (a.pipeline_stage === "em_contato" || a.pipeline_stage === "recorrente") &&
        freq >= 3 &&
        d !== null &&
        d > 21
      )
    },
    messageHint: "Fortalecer relacionamento com clientes frequentes",
  },
  {
    id: "quote_followup",
    label: "Propostas sem resposta",
    description: "Proposta enviada há mais de 3 dias sem retorno",
    emoji: "📋",
    campaignType: "follow_up",
    filter: (a) => {
      const d = daysSince(a.last_contact_at)
      return a.pipeline_stage === "proposta" && (d === null || d > 3)
    },
    messageHint: "Verificar se proposta foi recebida",
  },
  {
    id: "high_value_closing",
    label: "Alto valor — Fechamento",
    description: "Em negociação com ticket acima de R$ 500",
    emoji: "⭐",
    campaignType: "follow_up",
    filter: (a) => {
      return (
        a.pipeline_stage === "proposta" &&
        a.estimated_value !== null &&
        a.estimated_value >= 500
      )
    },
    messageHint: "Empurrar fechamento de contratos de alto valor",
  },
]

export function applyPreset(preset: AudiencePreset, accounts: Account[]): Account[] {
  return accounts.filter(preset.filter)
}

export function getPresetById(id: string): AudiencePreset | undefined {
  return AUDIENCE_PRESETS.find((p) => p.id === id)
}

// LTV range filter helper
export function filterByLTV(
  accounts: Account[],
  minLTV: number | null,
  maxLTV: number | null
): Account[] {
  if (minLTV === null && maxLTV === null) return accounts
  return accounts.filter((a) => {
    const ltv = computeLTV(a)
    if (ltv === null) return false
    if (minLTV !== null && ltv < minLTV) return false
    if (maxLTV !== null && ltv > maxLTV) return false
    return true
  })
}
