import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getStripe } from "@/lib/stripe"
import { PLANS, type PlanId } from "@/lib/plans"
import { logger } from "@/lib/logger"

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Auth
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    logger.warn({ event: "stripe.checkout.unauthorized", status: "error" })
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Tenant
  const { data: tu } = await supabase
    .from("tenant_users")
    .select("tenant_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle()

  if (!tu?.tenant_id) {
    logger.warn({ event: "stripe.checkout.tenant_not_found", status: "error", metadata: { user_id: user.id } })
    return NextResponse.json({ error: "Tenant not found" }, { status: 403 })
  }

  // Body: plan
  let planId: PlanId
  try {
    const body = await request.json()
    planId = body.plan as PlanId
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const plan = PLANS[planId]
  if (!plan || !plan.stripePriceId) {
    logger.warn({
      event: "stripe.checkout.invalid_plan",
      status: "error",
      tenant_id: tu.tenant_id,
      metadata: { plan: planId },
    })
    return NextResponse.json({ error: "Invalid plan or plan has no price" }, { status: 422 })
  }

  try {
    // Get or create Stripe customer
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("tenant_id", tu.tenant_id)
      .maybeSingle()

    let customerId = sub?.stripe_customer_id

    if (!customerId) {
      // Get tenant name for customer
      const { data: tenant } = await supabase
        .from("tenants")
        .select("name")
        .eq("id", tu.tenant_id)
        .single()

      const customer = await getStripe().customers.create({
        email: user.email,
        name: tenant?.name ?? undefined,
        metadata: { tenant_id: tu.tenant_id },
      })
      customerId = customer.id

      logger.info({
        event: "stripe.checkout.customer_created",
        status: "ok",
        tenant_id: tu.tenant_id,
        metadata: { stripe_customer_id: customerId },
      })

      // Save customer_id immediately
      await supabase
        .from("subscriptions")
        .upsert({ tenant_id: tu.tenant_id, stripe_customer_id: customerId }, { onConflict: "tenant_id" })
    }

    const origin = request.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      success_url: `${origin}/settings/billing?success=1`,
      cancel_url:  `${origin}/settings/billing?canceled=1`,
      metadata: { tenant_id: tu.tenant_id, plan: planId },
      subscription_data: {
        metadata: { tenant_id: tu.tenant_id, plan: planId },
        trial_period_days: undefined, // trial handled by existing subscription row
      },
      allow_promotion_codes: true,
      billing_address_collection: "auto",
    })

    logger.info({
      event: "stripe.checkout.session_created",
      status: "ok",
      tenant_id: tu.tenant_id,
      metadata: { plan: planId, session_id: session.id },
    })

    return NextResponse.json({ url: session.url }, { status: 200 })
  } catch (err) {
    logger.error({
      event: "stripe.checkout.error",
      status: "error",
      tenant_id: tu.tenant_id,
      error: err instanceof Error ? err.message : "Unknown",
      metadata: { plan: planId },
    })
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 })
  }
}
