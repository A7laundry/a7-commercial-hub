"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { logger } from "@/lib/logger"

export type ConversationStatus =
  | "open"
  | "pending_customer"
  | "pending_internal"
  | "resolved"
  | "spam"
  | "archived"

const VALID_STATUSES: ConversationStatus[] = [
  "open", "pending_customer", "pending_internal", "resolved", "spam",
]

export type TenantMember = {
  userId: string
  email: string
  name: string | null
}

// ── getTenantMembers ──────────────────────────────────────────────────────────
// Returns all users that belong to the caller's tenant.
// Uses service role to access auth.users safely server-side.

export async function getTenantMembers(): Promise<TenantMember[]> {
  const supabase = await createClient()

  let tenantId: string
  try {
    tenantId = await getTenantId(supabase)
  } catch {
    return []
  }

  // Get all user_ids for this tenant
  const { data: members } = await supabase
    .from("tenant_users")
    .select("user_id, role")
    .eq("tenant_id", tenantId)

  if (!members?.length) return []

  const userIds = members.map((m) => m.user_id as string)

  // Fetch user emails via service role (auth.users not accessible from anon client)
  const service = createServiceClient()

  const profiles = await Promise.all(
    userIds.map(async (uid) => {
      const { data } = await service.auth.admin.getUserById(uid)
      return data?.user
        ? {
            userId: uid,
            email: data.user.email ?? uid,
            name: (data.user.user_metadata?.name as string | null) ?? null,
          }
        : null
    })
  )

  return profiles.filter(Boolean) as TenantMember[]
}

// ── assignConversation ────────────────────────────────────────────────────────
// Assign or unassign a conversation. Validates cross-tenant safety.

export async function assignConversation(
  conversationId: string,
  assignedTo: string | null   // null = remove assignment
): Promise<{ error: string | null }> {
  const supabase = await createClient()

  let tenantId: string
  try {
    tenantId = await getTenantId(supabase)
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Não autenticado" }
  }

  // If assigning to a user, validate they belong to this tenant
  if (assignedTo !== null) {
    const { data: membership } = await supabase
      .from("tenant_users")
      .select("user_id")
      .eq("tenant_id", tenantId)
      .eq("user_id", assignedTo)
      .maybeSingle()

    if (!membership) {
      return { error: "Usuário não pertence a este tenant" }
    }
  }

  const now = new Date().toISOString()
  const { error } = await supabase
    .from("wa_conversations")
    .update({
      assigned_to: assignedTo,
      assigned_at: assignedTo ? now : null,
      updated_at: now,
    })
    .eq("id", conversationId)
    .eq("tenant_id", tenantId)

  if (error) {
    logger.error({
      event: "conversation.assign",
      status: "error",
      tenant_id: tenantId,
      entity_id: conversationId,
      error: error.message,
    })
    return { error: error.message }
  }

  logger.info({
    event: "conversation.assign",
    status: "ok",
    tenant_id: tenantId,
    entity_id: conversationId,
    metadata: { assigned_to: assignedTo },
  })

  return { error: null }
}

// ── updateConversationStatus ──────────────────────────────────────────────────
// Change the operational status of a conversation.
// Sets resolved_at when marking resolved; clears it when reopening.

export async function updateConversationStatus(
  conversationId: string,
  status: ConversationStatus
): Promise<{ error: string | null }> {
  const supabase = await createClient()

  if (!VALID_STATUSES.includes(status)) {
    return { error: `Status inválido: ${status}` }
  }

  let tenantId: string
  try {
    tenantId = await getTenantId(supabase)
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Não autenticado" }
  }

  const now = new Date().toISOString()
  const extra: Record<string, unknown> = { updated_at: now }
  if (status === "resolved") extra.resolved_at = now
  if (status === "open")     extra.resolved_at = null

  const { error } = await supabase
    .from("wa_conversations")
    .update({ status, ...extra })
    .eq("id", conversationId)
    .eq("tenant_id", tenantId)

  if (error) {
    logger.error({
      event: "conversation.status_change",
      status: "error",
      tenant_id: tenantId,
      entity_id: conversationId,
      error: error.message,
    })
    return { error: error.message }
  }

  logger.info({
    event: "conversation.status_change",
    status: "ok",
    tenant_id: tenantId,
    entity_id: conversationId,
    metadata: { new_status: status },
  })

  return { error: null }
}

// ── markConversationRead ──────────────────────────────────────────────────────

export async function markConversationRead(
  conversationId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient()

  let tenantId: string
  try {
    tenantId = await getTenantId(supabase)
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Não autenticado" }
  }

  const { error } = await supabase
    .from("wa_conversations")
    .update({ unread_count: 0, updated_at: new Date().toISOString() })
    .eq("id", conversationId)
    .eq("tenant_id", tenantId)

  return { error: error?.message ?? null }
}

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

  // Backfill account_id on the conversation row
  await supabase
    .from("wa_conversations")
    .update({ account_id: accountId, updated_at: new Date().toISOString() })
    .eq("tenant_id", tenantId)
    .eq("phone", normalized)

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

  // Backfill account_id on the conversation row
  await supabase
    .from("wa_conversations")
    .update({ account_id: accountId, updated_at: new Date().toISOString() })
    .eq("tenant_id", tenantId)
    .eq("phone", normalized)

  logger.info({ event: "account.create_from_inbox", status: "ok", tenant_id: tenantId, entity_id: accountId, metadata: { phone: normalized } })

  revalidatePath("/inbox")
  revalidatePath("/accounts")
  return { error: null, accountId }
}
