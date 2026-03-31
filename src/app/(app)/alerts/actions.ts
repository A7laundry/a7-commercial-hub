"use server"

import { revalidatePath } from "next/cache"
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

  if (!data) throw new Error("No tenant found")
  return data.tenant_id as string
}

export async function generateAlerts() {
  const supabase = await createClient()
  const tenantId = await getTenantId(supabase)

  const now = new Date()
  const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const nowIso = now.toISOString()
  const thirtyIso = thirtyDaysOut.toISOString()

  // Contracts expiring soon (ends_at <= 30d and > now)
  const { data: expiringSoon } = await supabase
    .from("contracts")
    .select("id, title, account_id")
    .eq("tenant_id", tenantId)
    .gt("ends_at", nowIso)
    .lte("ends_at", thirtyIso)

  // Contracts already expired
  const { data: alreadyExpired } = await supabase
    .from("contracts")
    .select("id, title, account_id")
    .eq("tenant_id", tenantId)
    .lt("ends_at", nowIso)

  const upserts = [
    ...(expiringSoon ?? []).map((c: { id: string; title: string; account_id: string }) => ({
      tenant_id: tenantId,
      account_id: c.account_id,
      contract_id: c.id,
      type: "contract_expiring_soon" as const,
      severity: "warning" as const,
      title: `Contrato "${c.title}" vence em breve`,
      status: "open" as const,
    })),
    ...(alreadyExpired ?? []).map((c: { id: string; title: string; account_id: string }) => ({
      tenant_id: tenantId,
      account_id: c.account_id,
      contract_id: c.id,
      type: "contract_expired" as const,
      severity: "critical" as const,
      title: `Contrato "${c.title}" venceu`,
      status: "open" as const,
    })),
  ]

  if (upserts.length > 0) {
    await supabase
      .from("alerts")
      .upsert(upserts, {
        onConflict: "tenant_id,contract_id,type",
        ignoreDuplicates: true,
      })
  }

  revalidatePath("/alerts")
  return { error: null }
}

export async function acknowledgeAlert(id: string) {
  const supabase = await createClient()
  const tenantId = await getTenantId(supabase)

  const { error } = await supabase
    .from("alerts")
    .update({ status: "acknowledged" })
    .eq("id", id)
    .eq("tenant_id", tenantId)

  if (error) return { error: error.message }
  revalidatePath("/alerts")
  return { error: null }
}

export async function resolveAlert(id: string) {
  const supabase = await createClient()
  const tenantId = await getTenantId(supabase)

  const { error } = await supabase
    .from("alerts")
    .update({ status: "resolved" })
    .eq("id", id)
    .eq("tenant_id", tenantId)

  if (error) return { error: error.message }
  revalidatePath("/alerts")
  return { error: null }
}
