import { createClient } from "@/lib/supabase/server"
import { getEffectiveLimits, type PlanId, type SubscriptionStatus } from "@/lib/plans"

type LimitKey = "accounts" | "campaigns" | "messages"

type CheckResult = {
  allowed: boolean
  reason: string | null    // null = allowed
  currentCount?: number
  limit?: number
}

// Get current subscription for a tenant (returns free/trialing defaults if no row)
export async function getTenantSubscription(tenantId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("subscriptions")
    .select("plan, status, current_period_end, trial_end")
    .eq("tenant_id", tenantId)
    .maybeSingle()

  return {
    plan: (data?.plan ?? "free") as PlanId,
    status: (data?.status ?? "trialing") as SubscriptionStatus,
    current_period_end: data?.current_period_end ?? null,
    trial_end: data?.trial_end ?? null,
  }
}

// Check if creating a new account is within limits
export async function checkAccountLimit(tenantId: string): Promise<CheckResult> {
  const supabase = await createClient()
  const sub = await getTenantSubscription(tenantId)
  const limits = getEffectiveLimits(sub.plan, sub.status)

  if (limits.maxAccounts === -1) return { allowed: true, reason: null }

  const { count } = await supabase
    .from("accounts")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)

  const current = count ?? 0
  if (current >= limits.maxAccounts) {
    return {
      allowed: false,
      reason: `Limite de ${limits.maxAccounts} clientes atingido no plano ${sub.plan === "free" ? "Grátis" : sub.plan}. Faça upgrade para continuar.`,
      currentCount: current,
      limit: limits.maxAccounts,
    }
  }

  return { allowed: true, reason: null, currentCount: current, limit: limits.maxAccounts }
}

// Check if creating a campaign is within limits
export async function checkCampaignLimit(tenantId: string): Promise<CheckResult> {
  const supabase = await createClient()
  const sub = await getTenantSubscription(tenantId)
  const limits = getEffectiveLimits(sub.plan, sub.status)

  if (!limits.hasCampaigns) {
    return {
      allowed: false,
      reason: "Campanhas não estão disponíveis no plano Grátis. Faça upgrade para o plano Pro.",
    }
  }

  if (limits.maxCampaigns === -1) return { allowed: true, reason: null }

  // Count campaigns created this calendar month
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { count } = await supabase
    .from("campaigns")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .gte("created_at", startOfMonth.toISOString())

  const current = count ?? 0
  if (current >= limits.maxCampaigns) {
    return {
      allowed: false,
      reason: `Limite de ${limits.maxCampaigns} campanhas/mês atingido. Faça upgrade para criar mais.`,
      currentCount: current,
      limit: limits.maxCampaigns,
    }
  }

  return { allowed: true, reason: null, currentCount: current, limit: limits.maxCampaigns }
}
