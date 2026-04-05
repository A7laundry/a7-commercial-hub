import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { sendToMeta } from "@/lib/whatsapp"
import { logger } from "@/lib/logger"

type TestBody = {
  phone: string
  message: string
}

// POST /api/whatsapp/test
// Sends a single test message using credentials stored in whatsapp_integrations.
// Does NOT create a CRM record or update account state — test-only.
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: tu } = await supabase
    .from("tenant_users")
    .select("tenant_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle()

  if (!tu?.tenant_id) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 403 })
  }

  let body: TestBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { phone, message } = body
  if (!phone?.trim() || !message?.trim()) {
    return NextResponse.json(
      { error: "phone and message are required" },
      { status: 422 }
    )
  }

  const { data: integration } = await supabase
    .from("whatsapp_integrations")
    .select("api_key, instance_id, status")
    .eq("tenant_id", tu.tenant_id)
    .maybeSingle()

  if (!integration || integration.status !== "connected") {
    return NextResponse.json({ error: "WhatsApp não está conectado" }, { status: 409 })
  }

  if (!integration.api_key || !integration.instance_id) {
    return NextResponse.json({ error: "Credenciais incompletas" }, { status: 409 })
  }

  // Single attempt — test sends do not retry
  const result = await sendToMeta(
    integration.instance_id,
    integration.api_key,
    phone,
    message,
    1
  )

  if (!result.wa_message_id) {
    logger.error({
      event: "whatsapp.test.failed",
      status: "error",
      tenant_id: tu.tenant_id,
      error: result.error ?? "Unknown Meta API error",
      metadata: { phone },
    })
    return NextResponse.json(
      { error: result.error ?? "Falha ao enviar mensagem de teste" },
      { status: 502 }
    )
  }

  logger.info({
    event: "whatsapp.test.success",
    status: "ok",
    tenant_id: tu.tenant_id,
    metadata: { wa_message_id: result.wa_message_id },
  })

  return NextResponse.json({ ok: true, wa_message_id: result.wa_message_id })
}
