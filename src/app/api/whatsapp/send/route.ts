import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { logger } from "@/lib/logger"
import { sendToMeta } from "@/lib/whatsapp"

type SendBody = {
  account_id: string
  phone: string
  message: string
  action_type?: "follow_up" | "upsell" | "reactivation" | "proposal" | "renewal"
}

// ---------------------------------------------------------------------------
// POST /api/whatsapp/send
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Auth
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
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
    return NextResponse.json({ error: "Tenant not found" }, { status: 403 })
  }

  const tenant_id = tu.tenant_id

  // Body
  let body: SendBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { account_id, phone, message, action_type } = body

  if (!account_id || !phone || !message) {
    return NextResponse.json(
      { error: "Missing required fields: account_id, phone, message" },
      { status: 422 }
    )
  }

  // ---------------------------------------------------------------------------
  // 0. Verify account_id belongs to this tenant (cross-tenant write prevention)
  // ---------------------------------------------------------------------------
  const { data: acct } = await supabase
    .from("accounts")
    .select("id")
    .eq("id", account_id)
    .eq("tenant_id", tenant_id)
    .maybeSingle()

  if (!acct) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 })
  }

  // ---------------------------------------------------------------------------
  // 1. Insert message with send_status=pending BEFORE attempting send
  //    This ensures we always have a record, regardless of Meta API outcome.
  // ---------------------------------------------------------------------------
  const { data: stored, error: insertError } = await supabase
    .from("whatsapp_messages")
    .insert({
      tenant_id,
      account_id,
      phone,
      message_text: message,
      direction: "outbound",
      received_at: new Date().toISOString(),
      processed: false,
      send_status: "pending",
      send_attempts: 0,
    })
    .select("id")
    .single()

  if (insertError) {
    logger.error({
      event: "whatsapp.send.db_insert_failed",
      status: "error",
      tenant_id,
      entity_id: account_id,
      entity_type: "account",
      error: insertError.message,
    })
    return NextResponse.json({ error: "Database error" }, { status: 500 })
  }

  const messageId = stored.id

  // ---------------------------------------------------------------------------
  // 2. Attempt Meta API send (with retry)
  //    Credential priority: per-tenant DB config → env var fallback
  // ---------------------------------------------------------------------------
  let wa_message_id: string | null = null
  let finalStatus: "sent" | "failed" | "pending" = "failed"
  let sendError: string | null = null
  let attempts = 0

  // Resolve credentials: prefer per-tenant DB config
  const { data: waConfig } = await supabase
    .from("whatsapp_integrations")
    .select("instance_id, api_key, status")
    .eq("tenant_id", tenant_id)
    .maybeSingle()

  const phoneNumberId =
    (waConfig?.status === "connected" && waConfig.instance_id) ||
    process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken =
    (waConfig?.status === "connected" && waConfig.api_key) ||
    process.env.WHATSAPP_ACCESS_TOKEN

  if (phoneNumberId && accessToken) {

    const result = await sendToMeta(phoneNumberId, accessToken, phone, message)
    wa_message_id = result.wa_message_id
    attempts = result.attempts
    sendError = result.error

    if (wa_message_id) {
      finalStatus = "sent"
      logger.info({
        event: "whatsapp.send.success",
        status: "ok",
        tenant_id,
        entity_id: messageId,
        entity_type: "whatsapp_message",
        attempt: attempts,
        metadata: { wa_message_id, account_id },
      })
    } else {
      finalStatus = "failed"
      logger.error({
        event: "whatsapp.send.failed",
        status: "error",
        tenant_id,
        entity_id: messageId,
        entity_type: "whatsapp_message",
        attempt: attempts,
        error: sendError ?? "Unknown Meta API error",
        metadata: { account_id, phone },
      })
    }
  } else {
    // WhatsApp not configured — warn once, keep message as pending
    finalStatus = "pending"
    logger.warn({
      event: "whatsapp.send.not_configured",
      status: "skipped",
      tenant_id,
      entity_id: messageId,
      metadata: { reason: "WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN not set" },
    })
  }

  // ---------------------------------------------------------------------------
  // 3. Update message record with real send status
  // ---------------------------------------------------------------------------
  await supabase
    .from("whatsapp_messages")
    .update({
      send_status: finalStatus,
      send_attempts: attempts,
      wa_message_id,
      processed: finalStatus === "sent",
      last_error: sendError,
    })
    .eq("id", messageId)

  // ---------------------------------------------------------------------------
  // 4. Side effects — only execute if send succeeded OR WhatsApp not configured
  //    (graceful degradation: allow CRM updates even without WhatsApp creds)
  //    NEVER update pipeline_stage based on a failed send.
  // ---------------------------------------------------------------------------
  const sideEffectsAllowed = finalStatus === "sent" || finalStatus === "pending"

  if (sideEffectsAllowed) {
    const accountUpdate: Record<string, unknown> = {
      last_contact_at: new Date().toISOString(),
    }

    // Pipeline stage update ONLY on confirmed send
    if (action_type === "proposal" && finalStatus === "sent") {
      accountUpdate.pipeline_stage = "negotiating"
    } else if (
      action_type === "reactivation" &&
      finalStatus === "sent"
    ) {
      const { data: acc } = await supabase
        .from("accounts")
        .select("status, pipeline_stage")
        .eq("id", account_id)
        .eq("tenant_id", tenant_id)
        .maybeSingle()
      if (acc?.status === "inactive") {
        accountUpdate.pipeline_stage = "lead"
      }
    }

    await supabase
      .from("accounts")
      .update(accountUpdate)
      .eq("id", account_id)
      .eq("tenant_id", tenant_id)

    // Log to account timeline (fire-and-forget)
    const preview = message.length > 60 ? message.slice(0, 60) + "…" : message
    await supabase.from("account_timeline").insert({
      tenant_id: tenant_id,
      account_id,
      event_type: "message_sent",
      summary: `Mensagem enviada: "${preview}"`,
      metadata: { action_type: action_type ?? "follow_up", phone },
    })
  }

  // ---------------------------------------------------------------------------
  // 5. Return real status to the client
  // ---------------------------------------------------------------------------
  if (finalStatus === "failed") {
    return NextResponse.json(
      {
        id: messageId,
        wa_message_id: null,
        send_status: "failed",
        error: "Falha na entrega da mensagem. Tente novamente.",
        attempts,
      },
      { status: 502 }
    )
  }

  return NextResponse.json(
    { id: messageId, wa_message_id, send_status: finalStatus },
    { status: 201 }
  )
}
