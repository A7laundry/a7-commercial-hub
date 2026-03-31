import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// WhatsApp webhook verification + message ingestion
// Structure only — actual provider integration (360dialog / Twilio) goes here

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// GET — webhook verification (Meta / 360dialog challenge)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get("hub.mode")
  const token = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

type WhatsAppPayload = {
  tenant_id: string
  phone: string
  message_text: string
  direction?: "inbound" | "outbound"
  wa_message_id?: string
  received_at?: string
}

// POST — ingest incoming message
export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key")
  if (!apiKey || apiKey !== process.env.WHATSAPP_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: WhatsAppPayload
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { tenant_id, phone, message_text, direction = "inbound", wa_message_id, received_at } = body

  if (!tenant_id || !phone || !message_text) {
    return NextResponse.json({ error: "Missing required fields: tenant_id, phone, message_text" }, { status: 422 })
  }

  // Resolve account_id from phone mapping
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
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Update last_contact_at on the linked account
  if (mapping?.account_id) {
    await admin
      .from("accounts")
      .update({ last_contact_at: new Date().toISOString() })
      .eq("id", mapping.account_id)
      .eq("tenant_id", tenant_id)
  }

  return NextResponse.json({ id: message.id }, { status: 201 })
}
