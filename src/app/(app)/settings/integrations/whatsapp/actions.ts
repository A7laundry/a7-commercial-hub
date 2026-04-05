"use server"

import { createClient } from "@/lib/supabase/server"

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
  if (!data) throw new Error("No tenant")
  return data.tenant_id as string
}

export type WhatsAppIntegrationRow = {
  phone_number: string
  instance_id: string
  status: "connected" | "disconnected" | "error"
  last_activity_at: string | null
  webhook_last_event_at: string | null
  webhook_status: "active" | "inactive" | "unknown"
}

// api_key is intentionally excluded from the return type —
// it is write-only from the client's perspective.

export async function loadIntegration(): Promise<WhatsAppIntegrationRow | null> {
  const supabase = await createClient()

  let tenantId: string
  try {
    tenantId = await getTenantId(supabase)
  } catch {
    return null
  }

  const { data } = await supabase
    .from("whatsapp_integrations")
    .select(
      "phone_number, instance_id, status, last_activity_at, webhook_last_event_at, webhook_status"
    )
    .eq("tenant_id", tenantId)
    .maybeSingle()

  return (data as WhatsAppIntegrationRow | null) ?? null
}

export async function saveIntegration(input: {
  phoneNumber: string
  apiKey: string
  instanceId: string
}): Promise<{ error: string | null }> {
  const supabase = await createClient()

  let tenantId: string
  try {
    tenantId = await getTenantId(supabase)
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Não autenticado" }
  }

  const now = new Date().toISOString()

  const { error } = await supabase.from("whatsapp_integrations").upsert(
    {
      tenant_id: tenantId,
      phone_number: input.phoneNumber.trim(),
      api_key: input.apiKey.trim(),
      instance_id: input.instanceId.trim(),
      status: "connected",
      last_activity_at: now,
      updated_at: now,
    },
    { onConflict: "tenant_id" }
  )

  return { error: error?.message ?? null }
}

export async function disconnectIntegration(): Promise<{ error: string | null }> {
  const supabase = await createClient()

  let tenantId: string
  try {
    tenantId = await getTenantId(supabase)
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Não autenticado" }
  }

  const { error } = await supabase
    .from("whatsapp_integrations")
    .update({ status: "disconnected", updated_at: new Date().toISOString() })
    .eq("tenant_id", tenantId)

  return { error: error?.message ?? null }
}
