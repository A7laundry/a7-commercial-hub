"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { PipelineStage, CommercialStatus } from "@/types"

async function getTenantId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { data } = await supabase
    .from("tenant_users")
    .select("tenant_id")
    .eq("user_id", user.id)
    .single()

  if (!data) throw new Error("No tenant found")
  return data.tenant_id as string
}

export async function movePipelineStage(accountId: string, stage: PipelineStage) {
  const supabase = await createClient()
  const tenantId = await getTenantId(supabase)

  const { error } = await supabase
    .from("accounts")
    .update({ pipeline_stage: stage })
    .eq("id", accountId)
    .eq("tenant_id", tenantId)

  if (error) return { error: error.message }
  revalidatePath("/pipeline")
  revalidatePath(`/accounts/${accountId}`)
  return { error: null }
}

export async function updateCommercialData(accountId: string, formData: FormData) {
  const supabase = await createClient()
  const tenantId = await getTenantId(supabase)

  const lastContact = formData.get("last_contact_at") as string
  const estimatedValue = formData.get("estimated_value") as string

  const { error } = await supabase
    .from("accounts")
    .update({
      pipeline_stage: formData.get("pipeline_stage") as PipelineStage,
      commercial_status: formData.get("commercial_status") as CommercialStatus,
      last_contact_at: lastContact || null,
      next_action: (formData.get("next_action") as string) || null,
      estimated_value: estimatedValue ? Number(estimatedValue) : null,
      frequency: (formData.get("frequency") as string) || null,
      notes: (formData.get("notes") as string) || null,
    })
    .eq("id", accountId)
    .eq("tenant_id", tenantId)

  if (error) return { error: error.message }
  revalidatePath("/pipeline")
  revalidatePath(`/accounts/${accountId}`)
  return { error: null }
}

export async function checkAutomationTriggers(tenantId: string) {
  const supabase = await createClient()

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString()
  const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()

  const triggers: Array<{
    tenant_id: string
    account_id: string
    type: string
    reason: string
    status: string
  }> = []

  // Remarketing: accounts not contacted in 30+ days (with active commercial status)
  const { data: staleAccounts } = await supabase
    .from("accounts")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("commercial_status", "active")
    .or(`last_contact_at.lt.${thirtyDaysAgo},last_contact_at.is.null`)
    .not("pipeline_stage", "in", '("closed","lost")')

  for (const acc of staleAccounts ?? []) {
    triggers.push({
      tenant_id: tenantId,
      account_id: acc.id,
      type: "remarketing",
      reason: "Sem contato há mais de 30 dias",
      status: "pending",
    })
  }

  // Upsell: accounts with expiring contracts
  const { data: expiringContracts } = await supabase
    .from("contracts")
    .select("account_id")
    .eq("tenant_id", tenantId)
    .gt("ends_at", now.toISOString())
    .lte("ends_at", thirtyDaysOut)

  const upsellAccountIds = [...new Set((expiringContracts ?? []).map((c) => c.account_id))]
  for (const accountId of upsellAccountIds) {
    triggers.push({
      tenant_id: tenantId,
      account_id: accountId,
      type: "upsell",
      reason: "Contrato vence em 30 dias — oportunidade de renovação",
      status: "pending",
    })
  }

  // Reactivation: accounts in proposta stage for 14+ days
  const { data: stalledNegotiations } = await supabase
    .from("accounts")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("pipeline_stage", "proposta")
    .lt("updated_at", fourteenDaysAgo)

  for (const acc of stalledNegotiations ?? []) {
    triggers.push({
      tenant_id: tenantId,
      account_id: acc.id,
      type: "reactivation",
      reason: "Proposta parada há mais de 14 dias",
      status: "pending",
    })
  }

  if (triggers.length > 0) {
    await supabase
      .from("automation_triggers")
      .upsert(triggers, { onConflict: "tenant_id,account_id,type", ignoreDuplicates: true })
  }

  revalidatePath("/pipeline")
  return { count: triggers.length, error: null }
}
