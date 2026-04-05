import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"

/**
 * GET /api/cron/generate-alerts
 *
 * Called daily at 08:00 by Vercel Cron (vercel.json).
 * Uses service role key — no user session required.
 * Iterates all tenants and generates alerts for expiring/expired contracts.
 *
 * Authorization: Vercel sets Authorization: Bearer $CRON_SECRET automatically.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  // Verify the cron secret when set (skip in development)
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createServiceClient()
  const now = new Date()
  const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const nowIso = now.toISOString()
  const thirtyIso = thirtyDaysOut.toISOString()

  // Fetch all tenant IDs
  const { data: tenants, error: tenantsError } = await supabase
    .from("tenants")
    .select("id")

  if (tenantsError) {
    return NextResponse.json({ error: tenantsError.message }, { status: 500 })
  }

  let totalUpserted = 0
  const errors: string[] = []

  for (const tenant of tenants ?? []) {
    const tenantId = tenant.id

    const [expiringSoon, alreadyExpired] = await Promise.all([
      supabase
        .from("contracts")
        .select("id, title, account_id")
        .eq("tenant_id", tenantId)
        .gt("ends_at", nowIso)
        .lte("ends_at", thirtyIso),
      supabase
        .from("contracts")
        .select("id, title, account_id")
        .eq("tenant_id", tenantId)
        .lt("ends_at", nowIso),
    ])

    const upserts = [
      ...(expiringSoon.data ?? []).map((c) => ({
        tenant_id: tenantId,
        account_id: c.account_id,
        contract_id: c.id,
        type: "contract_expiring_soon" as const,
        severity: "warning" as const,
        title: `Contrato "${c.title}" vence em breve`,
        status: "open" as const,
      })),
      ...(alreadyExpired.data ?? []).map((c) => ({
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
      const { error } = await supabase
        .from("alerts")
        .upsert(upserts, {
          onConflict: "tenant_id,contract_id,type",
          ignoreDuplicates: true,
        })

      if (error) {
        errors.push(`tenant ${tenantId}: ${error.message}`)
      } else {
        totalUpserted += upserts.length
      }
    }
  }

  return NextResponse.json({
    ok: true,
    tenantsProcessed: (tenants ?? []).length,
    alertsUpserted: totalUpserted,
    errors: errors.length > 0 ? errors : undefined,
    timestamp: nowIso,
  })
}
