import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import Stripe from "stripe"
import { getStripe } from "@/lib/stripe"
import { logger } from "@/lib/logger"
import type { PlanId, SubscriptionStatus } from "@/lib/plans"

// Stripe sends raw body — must NOT parse as JSON before signature verification
export const runtime = "nodejs"

// Service-role client — webhook is not authenticated by Supabase JWT
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Map Stripe subscription status to our status
function mapStatus(stripeStatus: string): SubscriptionStatus {
  switch (stripeStatus) {
    case "active":             return "active"
    case "trialing":           return "trialing"
    case "past_due":           return "past_due"
    case "canceled":           return "canceled"
    case "paused":             return "paused"
    case "unpaid":             return "past_due"
    case "incomplete":         return "past_due"
    case "incomplete_expired": return "canceled"
    default:                   return "past_due"
  }
}

// Extract plan from subscription metadata
function extractPlan(metadata: Stripe.Metadata): PlanId {
  const plan = metadata.plan as PlanId | undefined
  if (plan === "pro" || plan === "scale") return plan
  return "free"
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get("stripe-signature")

  if (!sig) {
    return NextResponse.json({ error: "No signature" }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    logger.error({
      event: "stripe.webhook.signature_failed",
      status: "error",
      error: err instanceof Error ? err.message : "Unknown",
    })
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  logger.info({
    event: "stripe.webhook.received",
    status: "ok",
    metadata: { type: event.type as string, id: event.id },
  })

  try {
    switch (event.type) {
      // ── Checkout completed — customer just subscribed ────────────────────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const tenantId = session.metadata?.tenant_id
        const plan = extractPlan(session.metadata ?? {})

        if (!tenantId) {
          logger.warn({
            event: "stripe.webhook.no_tenant_id",
            status: "skipped",
            metadata: { session_id: session.id },
          })
          break
        }

        await admin
          .from("subscriptions")
          .upsert(
            {
              tenant_id: tenantId,
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: session.subscription as string,
              status: "active",
              plan,
              cancel_at_period_end: false,
            },
            { onConflict: "tenant_id" }
          )

        logger.info({
          event: "stripe.billing.checkout_completed",
          status: "ok",
          tenant_id: tenantId,
          metadata: { plan },
        })
        break
      }

      // ── Subscription updated (plan change, renewal, trial end) ────────────────
      // NOTE: Stripe v22 (dahlia) removed current_period_end from the Subscription
      // object. Period end is tracked via invoice.paid instead.
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        const tenantId = subscription.metadata?.tenant_id
        if (!tenantId) break

        const status = mapStatus(subscription.status)
        const plan = extractPlan(subscription.metadata ?? {})

        await admin
          .from("subscriptions")
          .upsert(
            {
              tenant_id: tenantId,
              stripe_subscription_id: subscription.id,
              stripe_customer_id: subscription.customer as string,
              status,
              plan,
              cancel_at_period_end: subscription.cancel_at_period_end,
            },
            { onConflict: "tenant_id" }
          )

        logger.info({
          event: "stripe.billing.subscription_updated",
          status: "ok",
          tenant_id: tenantId,
          metadata: { status, plan },
        })
        break
      }

      // ── Subscription canceled ─────────────────────────────────────────────────
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        const tenantId = subscription.metadata?.tenant_id
        if (!tenantId) break

        await admin
          .from("subscriptions")
          .update({ status: "canceled", plan: "free", cancel_at_period_end: false })
          .eq("tenant_id", tenantId)

        logger.info({
          event: "stripe.billing.subscription_canceled",
          status: "ok",
          tenant_id: tenantId,
        })
        break
      }

      // ── Invoice paid — update period end ──────────────────────────────────────
      // In Stripe v22 (dahlia), current_period_end was removed from the Subscription
      // object. The authoritative period end is invoice.period_end, available directly
      // on the Invoice object without any additional API call.
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice

        // Resolve tenant_id from invoice.parent.subscription_details.metadata
        // (set on the subscription at creation time)
        const subDetails = invoice.parent?.subscription_details
        const metadata = subDetails?.metadata ?? {}
        const tenantId = (metadata as Record<string, string>).tenant_id

        if (!tenantId) {
          logger.warn({
            event: "stripe.webhook.invoice_paid_no_tenant",
            status: "skipped",
            metadata: { invoice_id: invoice.id },
          })
          break
        }

        // invoice.period_end is the end of the usage period covered by this invoice —
        // this is the correct replacement for subscription.current_period_end in v22.
        const periodEnd = new Date(invoice.period_end * 1000).toISOString()

        await admin
          .from("subscriptions")
          .update({
            status: "active",
            current_period_end: periodEnd,
          })
          .eq("tenant_id", tenantId)

        logger.info({
          event: "stripe.billing.invoice_paid",
          status: "ok",
          tenant_id: tenantId,
          metadata: { period_end: periodEnd },
        })
        break
      }

      default:
        logger.info({
          event: "stripe.webhook.unhandled",
          status: "skipped",
          metadata: { type: event.type as string },
        })
    }
  } catch (err) {
    logger.error({
      event: "stripe.webhook.handler_error",
      status: "error",
      error: err instanceof Error ? err.message : "Unknown",
      metadata: { event_type: event.type as string },
    })
    // Return 200 to prevent Stripe retries for handler errors
    return NextResponse.json({ received: true, error: "Handler error" }, { status: 200 })
  }

  return NextResponse.json({ received: true }, { status: 200 })
}
