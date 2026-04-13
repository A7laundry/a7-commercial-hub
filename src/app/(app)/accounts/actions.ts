"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { checkAccountLimit } from "@/lib/billing-guard"

async function getTenantId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { data } = await supabase
    .from("tenant_users")
    .select("tenant_id")
    .eq("user_id", user.id)
    .single()

  if (!data) throw new Error("No tenant found")
  return data.tenant_id as string
}

export type CreateAccountInput = {
  clientType: 'pf' | 'pj'
  name: string
  phone: string
  email: string
  segment?: string
  pipeline_stage?: string
  estimated_value?: string
  frequency?: string
  source?: string
  contact_name?: string
  cnpj?: string
  cpf?: string
  tags?: string[]
  notes?: string
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "")
  if (digits.length >= 10 && digits.length <= 11) {
    return `+55${digits}`
  }
  return digits
}

export async function createAccountFull(
  data: CreateAccountInput
): Promise<{ error: string | null; accountId: string | null; phone: string | null }> {
  try {
    const supabase = await createClient()
    const tenantId = await getTenantId(supabase)

    // Plan limit check
    const limitCheck = await checkAccountLimit(tenantId)
    if (!limitCheck.allowed) {
      return { error: limitCheck.reason!, accountId: null, phone: null }
    }

    const estimatedValue = data.estimated_value
      ? Number(data.estimated_value)
      : null

    const { data: inserted, error: insertError } = await supabase
      .from("accounts")
      .insert({
        tenant_id: tenantId,
        name: data.name,
        contact_email: data.email,
        contact_name: data.contact_name || null,
        segment: data.segment || null,
        // P0 FIX: No default pipeline_stage — accounts must be explicitly placed in pipeline.
        // Pass pipeline_stage only if explicitly provided by the caller.
        ...(data.pipeline_stage ? { pipeline_stage: data.pipeline_stage } : {}),
        commercial_status: "active",
        status: "active",
        estimated_value: isNaN(estimatedValue as number) ? null : estimatedValue,
        frequency: data.frequency || null,
        notes: data.notes || null,
        source: data.source || null,
        client_type: data.clientType,
        cnpj: data.cnpj || null,
        cpf: data.cpf || null,
        tags: data.tags || null,
      })
      .select("id")
      .single()

    if (insertError) {
      return { error: insertError.message, accountId: null, phone: null }
    }

    const accountId = inserted.id as string
    const normalizedPhone = normalizePhone(data.phone)

    // Upsert phone — if number already mapped, keep existing; don't fail account creation
    await supabase
      .from("phone_mappings")
      .upsert(
        { tenant_id: tenantId, account_id: accountId, phone: normalizedPhone },
        { onConflict: "tenant_id,phone", ignoreDuplicates: true }
      )

    revalidatePath("/accounts")
    revalidatePath("/pipeline")
    return { error: null, accountId, phone: normalizedPhone }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return { error: message, accountId: null, phone: null }
  }
}

export async function updateAccount(id: string, formData: FormData) {
  const supabase = await createClient()
  const tenantId = await getTenantId(supabase)

  const estimatedValue = formData.get("estimated_value") as string
  const lastContact = formData.get("last_contact_at") as string
  const pipelineStage = formData.get("pipeline_stage") as string
  const commercialStatus = formData.get("commercial_status") as string

  const { error } = await supabase
    .from("accounts")
    .update({
      name: formData.get("name") as string,
      segment: (formData.get("segment") as string) || null,
      contact_name: (formData.get("contact_name") as string) || null,
      contact_email: (formData.get("contact_email") as string) || null,
      status: formData.get("status") as string,
      notes: (formData.get("notes") as string) || null,
      ...(pipelineStage && { pipeline_stage: pipelineStage }),
      ...(commercialStatus && { commercial_status: commercialStatus }),
      estimated_value: estimatedValue ? Number(estimatedValue) : null,
      frequency: (formData.get("frequency") as string) || null,
      last_contact_at: lastContact || null,
      next_action: (formData.get("next_action") as string) || null,
    })
    .eq("id", id)
    .eq("tenant_id", tenantId)

  if (error) return { error: error.message }
  revalidatePath(`/accounts/${id}`)
  revalidatePath("/accounts")
  return { error: null }
}

// Valid loss reasons — must match accounts.loss_reason CHECK in DB
const VALID_LOSS_REASONS = [
  "price",
  "no_response",
  "out_of_area",
  "competitor",
  "budget",
  "timing",
  "other",
] as const

export type LossReason = typeof VALID_LOSS_REASONS[number]

/**
 * P0 FIX: Mark account as LOST with mandatory loss_reason.
 * This is the ONLY server action that sets commercial_status=lost.
 * Using updateAccount() to set lost is blocked by this separation.
 */
export async function markAccountLost(
  id: string,
  loss_reason: LossReason,
  loss_notes?: string
): Promise<{ error: string | null }> {
  if (!loss_reason || !VALID_LOSS_REASONS.includes(loss_reason)) {
    return { error: `loss_reason obrigatório. Valores válidos: ${VALID_LOSS_REASONS.join(", ")}` }
  }

  const supabase = await createClient()
  const tenantId = await getTenantId(supabase)

  const { error } = await supabase
    .from("accounts")
    .update({
      commercial_status: "lost",
      pipeline_stage: "closed",
      loss_reason,
      notes: loss_notes ?? null,
    })
    .eq("id", id)
    .eq("tenant_id", tenantId)

  if (error) return { error: error.message }

  revalidatePath(`/accounts/${id}`)
  revalidatePath("/accounts")
  revalidatePath("/pipeline")
  return { error: null }
}

export async function deleteAccount(id: string) {
  const supabase = await createClient()
  const tenantId = await getTenantId(supabase)

  const { error } = await supabase
    .from("accounts")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId)

  if (error) return { error: error.message }
  revalidatePath("/accounts")
  return { error: null }
}
