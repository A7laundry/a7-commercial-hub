export type PlanId = "free" | "pro" | "scale"

export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | "paused"

export type PlanLimits = {
  maxAccounts: number       // -1 = unlimited
  maxCampaigns: number      // per month, -1 = unlimited
  maxMessages: number       // per month, -1 = unlimited
  maxUsers: number          // -1 = unlimited
  hasCampaigns: boolean
  hasAiInsights: boolean
  hasAdvancedReports: boolean
  hasApiAccess: boolean
}

export type Plan = {
  id: PlanId
  name: string
  description: string
  price: number             // BRL cents (0 for free)
  priceLabel: string        // display string
  limits: PlanLimits
  stripePriceId: string | null  // null for free plan
  highlighted: boolean      // show as "popular"
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Grátis",
    description: "Para começar e testar o sistema",
    price: 0,
    priceLabel: "R$0/mês",
    highlighted: false,
    stripePriceId: null,
    limits: {
      maxAccounts: 50,
      maxCampaigns: 0,
      maxMessages: 100,
      maxUsers: 1,
      hasCampaigns: false,
      hasAiInsights: false,
      hasAdvancedReports: false,
      hasApiAccess: false,
    },
  },
  pro: {
    id: "pro",
    name: "Pro",
    description: "Para lavanderias em crescimento",
    price: 29700,
    priceLabel: "R$297/mês",
    highlighted: true,
    stripePriceId: process.env.STRIPE_PRICE_PRO_MONTHLY ?? null,
    limits: {
      maxAccounts: 500,
      maxCampaigns: 20,
      maxMessages: -1,
      maxUsers: 3,
      hasCampaigns: true,
      hasAiInsights: true,
      hasAdvancedReports: true,
      hasApiAccess: false,
    },
  },
  scale: {
    id: "scale",
    name: "Scale",
    description: "Para redes e múltiplas unidades",
    price: 69700,
    priceLabel: "R$697/mês",
    highlighted: false,
    stripePriceId: process.env.STRIPE_PRICE_SCALE_MONTHLY ?? null,
    limits: {
      maxAccounts: -1,
      maxCampaigns: -1,
      maxMessages: -1,
      maxUsers: 10,
      hasCampaigns: true,
      hasAiInsights: true,
      hasAdvancedReports: true,
      hasApiAccess: true,
    },
  },
}

export const TRIAL_DAYS = 7

// Get effective plan limits (trialing gets pro limits)
export function getEffectiveLimits(plan: PlanId, status: SubscriptionStatus): PlanLimits {
  if (status === "trialing") return PLANS.pro.limits
  if (status === "canceled" || status === "past_due") return PLANS.free.limits
  return PLANS[plan]?.limits ?? PLANS.free.limits
}

// Check if subscription is considered "active" (can use features)
export function isSubscriptionActive(status: SubscriptionStatus): boolean {
  return status === "active" || status === "trialing"
}
