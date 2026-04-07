import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createHmac, timingSafeEqual } from "crypto"
import { logger } from "@/lib/logger"

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// ---------------------------------------------------------------------------
// GET — Meta webhook verification challenge
//
// Multi-tenant: validates hub.verify_token against the per-tenant token stored
// in whatsapp_integrations.verify_token (set when operator configures the
// integration). This replaces the single global WHATSAPP_VERIFY_TOKEN env var.
//
// Legacy fallback: if no tenant row is found, falls back to the env var so
// existing single-tenant deployments keep working until they reconfigure.
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get("hub.mode")
  const token = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")

  if (mode !== "subscribe" || !token || !challenge) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // 1. Per-tenant lookup (preferred path)
  const { data: integration } = await admin
    .from("whatsapp_integrations")
    .select("tenant_id")
    .eq("verify_token", token)
    .maybeSingle()

  if (integration?.tenant_id) {
    logger.info({
      event: "whatsapp.webhook.verified",
      status: "ok",
      metadata: { mode, tenant_id: integration.tenant_id },
    })
    return new NextResponse(challenge, { status: 200 })
  }

  // 2. Legacy fallback: global env var (single-tenant / unconfigured tenants)
  //    Will be removed once all tenants have reconfigured via the new UI.
  if (process.env.WHATSAPP_VERIFY_TOKEN && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    logger.info({
      event: "whatsapp.webhook.verified_legacy",
      status: "ok",
      metadata: { mode, path: "env_var_fallback" },
    })
    return new NextResponse(challenge, { status: 200 })
  }

  logger.warn({
    event: "whatsapp.webhook.verify_failed",
    status: "error",
    metadata: { mode },
  })
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

// ---------------------------------------------------------------------------
// Verify Meta HMAC-SHA256 signature
// Uses timing-safe comparison to prevent timing attacks
// ---------------------------------------------------------------------------
async function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null
): Promise<boolean> {
  const secret = process.env.WHATSAPP_APP_SECRET
  if (!secret) return false
  if (!signatureHeader) return false

  const expected = "sha256=" + createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex")

  try {
    return timingSafeEqual(
      Buffer.from(signatureHeader, "utf8"),
      Buffer.from(expected, "utf8")
    )
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// POST — ingest incoming Meta webhook or internal message
//
// Supports two auth modes:
//  a) Meta webhook: X-Hub-Signature-256 HMAC verification
//  b) Internal API: x-api-key header (legacy, kept for compatibility)
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  // Read raw body ONCE — needed for HMAC verification
  const rawBody = await request.text()

  // --- Auth mode A: Meta HMAC ---
  const metaSignature = request.headers.get("x-hub-signature-256")
  const isMetaWebhook = Boolean(metaSignature)

  if (isMetaWebhook) {
    const valid = await verifyMetaSignature(rawBody, metaSignature)
    if (!valid) {
      logger.error({
        event: "whatsapp.ingest.hmac_invalid",
        status: "error",
        error: "X-Hub-Signature-256 verification failed",
        metadata: { source: "meta" },
      })
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  } else {
    // --- Auth mode B: internal API key ---
    const apiKey = request.headers.get("x-api-key")
    if (!apiKey || apiKey !== process.env.WHATSAPP_API_KEY) {
      logger.error({
        event: "whatsapp.ingest.auth_failed",
        status: "error",
        error: "Invalid or missing x-api-key",
        metadata: { source: "internal" },
      })
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  // Parse body
  let body: Record<string, unknown>
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  // ---------------------------------------------------------------------------
  // Meta webhook format vs internal format
  // Meta sends: { object: "whatsapp_business_account", entry: [...] }
  // Internal:   { tenant_id, phone, message_text, wa_message_id, ... }
  // ---------------------------------------------------------------------------
  if (body.object === "whatsapp_business_account") {
    return handleMetaWebhook(body)
  }

  return handleInternalMessage(body)
}

// ---------------------------------------------------------------------------
// Handle Meta Cloud API webhook format
// ---------------------------------------------------------------------------
async function handleMetaWebhook(
  body: Record<string, unknown>
): Promise<NextResponse> {
  try {
    const entries = (body.entry as unknown[]) ?? []
    const processed: string[] = []
    const processedTenants = new Set<string>()

    let statusesUpdated = 0

    for (const entry of entries) {
      const e = entry as Record<string, unknown>
      const changes = (e.changes as unknown[]) ?? []

      for (const change of changes) {
        const c = change as Record<string, unknown>
        const value = c.value as Record<string, unknown>
        if (!value) continue

        const messages = (value.messages as unknown[]) ?? []
        const metadata = value.metadata as Record<string, unknown>

        for (const msg of messages) {
          const m = msg as Record<string, unknown>
          const wa_message_id = m.id as string
          const from = m.from as string
          const text = (m.text as Record<string, unknown>)?.body as string
          const timestamp = m.timestamp
            ? new Date(Number(m.timestamp) * 1000).toISOString()
            : new Date().toISOString()

          if (!from || !text) continue

          // Idempotency: skip if already processed
          const { data: existing } = await admin
            .from("whatsapp_messages")
            .select("id")
            .eq("wa_message_id", wa_message_id)
            .maybeSingle()

          if (existing) {
            logger.info({
              event: "whatsapp.ingest.duplicate_skipped",
              status: "skipped",
              entity_id: wa_message_id,
              metadata: { wa_message_id },
            })
            continue
          }

          // Resolve account by phone — check phone_mappings first
          const { data: mapping } = await admin
            .from("phone_mappings")
            .select("account_id, tenant_id")
            .eq("phone", from)
            .maybeSingle()

          let tenant_id = mapping?.tenant_id ?? null
          const account_id = mapping?.account_id ?? null

          // If no phone_mapping, identify tenant via whatsapp_tenant_config
          // (maps the business phoneNumberId → tenant_id)
          if (!tenant_id) {
            const phoneNumberId = metadata?.phone_number_id as string | undefined
            if (phoneNumberId) {
              const { data: tenantConfig } = await admin
                .from("whatsapp_tenant_config")
                .select("tenant_id")
                .eq("phone_number_id", phoneNumberId)
                .maybeSingle()
              tenant_id = tenantConfig?.tenant_id ?? null
            }
            // Last resort: single-tenant fallback via env var
            if (!tenant_id && process.env.WHATSAPP_TENANT_ID) {
              tenant_id = process.env.WHATSAPP_TENANT_ID
            }
          }

          if (!tenant_id) {
            logger.warn({
              event: "whatsapp.ingest.tenant_not_found",
              status: "error",
              metadata: { phone: from, wa_message_id },
            })
            continue
          }

          // Upsert conversation (atomic unread_count increment)
          const { data: convRow, error: convError } = await admin.rpc(
            "upsert_wa_conversation",
            {
              p_tenant_id:       tenant_id,
              p_phone:           from,
              p_account_id:      account_id ?? null,
              p_direction:       "inbound",
              p_message_preview: text,
              p_message_at:      timestamp,
            }
          )

          if (convError) {
            logger.error({
              event: "whatsapp.ingest.upsert_conversation_failed",
              status: "error",
              tenant_id,
              error: convError.message,
              metadata: { wa_message_id, phone: from },
            })
          }

          const conversation_id = convError ? null : (convRow as string)

          const { error } = await admin
            .from("whatsapp_messages")
            .insert({
              tenant_id,
              account_id,
              conversation_id,
              phone: from,
              message_text: text,
              direction: "inbound",
              wa_message_id,
              received_at: timestamp,
              processed: true,
              send_status: "delivered",
            })

          if (error) {
            logger.error({
              event: "whatsapp.ingest.insert_failed",
              status: "error",
              tenant_id,
              error: error.message,
              metadata: { wa_message_id, phone: from },
            })
            continue
          }

          if (account_id) {
            await admin
              .from("accounts")
              .update({ last_contact_at: new Date().toISOString() })
              .eq("id", account_id)
              .eq("tenant_id", tenant_id)

            // ── Operator command detection ────────────────────────────────────
            // Operator replies "feito", "ok", "pronto" etc. from their phone
            // → auto-log action_taken to account_timeline + update timeline
            const DONE_COMMANDS = new Set([
              "feito", "ok", "pronto", "concluído", "concluido", "done", "✓", "✔",
            ])
            if (DONE_COMMANDS.has(text.trim().toLowerCase())) {
              await admin.from("account_timeline").insert({
                tenant_id,
                account_id,
                event_type: "action_taken",
                summary: "Ação concluída via WhatsApp",
                metadata: { source: "whatsapp_reply", message: text, wa_message_id },
              })
              logger.info({
                event: "whatsapp.ingest.command_done",
                status: "ok",
                tenant_id,
                entity_id: account_id,
                metadata: { wa_message_id },
              })
            }
          }

          processed.push(wa_message_id)
          processedTenants.add(tenant_id)

          logger.info({
            event: "whatsapp.ingest.message_stored",
            status: "ok",
            tenant_id,
            entity_id: account_id,
            metadata: { wa_message_id, phone: from },
          })
        }

        // -----------------------------------------------------------------------
        // Process delivery status updates (delivered, read)
        // -----------------------------------------------------------------------
        const statuses = (value.statuses as unknown[]) ?? []

        for (const statusEntry of statuses) {
          const s = statusEntry as Record<string, unknown>
          const wa_message_id = s.id as string
          const statusStr = s.status as string
          const timestamp = s.timestamp as string

          // Only process "delivered" and "read" — skip "sent" (already set at
          // send time) and "failed" (handled at send time)
          if (statusStr !== "delivered" && statusStr !== "read") continue
          if (!wa_message_id) continue

          // Look up the existing message to get its tenant_id (used for security
          // scoping on the subsequent update)
          const { data: existingMsg } = await admin
            .from("whatsapp_messages")
            .select("tenant_id")
            .eq("wa_message_id", wa_message_id)
            .maybeSingle()

          if (!existingMsg?.tenant_id) {
            logger.warn({
              event: "whatsapp.status.message_not_found",
              status: "skipped",
              metadata: { wa_message_id, statusStr },
            })
            continue
          }

          const tenant_id = existingMsg.tenant_id as string

          let updatePayload: Record<string, unknown>
          if (statusStr === "delivered") {
            updatePayload = {
              send_status: "delivered",
              delivered_at: new Date(Number(timestamp) * 1000).toISOString(),
            }
          } else {
            // "read"
            updatePayload = { send_status: "read" }
          }

          const { error: updateError } = await admin
            .from("whatsapp_messages")
            .update(updatePayload)
            .eq("wa_message_id", wa_message_id)
            .eq("tenant_id", tenant_id)

          if (updateError) {
            logger.error({
              event: "whatsapp.status.update_failed",
              status: "error",
              tenant_id,
              error: updateError.message,
              metadata: { wa_message_id, statusStr },
            })
            continue
          }

          statusesUpdated++

          logger.info({
            event: "whatsapp.status.updated",
            status: "ok",
            tenant_id,
            metadata: { wa_message_id, statusStr },
          })
        }
      }
    }

    // P2 fix: update webhook observability fields for each tenant that had
    // at least one message successfully processed this batch.
    if (processedTenants.size > 0) {
      const updateNow = new Date().toISOString()
      await Promise.all(
        Array.from(processedTenants).map((tid) =>
          admin
            .from("whatsapp_integrations")
            .update({
              webhook_last_event_at: updateNow,
              webhook_status: "active",
              updated_at: updateNow,
            })
            .eq("tenant_id", tid)
            .eq("status", "connected")
        )
      )
    }

    return NextResponse.json(
      { processed: processed.length, statuses_updated: statusesUpdated },
      { status: 200 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error({
      event: "whatsapp.ingest.meta_webhook_error",
      status: "error",
      error: message,
    })
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// Handle internal message format (legacy/internal senders)
// ---------------------------------------------------------------------------
async function handleInternalMessage(
  body: Record<string, unknown>
): Promise<NextResponse> {
  const tenant_id = body.tenant_id as string | undefined
  const phone = body.phone as string | undefined
  const message_text = body.message_text as string | undefined
  const direction = (body.direction as string) ?? "inbound"
  const wa_message_id = body.wa_message_id as string | undefined
  const received_at = body.received_at as string | undefined

  if (!tenant_id || !phone || !message_text) {
    return NextResponse.json(
      { error: "Missing required fields: tenant_id, phone, message_text" },
      { status: 422 }
    )
  }

  // Idempotency check
  if (wa_message_id) {
    const { data: existing } = await admin
      .from("whatsapp_messages")
      .select("id")
      .eq("wa_message_id", wa_message_id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ id: existing.id, duplicate: true }, { status: 200 })
    }
  }

  const { data: mapping } = await admin
    .from("phone_mappings")
    .select("account_id")
    .eq("tenant_id", tenant_id)
    .eq("phone", phone)
    .maybeSingle()

  const { data: message, error } = await admin
    .from("whatsapp_messages")
    .insert({
      tenant_id,
      account_id: mapping?.account_id ?? null,
      phone,
      message_text,
      direction,
      wa_message_id: wa_message_id ?? null,
      received_at: received_at ?? new Date().toISOString(),
      processed: true,
      send_status: direction === "inbound" ? "delivered" : "sent",
    })
    .select("id")
    .single()

  if (error) {
    logger.error({
      event: "whatsapp.ingest.internal_insert_failed",
      status: "error",
      tenant_id,
      error: error.message,
      metadata: { phone, direction },
    })
    return NextResponse.json({ error: "Database error" }, { status: 500 })
  }

  if (mapping?.account_id) {
    await admin
      .from("accounts")
      .update({ last_contact_at: new Date().toISOString() })
      .eq("id", mapping.account_id)
      .eq("tenant_id", tenant_id)
  }

  logger.info({
    event: "whatsapp.ingest.internal_stored",
    status: "ok",
    tenant_id,
    entity_id: message.id,
    metadata: { phone, direction },
  })

  return NextResponse.json({ id: message.id }, { status: 201 })
}
