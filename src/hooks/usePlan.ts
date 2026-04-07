import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { PLANS, getEffectiveLimits, isSubscriptionActive, type PlanId, type SubscriptionStatus, type PlanLimits } from "@/lib/plans"

export type PlanState = {
  plan: PlanId
  status: SubscriptionStatus
  trialEnd: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  limits: PlanLimits
  isActive: boolean           // active or trialing
  isTrial: boolean
  daysLeftInTrial: number | null
  canUpgrade: boolean         // plan is not scale
  planName: string
  isLoading: boolean
}

export function usePlan(tenantId: string): PlanState {
  const supabase = createClient()

  const { data, isPending } = useQuery({
    queryKey: ["subscription", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("plan, status, trial_end, current_period_end, cancel_at_period_end")
        .eq("tenant_id", tenantId)
        .maybeSingle()
      return data
    },
    staleTime: 60_000,
  })

  const plan = (data?.plan ?? "free") as PlanId
  const status = (data?.status ?? "trialing") as SubscriptionStatus
  const trialEnd = data?.trial_end ?? null
  const currentPeriodEnd = data?.current_period_end ?? null
  const cancelAtPeriodEnd = data?.cancel_at_period_end ?? false

  const limits = getEffectiveLimits(plan, status)
  const isActive = isSubscriptionActive(status)
  const isTrial = status === "trialing"

  // daysLeftInTrial must not be computed during SSR/hydration — Date.now() on
  // the server differs from the client's first render and causes React #418.
  // We initialise to null and compute after mount only.
  const [daysLeftInTrial, setDaysLeftInTrial] = useState<number | null>(null)
  useEffect(() => {
    if (isTrial && trialEnd) {
      const ms = new Date(trialEnd).getTime() - Date.now()
      setDaysLeftInTrial(Math.max(0, Math.ceil(ms / 86400000)))
    } else {
      setDaysLeftInTrial(null)
    }
  }, [isTrial, trialEnd])

  return {
    plan,
    status,
    trialEnd,
    currentPeriodEnd,
    cancelAtPeriodEnd,
    limits,
    isActive,
    isTrial,
    daysLeftInTrial,
    canUpgrade: plan !== "scale",
    planName: PLANS[plan]?.name ?? plan,
    isLoading: isPending,
  }
}
