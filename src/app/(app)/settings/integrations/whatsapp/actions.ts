"use server"

import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { randomUUID } from "crypto"

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
  // Semantic alias for instance_id column — stores Meta phone_number_id
  phone_number_id: string
  status: "connected" | "disconnected" | "error"
  last_activity_at: string | null
  webhook_last_event_at: string | null
  webhook_status: "active" | "inactive" | "unknown"
  waba_id: string | null
  // verify_token is read-only from client — displayed so operator can copy it
  // into Meta for Developers. Never returned: access_token (api_key).
  verify_token: string
}

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
      "phone_number, instance_id, status, last_activity_at, webhook_last_event_at, webhook_status, waba_id, verify_token"
    )
    .eq("tenant_id", tenantId)
    .maybeSingle()

  if (!data) return null

  return {
    phone_number: data.phone_number,
    phone_number_id: data.instance_id,  // column still named instance_id in DB
    status: data.status,
    last_activity_at: data.last_activity_at,
    webhook_last_event_at: data.webhook_last_event_at,
    webhook_status: data.webhook_status,
    waba_id: data.waba_id ?? null,
    verify_token: data.verify_token ?? "",
  } as WhatsAppIntegrationRow
}

export async function saveIntegration(input: {
  phoneNumber: string
  accessToken: string
  phoneNumberId: string
  wabaId: string
}): Promise<{ error: string | null; verify_token?: string }> {
  const supabase = await createClient()

  let tenantId: string
  try {
    tenantId = await getTenantId(supabase)
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Não autenticado" }
  }

  // Preserve existing verify_token if row already exists — only generate on first save.
  const { data: existing } = await supabase
    .from("whatsapp_integrations")
    .select("verify_token")
    .eq("tenant_id", tenantId)
    .maybeSingle()

  const verifyToken =
    (existing?.verify_token && existing.verify_token !== "")
      ? existing.verify_token
      : randomUUID()

  const now = new Date().toISOString()

  const { error } = await supabase.from("whatsapp_integrations").upsert(
    {
      tenant_id: tenantId,
      phone_number: input.phoneNumber.trim(),
      api_key: input.accessToken.trim(),       // column still named api_key in DB
      instance_id: input.phoneNumberId.trim(), // column still named instance_id in DB
      waba_id: input.wabaId.trim() || null,
      verify_token: verifyToken,
      status: "connected",
      last_activity_at: now,
      updated_at: now,
    },
    { onConflict: "tenant_id" }
  )

  if (error) return { error: error.message }

  // P0 fix: populate whatsapp_tenant_config so inbound messages from new contacts
  // can be routed to the correct tenant via phone_number_id → tenant_id lookup.
  const service = createServiceClient()
  const { error: configError } = await service
    .from("whatsapp_tenant_config")
    .upsert(
      { tenant_id: tenantId, phone_number_id: input.phoneNumberId.trim() },
      { onConflict: "phone_number_id" }
    )

  if (configError) return { error: configError.message }

  return { error: null, verify_token: verifyToken }
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
