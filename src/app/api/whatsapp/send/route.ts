import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

type SendBody = {
  account_id: string
  phone: string
  message: string
  action_type?: "follow_up" | "upsell" | "reactivation" | "proposal" | "renewal"
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Auth via session
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Get tenant_id
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

  let body: SendBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { account_id, phone, message, action_type } = body

  if (!account_id || !phone || !message) {
    return NextResponse.json({ error: "Missing required fields: account_id, phone, message" }, { status: 422 })
  }

  // Try Meta Cloud API send
  let wa_message_id: string | null = null
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN

  if (phoneNumberId && accessToken) {
    try {
      const metaRes = await fetch(
        `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: phone.replace(/\D/g, ""),
            type: "text",
            text: { body: message },
          }),
        }
      )
      if (metaRes.ok) {
        const metaData = await metaRes.json()
        wa_message_id = metaData?.messages?.[0]?.id ?? null
      }
    } catch {
      // Silent fail — store message regardless
    }
  }

  // Store outbound message
  const { data: stored, error: insertError } = await supabase
    .from("whatsapp_messages")
    .insert({
      tenant_id,
      account_id,
      phone,
      message_text: message,
      direction: "outbound",
      wa_message_id,
      received_at: new Date().toISOString(),
      processed: true,
    })
    .select("id")
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Update last_contact_at
  const accountUpdate: Record<string, unknown> = {
    last_contact_at: new Date().toISOString(),
  }

  // E5: pipeline stage update based on action_type
  if (action_type === "proposal") {
    accountUpdate.pipeline_stage = "negotiating"
  } else if (action_type === "reactivation") {
    // Only reset to lead if currently inactive
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

  return NextResponse.json({ id: stored.id, wa_message_id }, { status: 201 })
}
