/**
 * POST /api/ai-copilot/draft
 *
 * Endpoint server-side que gera draft de resposta WhatsApp.
 * NÃO envia mensagem — apenas devolve o draft pro operador clicar "Usar".
 *
 * Feature flag: AI_COPILOT_ENABLED=true (default off)
 * Requer: ANTHROPIC_API_KEY no ambiente
 *
 * Auth: Supabase session via createClient (server-side).
 * Tenant isolation: account_id deve pertencer ao tenant do user.
 *
 * Body: { account_id: string, operator_hint?: string }
 * Response: CopilotResult (ou { error } com status apropriado)
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { generateReplyDraft, type CopilotInput, type ConversationMessage } from "@/lib/ai-copilot"
import { logger } from "@/lib/logger"

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: NextRequest) {
  // ── Feature flag ──────────────────────────────────────────────────────────
  if (process.env.AI_COPILOT_ENABLED !== "true") {
    return NextResponse.json(
      { error: "Feature disabled. Set AI_COPILOT_ENABLED=true to enable." },
      { status: 503 }
    )
  }

  // ── Auth via Supabase session ─────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: { account_id?: string; operator_hint?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const account_id = body.account_id
  const operator_hint = body.operator_hint?.trim() || null

  if (!account_id) {
    return NextResponse.json({ error: "account_id required" }, { status: 422 })
  }

  // ── Load context: account + phone_mapping + timeline meta + recent msgs ──
  const { data: account, error: accErr } = await admin
    .from("accounts")
    .select("id, tenant_id, name, pipeline_stage, unit, tags, source, notes, phone_mappings(phone)")
    .eq("id", account_id)
    .single()

  if (accErr || !account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 })
  }

  // ── Tenant isolation check ────────────────────────────────────────────────
  const { data: tenantUser } = await admin
    .from("tenant_users")
    .select("tenant_id")
    .eq("user_id", user.id)
    .eq("tenant_id", account.tenant_id)
    .maybeSingle()

  if (!tenantUser) {
    return NextResponse.json({ error: "Forbidden — account not in your tenant" }, { status: 403 })
  }

  // ── Origem (timeline lead_created enriquece com lp/unit/etc) ──────────────
  const { data: timelineEvent } = await admin
    .from("account_timeline")
    .select("metadata")
    .eq("account_id", account_id)
    .eq("event_type", "lead_created")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const meta = (timelineEvent?.metadata as Record<string, unknown> | undefined) ?? {}

  // ── Últimas 10 mensagens whatsapp ─────────────────────────────────────────
  const { data: messages } = await admin
    .from("whatsapp_messages")
    .select("direction, message_text, received_at")
    .eq("account_id", account_id)
    .order("received_at", { ascending: false })
    .limit(10)

  const conversation: ConversationMessage[] = (messages ?? [])
    .reverse()
    .map((m) => ({
      direction: m.direction as "inbound" | "outbound",
      text: m.message_text,
      timestamp: m.received_at,
    }))

  // ── Monta input pro copiloto ──────────────────────────────────────────────
  const phone = (account.phone_mappings as { phone: string }[] | undefined)?.[0]?.phone ?? null

  const input: CopilotInput = {
    account_name: account.name,
    pipeline_stage: account.pipeline_stage,
    lead_phone: phone,
    origin_tag: (account.tags as string[] | null)?.[0] ?? null,
    origin_lp_label: (meta.lp_label as string | null) ?? null,
    unit_label: (meta.unit_label as string | null) ?? account.unit,
    city: (meta.city as string | null) ?? null,
    neighborhood: null,  // ainda não persistido — virá de qualificação manual
    service: null,
    volume_estimate: null,
    notes: account.notes,
    conversation,
    operator_hint,
  }

  // ── Chama Anthropic ───────────────────────────────────────────────────────
  try {
    const result = await generateReplyDraft(input)

    // Loga no timeline (visibilidade pro operador)
    await admin.from("account_timeline").insert({
      tenant_id: account.tenant_id,
      account_id,
      event_type: "ai_draft_generated",
      summary: result.escalate
        ? `IA recomendou escalar: ${result.escalate_reason}`
        : `Draft gerado (${result.reasoning})`,
      metadata: {
        model: result.model_used,
        tokens_input: result.tokens_input,
        tokens_output: result.tokens_output,
        cache_read_tokens: result.cache_read_tokens,
        escalate: result.escalate,
        operator_hint,
      },
    })

    return NextResponse.json(result, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error({
      event: "ai_copilot.draft.failed",
      status: "error",
      tenant_id: account.tenant_id,
      entity_id: account_id,
      error: message,
    })
    return NextResponse.json({ error: `Copilot error: ${message}` }, { status: 500 })
  }
}
