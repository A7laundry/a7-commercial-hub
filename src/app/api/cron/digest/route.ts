import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"
import { sendToMeta } from "@/lib/whatsapp"
import { isWhatsAppConfigured } from "@/lib/env"

/**
 * GET /api/cron/digest
 *
 * Daily operational digest — runs at 08:05 (after generate-alerts at 08:00).
 * For each tenant:
 *   1. Skip if digest already sent today (anti-spam via user_notifications).
 *   2. Compute summary counts: at-risk accounts, silent clients, stalled deals,
 *      expiring contracts, open critical alerts.
 *   3. If counts > 0: build WhatsApp message + send to DIGEST_PHONE env var.
 *   4. Log to user_notifications for audit + anti-spam tracking.
 *
 * Anti-spam: max 1 daily_digest per tenant per calendar day.
 * Configure DIGEST_PHONE=+55119... on Vercel to enable WhatsApp delivery.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createServiceClient()
  const now = new Date()

  // Dates for queries
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)

  const fortyFiveDaysAgo = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString()
  const fourteenDaysAgo  = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString()
  const sevenDaysOut     = new Date(now.getTime() +  7 * 24 * 60 * 60 * 1000).toISOString()

  // Fetch all tenants
  const { data: tenants, error: tenantsError } = await supabase.from("tenants").select("id, name")
  if (tenantsError) {
    return NextResponse.json({ error: tenantsError.message }, { status: 500 })
  }

  const results: { tenantId: string; skipped?: boolean; sent?: boolean; error?: string }[] = []

  for (const tenant of tenants ?? []) {
    const tenantId = tenant.id as string

    // ── Anti-spam: skip if digest already sent today ────────────────────────
    const { data: existing } = await supabase
      .from("user_notifications")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("type", "daily_digest")
      .gte("sent_at", todayStart.toISOString())
      .maybeSingle()

    if (existing) {
      results.push({ tenantId, skipped: true })
      continue
    }

    // ── Compute summary counts (all in parallel) ────────────────────────────
    const [
      atRiskRes,
      silentRes,
      stalledDealsRes,
      expiringContractsRes,
      criticalAlertsRes,
    ] = await Promise.all([
      supabase
        .from("accounts")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("commercial_status", "at_risk")
        .in("status", ["active", "prospect"]),

      supabase
        .from("accounts")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("status", "active")
        .or(`last_contact_at.is.null,last_contact_at.lt.${fortyFiveDaysAgo}`),

      supabase
        .from("deals")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .in("stage", ["negotiation", "proposal"])
        .lt("updated_at", fourteenDaysAgo),

      supabase
        .from("contracts")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .neq("status", "cancelled")
        .gte("ends_at", now.toISOString())
        .lte("ends_at", sevenDaysOut),

      supabase
        .from("alerts")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("status", "open")
        .eq("severity", "critical"),
    ])

    const atRisk           = atRiskRes.count           ?? 0
    const silent           = silentRes.count           ?? 0
    const stalledDeals     = stalledDealsRes.count     ?? 0
    const expiringContracts = expiringContractsRes.count ?? 0
    const criticalAlerts   = criticalAlertsRes.count   ?? 0

    const total = atRisk + silent + stalledDeals + expiringContracts + criticalAlerts

    const payload = {
      atRisk,
      silent,
      stalledDeals,
      expiringContracts,
      criticalAlerts,
      total,
      date: now.toISOString(),
    }

    // ── Log to user_notifications (anti-spam record + audit trail) ──────────
    await supabase.from("user_notifications").insert({
      tenant_id: tenantId,
      type: "daily_digest",
      payload,
      sent_at: now.toISOString(),
    })

    // ── Send WhatsApp digest if DIGEST_PHONE is configured ──────────────────
    const digestPhone = process.env.DIGEST_PHONE

    if (total === 0 || !digestPhone || !isWhatsAppConfigured()) {
      results.push({ tenantId, sent: false })
      continue
    }

    const lines: string[] = [
      `📊 *Resumo A7X — ${now.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })}*`,
      "",
    ]

    if (criticalAlerts > 0)
      lines.push(`🚨 ${criticalAlerts} alerta${criticalAlerts !== 1 ? "s" : ""} crítico${criticalAlerts !== 1 ? "s" : ""}`)
    if (atRisk > 0)
      lines.push(`⚠️ ${atRisk} conta${atRisk !== 1 ? "s" : ""} em risco`)
    if (expiringContracts > 0)
      lines.push(`📋 ${expiringContracts} contrato${expiringContracts !== 1 ? "s" : ""} vencendo em 7 dias`)
    if (stalledDeals > 0)
      lines.push(`🤝 ${stalledDeals} negociação${stalledDeals !== 1 ? "ões" : ""} parada${stalledDeals !== 1 ? "s" : ""} (14d+)`)
    if (silent > 0)
      lines.push(`🔇 ${silent} cliente${silent !== 1 ? "s" : ""} sem contato (45d+)`)

    lines.push("")
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.a7x.com.br"
    lines.push(`👉 ${appUrl}/execution`)

    const messageText = lines.join("\n")
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!
    const accessToken   = process.env.WHATSAPP_ACCESS_TOKEN!

    const { wa_message_id, error: sendError } = await sendToMeta(
      phoneNumberId,
      accessToken,
      digestPhone,
      messageText,
    )

    if (sendError) {
      results.push({ tenantId, sent: false, error: sendError })
    } else {
      // Update notification with wa_message_id for traceability
      await supabase
        .from("user_notifications")
        .update({ payload: { ...payload, wa_message_id } })
        .eq("tenant_id", tenantId)
        .eq("type", "daily_digest")
        .gte("sent_at", todayStart.toISOString())

      results.push({ tenantId, sent: true })
    }
  }

  return NextResponse.json({
    ok: true,
    tenantsProcessed: (tenants ?? []).length,
    results,
    timestamp: now.toISOString(),
  })
}
