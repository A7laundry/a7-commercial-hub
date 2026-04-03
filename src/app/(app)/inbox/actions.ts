"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { logger } from "@/lib/logger"

// ── Auth helper ───────────────────────────────────────────────────────────────

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

// ── normalizePhone ────────────────────────────────────────────────────────────

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "")
  if (digits.length >= 10 && digits.length <= 11) return `+55${digits}`
  return digits.startsWith("+") ? raw : digits
}

// ── mapPhoneToAccount ─────────────────────────────────────────────────────────
// Creates or replaces a phone mapping and retroactively links existing messages.

export async function mapPhoneToAccount(
  phone: string,
  accountId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient()

  let tenantId: string
  try {
    tenantId = await getTenantId(supabase)
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Não autenticado" }
  }

  const normalized = normalizePhone(phone)

  // Verify account belongs to this tenant
  const { data: account } = await supabase
    .from("accounts")
    .select("id")
    .eq("id", accountId)
    .eq("tenant_id", tenantId)
    .single()

  if (!account) return { error: "Conta não encontrada" }

  // Upsert mapping — replaces existing if phone was previously mapped
  const { error: upsertError } = await supabase
    .from("phone_mappings")
    .upsert(
      { tenant_id: tenantId, phone: normalized, account_id: accountId, source: "manual" },
      { onConflict: "tenant_id,phone" }
    )

  if (upsertError) {
    logger.error({ event: "phone_mapping.create", status: "error", tenant_id: tenantId, error: upsertError.message })
    return { error: upsertError.message }
  }

  // Retroactively link existing unlinked messages from this phone
  await supabase
    .from("whatsapp_messages")
    .update({ account_id: accountId })
    .eq("tenant_id", tenantId)
    .eq("phone", normalized)
    .is("account_id", null)

  // Update last_contact_at if there are any messages
  const { data: latest } = await supabase
    .from("whatsapp_messages")
    .select("received_at")
    .eq("tenant_id", tenantId)
    .eq("phone", normalized)
    .order("received_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latest) {
    await supabase
      .from("accounts")
      .update({ last_contact_at: latest.received_at })
      .eq("id", accountId)
      .eq("tenant_id", tenantId)
  }

  logger.info({ event: "phone_mapping.create", status: "ok", tenant_id: tenantId, entity_id: accountId, metadata: { phone: normalized, source: "manual" } })

  revalidatePath("/inbox")
  revalidatePath(`/accounts/${accountId}`)
  return { error: null }
}

// ── unmapPhone ────────────────────────────────────────────────────────────────
// Removes a phone mapping. Existing messages keep their account_id (historical).

export async function unmapPhone(
  phone: string
): Promise<{ error: string | null }> {
  const supabase = await createClient()

  let tenantId: string
  try {
    tenantId = await getTenantId(supabase)
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Não autenticado" }
  }

  const normalized = normalizePhone(phone)

  const { error } = await supabase
    .from("phone_mappings")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("phone", normalized)

  if (error) return { error: error.message }

  logger.info({ event: "phone_mapping.delete", status: "ok", tenant_id: tenantId, metadata: { phone: normalized } })

  revalidatePath("/inbox")
  return { error: null }
}

// ── createAccountFromInbox ────────────────────────────────────────────────────
// Creates a minimal account using a phone from the inbox and immediately maps it.

export async function createAccountFromInbox(
  phone: string,
  name: string
): Promise<{ error: string | null; accountId: string | null }> {
  const supabase = await createClient()

  let tenantId: string
  try {
    tenantId = await getTenantId(supabase)
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Não autenticado", accountId: null }
  }

  if (!name.trim()) return { error: "Nome é obrigatório", accountId: null }

  const normalized = normalizePhone(phone)

  const { data: inserted, error: insertError } = await supabase
    .from("accounts")
    .insert({
      tenant_id: tenantId,
      name: name.trim(),
      status: "prospect",
    })
    .select("id")
    .single()

  if (insertError || !inserted) {
    return { error: insertError?.message ?? "Erro ao criar conta", accountId: null }
  }

  const accountId = inserted.id as string

  const { error: mappingError } = await supabase
    .from("phone_mappings")
    .upsert(
      { tenant_id: tenantId, phone: normalized, account_id: accountId, source: "manual" },
      { onConflict: "tenant_id,phone" }
    )

  if (mappingError) {
    // Account created but mapping failed — still return accountId so user can continue
    logger.error({ event: "phone_mapping.create_from_inbox", status: "error", tenant_id: tenantId, error: mappingError.message })
    return { error: null, accountId }
  }

  // Retroactively link existing messages
  await supabase
    .from("whatsapp_messages")
    .update({ account_id: accountId })
    .eq("tenant_id", tenantId)
    .eq("phone", normalized)
    .is("account_id", null)

  logger.info({ event: "account.create_from_inbox", status: "ok", tenant_id: tenantId, entity_id: accountId, metadata: { phone: normalized } })

  revalidatePath("/inbox")
  revalidatePath("/accounts")
  return { error: null, accountId }
}
