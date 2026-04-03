"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { logger } from "@/lib/logger"
import type { Deal, DealStage, DealLossReason } from "@/types"

// ─── Auth helper ──────────────────────────────────────────────────────────────

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
  return { tenantId: data.tenant_id as string, userId: user.id }
}

// ─── Input types ──────────────────────────────────────────────────────────────

export type CreateDealInput = {
  account_id: string
  title: string
  value?: number | null
  expected_close_date?: string | null
  notes?: string | null
}

export type UpdateDealInput = {
  title?: string
  value?: number | null
  assigned_to?: string | null
  expected_close_date?: string | null
  notes?: string | null
}

// ─── Stage validation ─────────────────────────────────────────────────────────

const TERMINAL_STAGES: DealStage[] = ['won', 'lost']

// ─── createDeal ───────────────────────────────────────────────────────────────

export async function createDeal(data: CreateDealInput): Promise<{ error: string | null; deal?: Deal }> {
  const supabase = await createClient()

  let tenantId: string
  let userId: string
  try {
    const result = await getTenantId(supabase)
    tenantId = result.tenantId
    userId = result.userId
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Não autenticado" }
  }

  const { data: deal, error } = await supabase
    .from("deals")
    .insert({
      tenant_id: tenantId,
      account_id: data.account_id,
      title: data.title,
      value: data.value ?? null,
      stage: 'new' as DealStage,
      expected_close_date: data.expected_close_date ?? null,
      notes: data.notes ?? null,
    })
    .select()
    .single()

  if (error) {
    logger.error({
      event: "deal.create",
      status: "error",
      tenant_id: tenantId,
      error: error.message,
    })
    return { error: error.message }
  }

  // Insert initial history entry
  await supabase.from("deal_stage_history").insert({
    deal_id: deal.id,
    tenant_id: tenantId,
    from_stage: null,
    to_stage: 'new',
    changed_by: userId,
    notes: "Oportunidade criada",
  })

  logger.info({
    event: "deal.create",
    status: "ok",
    tenant_id: tenantId,
    entity_id: deal.id,
  })

  revalidatePath("/pipeline")
  revalidatePath("/deals")
  return { error: null, deal: deal as Deal }
}

// ─── updateDealStage ──────────────────────────────────────────────────────────

export async function updateDealStage(
  dealId: string,
  newStage: DealStage,
  notes?: string
): Promise<{ error: string | null }> {
  const supabase = await createClient()

  let tenantId: string
  let userId: string
  try {
    const result = await getTenantId(supabase)
    tenantId = result.tenantId
    userId = result.userId
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Não autenticado" }
  }

  // Fetch current deal
  const { data: existing, error: fetchError } = await supabase
    .from("deals")
    .select("id, stage, tenant_id")
    .eq("id", dealId)
    .eq("tenant_id", tenantId)
    .single()

  if (fetchError || !existing) {
    return { error: "Oportunidade não encontrada" }
  }

  if (TERMINAL_STAGES.includes(existing.stage as DealStage)) {
    return { error: "Não é possível alterar o estágio de uma oportunidade finalizada (ganha/perdida)" }
  }

  // Use markDealWon / markDealLost for terminal transitions
  if (newStage === 'won' || newStage === 'lost') {
    return { error: "Use markDealWon ou markDealLost para finalizar uma oportunidade" }
  }

  const fromStage = existing.stage as DealStage

  const { error: updateError } = await supabase
    .from("deals")
    .update({ stage: newStage })
    .eq("id", dealId)
    .eq("tenant_id", tenantId)

  if (updateError) {
    logger.error({
      event: "deal.stage_update",
      status: "error",
      tenant_id: tenantId,
      entity_id: dealId,
      error: updateError.message,
    })
    return { error: updateError.message }
  }

  await supabase.from("deal_stage_history").insert({
    deal_id: dealId,
    tenant_id: tenantId,
    from_stage: fromStage,
    to_stage: newStage,
    changed_by: userId,
    notes: notes ?? null,
  })

  logger.info({
    event: "deal.stage_update",
    status: "ok",
    tenant_id: tenantId,
    entity_id: dealId,
    metadata: { from: fromStage, to: newStage },
  })

  revalidatePath("/pipeline")
  revalidatePath("/deals")
  return { error: null }
}

// ─── markDealWon ──────────────────────────────────────────────────────────────

export async function markDealWon(dealId: string): Promise<{ error: string | null }> {
  const supabase = await createClient()

  let tenantId: string
  let userId: string
  try {
    const result = await getTenantId(supabase)
    tenantId = result.tenantId
    userId = result.userId
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Não autenticado" }
  }

  const { data: existing, error: fetchError } = await supabase
    .from("deals")
    .select("id, stage, tenant_id")
    .eq("id", dealId)
    .eq("tenant_id", tenantId)
    .single()

  if (fetchError || !existing) {
    return { error: "Oportunidade não encontrada" }
  }

  if (TERMINAL_STAGES.includes(existing.stage as DealStage)) {
    return { error: "Oportunidade já finalizada" }
  }

  const fromStage = existing.stage as DealStage

  const { error: updateError } = await supabase
    .from("deals")
    .update({ stage: 'won', won_at: new Date().toISOString() })
    .eq("id", dealId)
    .eq("tenant_id", tenantId)

  if (updateError) {
    logger.error({
      event: "deal.mark_won",
      status: "error",
      tenant_id: tenantId,
      entity_id: dealId,
      error: updateError.message,
    })
    return { error: updateError.message }
  }

  await supabase.from("deal_stage_history").insert({
    deal_id: dealId,
    tenant_id: tenantId,
    from_stage: fromStage,
    to_stage: 'won',
    changed_by: userId,
    notes: "Oportunidade marcada como ganha",
  })

  logger.info({
    event: "deal.mark_won",
    status: "ok",
    tenant_id: tenantId,
    entity_id: dealId,
  })

  revalidatePath("/pipeline")
  revalidatePath("/deals")
  return { error: null }
}

// ─── markDealLost ─────────────────────────────────────────────────────────────

export async function markDealLost(
  dealId: string,
  loss_reason: DealLossReason,
  notes?: string
): Promise<{ error: string | null }> {
  const supabase = await createClient()

  let tenantId: string
  let userId: string
  try {
    const result = await getTenantId(supabase)
    tenantId = result.tenantId
    userId = result.userId
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Não autenticado" }
  }

  const { data: existing, error: fetchError } = await supabase
    .from("deals")
    .select("id, stage, tenant_id")
    .eq("id", dealId)
    .eq("tenant_id", tenantId)
    .single()

  if (fetchError || !existing) {
    return { error: "Oportunidade não encontrada" }
  }

  if (TERMINAL_STAGES.includes(existing.stage as DealStage)) {
    return { error: "Oportunidade já finalizada" }
  }

  const fromStage = existing.stage as DealStage

  const { error: updateError } = await supabase
    .from("deals")
    .update({
      stage: 'lost',
      lost_at: new Date().toISOString(),
      loss_reason,
      notes: notes ?? null,
    })
    .eq("id", dealId)
    .eq("tenant_id", tenantId)

  if (updateError) {
    logger.error({
      event: "deal.mark_lost",
      status: "error",
      tenant_id: tenantId,
      entity_id: dealId,
      error: updateError.message,
    })
    return { error: updateError.message }
  }

  await supabase.from("deal_stage_history").insert({
    deal_id: dealId,
    tenant_id: tenantId,
    from_stage: fromStage,
    to_stage: 'lost',
    changed_by: userId,
    notes: notes ?? `Motivo: ${loss_reason}`,
  })

  logger.info({
    event: "deal.mark_lost",
    status: "ok",
    tenant_id: tenantId,
    entity_id: dealId,
    metadata: { loss_reason },
  })

  revalidatePath("/pipeline")
  revalidatePath("/deals")
  return { error: null }
}

// ─── updateDeal ───────────────────────────────────────────────────────────────

export async function updateDeal(
  dealId: string,
  data: UpdateDealInput
): Promise<{ error: string | null }> {
  const supabase = await createClient()

  let tenantId: string
  try {
    const result = await getTenantId(supabase)
    tenantId = result.tenantId
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Não autenticado" }
  }

  // Build update object — never allow stage changes via this function
  const updateData: Record<string, unknown> = {}
  if (data.title !== undefined) updateData.title = data.title
  if (data.value !== undefined) updateData.value = data.value
  if (data.assigned_to !== undefined) updateData.assigned_to = data.assigned_to
  if (data.expected_close_date !== undefined) updateData.expected_close_date = data.expected_close_date
  if (data.notes !== undefined) updateData.notes = data.notes

  const { error } = await supabase
    .from("deals")
    .update(updateData)
    .eq("id", dealId)
    .eq("tenant_id", tenantId)

  if (error) {
    logger.error({
      event: "deal.update",
      status: "error",
      tenant_id: tenantId,
      entity_id: dealId,
      error: error.message,
    })
    return { error: error.message }
  }

  logger.info({
    event: "deal.update",
    status: "ok",
    tenant_id: tenantId,
    entity_id: dealId,
  })

  revalidatePath("/pipeline")
  revalidatePath("/deals")
  return { error: null }
}

// ─── deleteDeal ───────────────────────────────────────────────────────────────

export async function deleteDeal(dealId: string): Promise<{ error: string | null }> {
  const supabase = await createClient()

  let tenantId: string
  try {
    const result = await getTenantId(supabase)
    tenantId = result.tenantId
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Não autenticado" }
  }

  const { data: existing, error: fetchError } = await supabase
    .from("deals")
    .select("id, stage, tenant_id")
    .eq("id", dealId)
    .eq("tenant_id", tenantId)
    .single()

  if (fetchError || !existing) {
    return { error: "Oportunidade não encontrada" }
  }

  const stage = existing.stage as DealStage
  if (stage !== 'new' && stage !== 'lost') {
    return { error: "Só é permitido excluir oportunidades no estágio 'novo' ou 'perdido'" }
  }

  const { error } = await supabase
    .from("deals")
    .delete()
    .eq("id", dealId)
    .eq("tenant_id", tenantId)

  if (error) {
    logger.error({
      event: "deal.delete",
      status: "error",
      tenant_id: tenantId,
      entity_id: dealId,
      error: error.message,
    })
    return { error: error.message }
  }

  logger.info({
    event: "deal.delete",
    status: "ok",
    tenant_id: tenantId,
    entity_id: dealId,
  })

  revalidatePath("/pipeline")
  revalidatePath("/deals")
  return { error: null }
}

// ─── getDealsByStage ──────────────────────────────────────────────────────────

export async function getDealsByStage(
  tenantId: string
): Promise<{ error: string | null; data?: Record<DealStage, Deal[]> }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("deals")
    .select(`
      *,
      accounts!inner(name)
    `)
    .eq("tenant_id", tenantId)
    .order("updated_at", { ascending: false })

  if (error) {
    return { error: error.message }
  }

  const STAGES: DealStage[] = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost']

  const byStage = STAGES.reduce((acc, stage) => {
    acc[stage] = []
    return acc
  }, {} as Record<DealStage, Deal[]>)

  for (const row of data ?? []) {
    const deal: Deal = {
      ...row,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      account_name: (row as any).accounts?.name ?? undefined,
    }
    const stage = deal.stage as DealStage
    if (byStage[stage]) {
      byStage[stage].push(deal)
    }
  }

  return { error: null, data: byStage }
}

// ─── getDealStats ─────────────────────────────────────────────────────────────

export type DealStats = {
  total: number
  byStage: Record<DealStage, { count: number; value: number }>
  totalValue: number
  wonValue: number
  conversionRate: number
}

export async function getDealStats(
  tenantId: string
): Promise<{ error: string | null; data?: DealStats }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("deals")
    .select("stage, value")
    .eq("tenant_id", tenantId)

  if (error) {
    return { error: error.message }
  }

  const STAGES: DealStage[] = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost']

  const byStage = STAGES.reduce((acc, stage) => {
    acc[stage] = { count: 0, value: 0 }
    return acc
  }, {} as Record<DealStage, { count: number; value: number }>)

  let totalValue = 0
  let wonValue = 0
  let total = 0

  for (const row of data ?? []) {
    const stage = row.stage as DealStage
    const val = Number(row.value ?? 0)
    if (byStage[stage]) {
      byStage[stage].count++
      byStage[stage].value += val
    }
    total++
    totalValue += val
    if (stage === 'won') wonValue += val
  }

  const closedDeals = (byStage.won?.count ?? 0) + (byStage.lost?.count ?? 0)
  const conversionRate = closedDeals > 0
    ? Math.round(((byStage.won?.count ?? 0) / closedDeals) * 100)
    : 0

  return {
    error: null,
    data: { total, byStage, totalValue, wonValue, conversionRate },
  }
}
