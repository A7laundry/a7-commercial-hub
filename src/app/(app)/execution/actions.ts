"use server"

import { createClient } from "@/lib/supabase/server"

async function getTenantId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")
  const { data } = await supabase
    .from("tenant_users")
    .select("tenant_id")
    .eq("user_id", user.id)
    .single()
  if (!data) throw new Error("No tenant")
  return data.tenant_id as string
}

/**
 * Snooze an account in the execution queue for N days.
 * Upserts on (tenant_id, account_id) — re-snoozeing extends the timer.
 */
export async function snoozeAccount(
  accountId: string,
  days = 3
): Promise<{ error: string | null }> {
  const supabase = await createClient()

  let tenantId: string
  try {
    tenantId = await getTenantId(supabase)
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Não autenticado" }
  }

  const snoozedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()

  const { error } = await supabase
    .from("execution_snoozes")
    .upsert(
      { tenant_id: tenantId, account_id: accountId, snoozed_until: snoozedUntil },
      { onConflict: "tenant_id,account_id" }
    )

  // Log snooze to account timeline (fire-and-forget)
  if (!error) {
    const until = new Date(snoozedUntil).toLocaleDateString("pt-BR")
    await supabase.from("account_timeline").insert({
      tenant_id: tenantId,
      account_id: accountId,
      event_type: "snooze",
      summary: `Adicionado à fila em ${until}`,
      metadata: { days, snoozed_until: snoozedUntil },
    })
  }

  return { error: error?.message ?? null }
}

/**
 * Remove snooze for an account (bring it back to the queue immediately).
 */
export async function unsnoozeAccount(
  accountId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient()

  let tenantId: string
  try {
    tenantId = await getTenantId(supabase)
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Não autenticado" }
  }

  const { error } = await supabase
    .from("execution_snoozes")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("account_id", accountId)

  return { error: error?.message ?? null }
}
