"use server"

import { createClient } from "@/lib/supabase/server"

export type TimelineEventType =
  | "message_sent"
  | "stage_changed"
  | "deal_created"
  | "deal_won"
  | "deal_lost"
  | "alert"
  | "snooze"
  | "note"
  | "action_taken"

export type TimelineEvent = {
  id: string
  account_id: string
  event_type: TimelineEventType
  summary: string
  metadata: Record<string, unknown> | null
  created_at: string
}

async function getContext(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")
  const { data } = await supabase
    .from("tenant_users")
    .select("tenant_id")
    .eq("user_id", user.id)
    .single()
  if (!data) throw new Error("No tenant")
  return { tenantId: data.tenant_id as string, userId: user.id }
}

export async function logAccountEvent(
  accountId: string,
  eventType: TimelineEventType,
  summary: string,
  metadata?: Record<string, unknown>
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  try {
    const { tenantId, userId } = await getContext(supabase)
    const { error } = await supabase.from("account_timeline").insert({
      tenant_id: tenantId,
      account_id: accountId,
      event_type: eventType,
      summary,
      metadata: metadata ?? null,
      created_by: userId,
    })
    return { error: error?.message ?? null }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro desconhecido" }
  }
}

export async function getAccountTimeline(
  accountId: string,
  limit = 50
): Promise<{ data: TimelineEvent[]; error: string | null }> {
  const supabase = await createClient()
  try {
    await getContext(supabase) // auth check
    const { data, error } = await supabase
      .from("account_timeline")
      .select("id, account_id, event_type, summary, metadata, created_at")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false })
      .limit(limit)
    return { data: (data ?? []) as TimelineEvent[], error: error?.message ?? null }
  } catch (err) {
    return { data: [], error: err instanceof Error ? err.message : "Erro desconhecido" }
  }
}
