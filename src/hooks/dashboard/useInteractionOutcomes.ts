import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"

export type LogOutcomeInput = {
  account_name: string
  account_id?: string | null
  operator_name: string
  unit?: string
  outcome_type: string
  revenue_amount?: number | null
  notes?: string
}

// Maps outcome types to pipeline stages (only positive outcomes update the stage)
const OUTCOME_TO_STAGE: Record<string, string> = {
  sale:       "sucesso",
  quote_only: "proposta",
}

export function useLogOutcome(tenantId: string, date: string) {
  const supabase = createClient()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (input: LogOutcomeInput) => {
      const { data, error } = await supabase
        .from("interaction_outcomes")
        .insert({
          tenant_id: tenantId,
          date,
          account_name: input.account_name,
          account_id: input.account_id ?? null,
          operator_name: input.operator_name,
          unit: input.unit ?? null,
          outcome_type: input.outcome_type,
          revenue_amount: input.revenue_amount ?? null,
          notes: input.notes ?? null,
        })
        .select()
        .single()
      if (error) throw error

      // Update pipeline stage when a linked account has a positive outcome
      const newStage = OUTCOME_TO_STAGE[input.outcome_type]
      if (input.account_id && newStage) {
        await supabase
          .from("accounts")
          .update({ pipeline_stage: newStage, last_contact_at: new Date().toISOString() })
          .eq("id", input.account_id)
          .eq("tenant_id", tenantId)
      }

      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["daily_performance", tenantId, date] })
      qc.invalidateQueries({ queryKey: ["operator_daily_activity", tenantId, date] })
      qc.invalidateQueries({ queryKey: ["pipeline", tenantId] })
      qc.invalidateQueries({ queryKey: ["dashboard", tenantId] })
    },
  })
}

export function useDeleteOutcome(tenantId: string, date: string) {
  const supabase = createClient()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("interaction_outcomes")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["daily_performance", tenantId, date] })
      qc.invalidateQueries({ queryKey: ["operator_daily_activity", tenantId, date] })
    },
  })
}
