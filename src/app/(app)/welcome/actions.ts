"use server"

import { createClient } from "@/lib/supabase/server"

// Exported so welcome/page.tsx can type the state
export type OnboardingDbState = {
  created_first_account: boolean
  connected_whatsapp: boolean
  sent_first_message: boolean
  completed_at: string | null
  activated_at: string | null // from activation_metrics
}

const DEFAULT_STATE: OnboardingDbState = {
  created_first_account: false,
  connected_whatsapp: false,
  sent_first_message: false,
  completed_at: null,
  activated_at: null,
}

async function getTenantId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Não autenticado")
  const { data } = await supabase
    .from("tenant_users")
    .select("tenant_id")
    .eq("user_id", user.id)
    .single()
  if (!data) throw new Error("Tenant não encontrado")
  return data.tenant_id as string
}

// ---------------------------------------------------------------------------
// getOnboardingDbState
// Reads from onboarding_state + activation_metrics.
// Returns a flat OnboardingDbState (defaults to all-false if no row yet).
// ---------------------------------------------------------------------------
export async function getOnboardingDbState(): Promise<OnboardingDbState> {
  const supabase = await createClient()

  let tenantId: string
  try {
    tenantId = await getTenantId(supabase)
  } catch {
    return DEFAULT_STATE
  }

  const [stateRes, metricsRes] = await Promise.all([
    supabase
      .from("onboarding_state")
      .select("created_first_account, connected_whatsapp, sent_first_message, completed_at")
      .eq("tenant_id", tenantId)
      .maybeSingle(),
    supabase
      .from("activation_metrics")
      .select("activated_at")
      .eq("tenant_id", tenantId)
      .maybeSingle(),
  ])

  if (!stateRes.data) return DEFAULT_STATE

  return {
    created_first_account: stateRes.data.created_first_account,
    connected_whatsapp: stateRes.data.connected_whatsapp,
    sent_first_message: stateRes.data.sent_first_message,
    completed_at: stateRes.data.completed_at ?? null,
    activated_at: metricsRes.data?.activated_at ?? null,
  }
}

// ---------------------------------------------------------------------------
// markOnboardingStep
// Upserts the relevant boolean column in onboarding_state.
// If all 3 steps are now true → also sets completed_at.
// ---------------------------------------------------------------------------
export async function markOnboardingStep(
  step: "account" | "whatsapp" | "message"
): Promise<{ error: string | null }> {
  const supabase = await createClient()

  let tenantId: string
  try {
    tenantId = await getTenantId(supabase)
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Não autenticado" }
  }

  const fieldMap = {
    account: "created_first_account",
    whatsapp: "connected_whatsapp",
    message: "sent_first_message",
  } as const

  const { error: upsertError } = await supabase
    .from("onboarding_state")
    .upsert(
      { tenant_id: tenantId, [fieldMap[step]]: true },
      { onConflict: "tenant_id" }
    )

  if (upsertError) return { error: upsertError.message }

  // If all 3 are now done and completed_at not yet set → set it now
  const { data: state } = await supabase
    .from("onboarding_state")
    .select("created_first_account, connected_whatsapp, sent_first_message, completed_at")
    .eq("tenant_id", tenantId)
    .single()

  if (
    state?.created_first_account &&
    state.connected_whatsapp &&
    state.sent_first_message &&
    !state.completed_at
  ) {
    await supabase
      .from("onboarding_state")
      .update({ completed_at: new Date().toISOString() })
      .eq("tenant_id", tenantId)
  }

  return { error: null }
}

// ---------------------------------------------------------------------------
// recordActivation
// Sets activated_at in activation_metrics + completed_at in onboarding_state.
// activation_metrics tracks when each milestone was first reached.
// Safe to call multiple times — returns alreadyActivated: true if repeated.
// ---------------------------------------------------------------------------
export async function recordActivation(): Promise<{
  error: string | null
  alreadyActivated: boolean
}> {
  const supabase = await createClient()

  let tenantId: string
  try {
    tenantId = await getTenantId(supabase)
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Não autenticado", alreadyActivated: false }
  }

  // Idempotency: check if already activated
  const { data: existing } = await supabase
    .from("activation_metrics")
    .select("activated_at")
    .eq("tenant_id", tenantId)
    .maybeSingle()

  if (existing?.activated_at) {
    return { error: null, alreadyActivated: true }
  }

  const now = new Date().toISOString()

  // Upsert activation_metrics — only sets timestamps that are null
  const { error: metricsError } = await supabase
    .from("activation_metrics")
    .upsert(
      {
        tenant_id: tenantId,
        activated_at: now,
        account_created_at: now,
        whatsapp_connected_at: now,
        first_message_sent_at: now,
      },
      { onConflict: "tenant_id" }
    )

  if (metricsError) return { error: metricsError.message, alreadyActivated: false }

  // Ensure onboarding_state has completed_at (columns: no activated_at here)
  await supabase
    .from("onboarding_state")
    .upsert(
      { tenant_id: tenantId, completed_at: now },
      { onConflict: "tenant_id" }
    )

  return { error: null, alreadyActivated: false }
}
