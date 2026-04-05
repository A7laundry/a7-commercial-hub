"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { logger } from "@/lib/logger"
import type { CampaignType } from "@/types"
import { checkCampaignLimit } from "@/lib/billing-guard"

async function getTenantId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")
  const { data } = await supabase.from("tenant_users").select("tenant_id").eq("user_id", user.id).single()
  if (!data) throw new Error("No tenant found")
  return data.tenant_id as string
}

export async function createCampaign(payload: {
  name: string
  type: CampaignType
  message_template: string
  account_ids: string[]
}) {
  const supabase = await createClient()
  const tenantId = await getTenantId(supabase)

  // Plan limit check
  const limitCheck = await checkCampaignLimit(tenantId)
  if (!limitCheck.allowed) {
    return { error: limitCheck.reason!, id: null }
  }

  const { data: campaign, error: campError } = await supabase
    .from("campaigns")
    .insert({
      tenant_id: tenantId,
      name: payload.name,
      type: payload.type,
      message_template: payload.message_template,
      recipient_count: payload.account_ids.length,
      status: "draft",
    })
    .select()
    .single()

  if (campError) return { error: campError.message, id: null }

  // Fetch phones from phone_mappings for each account
  const { data: phoneMappings } = await supabase
    .from("phone_mappings")
    .select("account_id, phone")
    .eq("tenant_id", tenantId)
    .in("account_id", payload.account_ids)

  const phoneByAccount = new Map((phoneMappings ?? []).map((p) => [p.account_id, p.phone]))

  const recipients = payload.account_ids.map((account_id) => {
    const phone = phoneByAccount.get(account_id) ?? null
    return {
      tenant_id: tenantId,
      campaign_id: campaign.id,
      account_id,
      phone,
      status: phone ? "pending" : "no_phone",
    }
  })

  await supabase.from("campaign_recipients").insert(recipients)

  revalidatePath("/campaigns")
  return { error: null, id: campaign.id }
}

export async function executeCampaign(campaignId: string) {
  const supabase = await createClient()
  const tenantId = await getTenantId(supabase)

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .eq("tenant_id", tenantId)
    .single()

  if (!campaign) return { error: "Campanha não encontrada." }

  const { data: recipients } = await supabase
    .from("campaign_recipients")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("status", "pending")

  const pendingWithPhone = (recipients ?? []).filter((r) => r.phone)

  if (pendingWithPhone.length === 0) {
    return { error: "Nenhum destinatário com telefone disponível." }
  }

  // Insert outbound message records BEFORE attempting send
  const messages = pendingWithPhone.map((r) => ({
    tenant_id: tenantId,
    account_id: r.account_id,
    phone: r.phone,
    message_text: campaign.message_template,
    direction: "outbound" as const,
    received_at: new Date().toISOString(),
    processed: false,
    send_status: "pending",
    send_attempts: 0,
  }))

  const { data: insertedMessages, error: msgError } = await supabase
    .from("whatsapp_messages")
    .insert(messages)
    .select("id, phone")
  if (msgError) {
    logger.error({
      event: "campaign.execute.messages_insert_failed",
      status: "error",
      tenant_id: tenantId,
      entity_id: campaignId,
      entity_type: "campaign",
      error: msgError.message,
    })
    return { error: msgError.message }
  }

  // ---------------------------------------------------------------------------
  // Send via Meta Cloud API — track each result individually
  // ---------------------------------------------------------------------------
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  const metaConfigured = Boolean(phoneNumberId && accessToken)

  type SendResult = {
    account_id: string
    phone: string
    ok: boolean
    wa_message_id: string | null
    error: string | null
  }

  let results: SendResult[] = []

  if (metaConfigured) {
    const settled = await Promise.allSettled(
      pendingWithPhone.map(async (r): Promise<SendResult> => {
        try {
          const res = await fetch(
            `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                messaging_product: "whatsapp",
                to: r.phone.replace(/\D/g, ""),
                type: "text",
                text: { body: campaign.message_template },
              }),
              signal: AbortSignal.timeout(10_000),
            }
          )

          if (res.ok) {
            const data = await res.json()
            return {
              account_id: r.account_id,
              phone: r.phone,
              ok: true,
              wa_message_id: data?.messages?.[0]?.id ?? null,
              error: null,
            }
          }

          let errMsg = `HTTP ${res.status}`
          try {
            const errData = await res.json()
            errMsg = errData?.error?.message ?? errMsg
          } catch { /* ignore */ }

          return { account_id: r.account_id, phone: r.phone, ok: false, wa_message_id: null, error: errMsg }
        } catch (err) {
          return {
            account_id: r.account_id,
            phone: r.phone,
            ok: false,
            wa_message_id: null,
            error: err instanceof Error ? err.message : String(err),
          }
        }
      })
    )

    results = settled.map((s, i) => {
      if (s.status === "fulfilled") return s.value
      return {
        account_id: pendingWithPhone[i].account_id,
        phone: pendingWithPhone[i].phone,
        ok: false,
        wa_message_id: null,
        error: s.reason instanceof Error ? s.reason.message : String(s.reason),
      }
    })
  } else {
    // WhatsApp not configured — mark all as pending (not failed)
    logger.warn({
      event: "campaign.execute.not_configured",
      status: "skipped",
      tenant_id: tenantId,
      entity_id: campaignId,
      metadata: { reason: "WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN not set" },
    })
    results = pendingWithPhone.map((r) => ({
      account_id: r.account_id,
      phone: r.phone,
      ok: false,
      wa_message_id: null,
      error: "WhatsApp not configured",
    }))
  }

  // ---------------------------------------------------------------------------
  // Update whatsapp_messages records with real send outcomes
  // ---------------------------------------------------------------------------
  if (insertedMessages && insertedMessages.length > 0) {
    // Build phone → message_id map from the inserted rows
    const msgIdByPhone = new Map(insertedMessages.map((m: { id: string; phone: string }) => [m.phone, m.id]))

    const sentResults = results.filter((r) => r.ok)
    const failedResults = results.filter((r) => !r.ok)

    // Sent: individual updates (each has a different wa_message_id)
    await Promise.all(
      sentResults.map((r) => {
        const msgId = msgIdByPhone.get(r.phone)
        if (!msgId) return Promise.resolve()
        return supabase
          .from("whatsapp_messages")
          .update({
            send_status: "sent",
            wa_message_id: r.wa_message_id,
            send_attempts: 1,
            processed: true,
          })
          .eq("id", msgId)
      })
    )

    // Failed: bulk update in one query
    const failedMsgIds = failedResults
      .map((r) => msgIdByPhone.get(r.phone))
      .filter((id): id is string => Boolean(id))

    if (failedMsgIds.length > 0) {
      // last_error may differ per message; use the first error as a representative label
      // For granularity, update each failed message individually with its own error
      await Promise.all(
        failedResults.map((r) => {
          const msgId = msgIdByPhone.get(r.phone)
          if (!msgId) return Promise.resolve()
          return supabase
            .from("whatsapp_messages")
            .update({
              send_status: "failed",
              last_error: r.error,
              send_attempts: 1,
            })
            .eq("id", msgId)
        })
      )
    }
  }

  // ---------------------------------------------------------------------------
  // Count outcomes
  // ---------------------------------------------------------------------------
  const sentList = results.filter((r) => r.ok)
  const failedList = results.filter((r) => !r.ok)
  const sentCount = sentList.length
  const failedCount = failedList.length
  const total = results.length

  // ---------------------------------------------------------------------------
  // Update campaign_recipients individually based on actual outcome
  // ---------------------------------------------------------------------------
  const sentIds = sentList.map((r) => r.account_id)
  const failedIds = failedList.map((r) => r.account_id)

  if (sentIds.length > 0) {
    await supabase
      .from("campaign_recipients")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("campaign_id", campaignId)
      .in("account_id", sentIds)

    // Update last_contact_at for successfully reached accounts
    await supabase
      .from("accounts")
      .update({ last_contact_at: new Date().toISOString() })
      .eq("tenant_id", tenantId)
      .in("id", sentIds)
  }

  if (failedIds.length > 0) {
    await supabase
      .from("campaign_recipients")
      .update({ status: "failed" })
      .eq("campaign_id", campaignId)
      .in("account_id", failedIds)
  }

  // ---------------------------------------------------------------------------
  // Determine campaign final status
  // ---------------------------------------------------------------------------
  let campaignStatus: "active" | "partial_failure" | "failed"
  if (sentCount === total) {
    campaignStatus = "active"
  } else if (sentCount > 0) {
    campaignStatus = "partial_failure"
  } else {
    campaignStatus = "failed"
  }

  const failureRate = total > 0 ? Math.round((failedCount / total) * 100 * 100) / 100 : 0

  await supabase
    .from("campaigns")
    .update({
      status: campaignStatus,
      sent_count: sentCount,
      failed_count: failedCount,
      failure_rate: failureRate,
      executed_at: new Date().toISOString(),
    })
    .eq("id", campaignId)
    .eq("tenant_id", tenantId)

  // Log outcome
  if (failedCount > 0) {
    logger.warn({
      event: "campaign.execute.partial_failure",
      status: "error",
      tenant_id: tenantId,
      entity_id: campaignId,
      entity_type: "campaign",
      metadata: {
        total,
        sent: sentCount,
        failed: failedCount,
        failure_rate: failureRate,
        first_errors: failedList.slice(0, 3).map((r) => ({ phone: r.phone, error: r.error })),
      },
    })
  } else {
    logger.info({
      event: "campaign.execute.success",
      status: "ok",
      tenant_id: tenantId,
      entity_id: campaignId,
      entity_type: "campaign",
      metadata: { total, sent: sentCount },
    })
  }

  revalidatePath("/campaigns")
  return {
    error: null,
    sent: sentCount,
    failed: failedCount,
    status: campaignStatus,
  }
}

export async function getCampaignStats(tenantId: string) {
  const supabase = await createClient()

  const [campaignsRes, recipientsRes] = await Promise.all([
    supabase
      .from("campaigns")
      .select("id, status, sent_count, failed_count, type, executed_at")
      .eq("tenant_id", tenantId),
    supabase
      .from("campaign_recipients")
      .select("status, campaign_id")
      .eq("tenant_id", tenantId),
  ])

  const campaigns = campaignsRes.data ?? []
  const recipients = recipientsRes.data ?? []

  const totalCampaigns = campaigns.length
  const activeCampaigns = campaigns.filter((c) => c.status === "active").length
  const draftCampaigns = campaigns.filter((c) => c.status === "draft").length
  const partialFailureCampaigns = campaigns.filter((c) => c.status === "partial_failure").length
  const failedCampaigns = campaigns.filter((c) => c.status === "failed").length

  const totalSent = campaigns.reduce((sum, c) => sum + (c.sent_count ?? 0), 0)
  const totalFailed = campaigns.reduce((sum, c) => sum + (c.failed_count ?? 0), 0)
  const totalRecipients = recipients.length
  const sentRecipients = recipients.filter((r) => r.status === "sent").length
  const failedRecipients = recipients.filter((r) => r.status === "failed").length
  const noPhoneRecipients = recipients.filter((r) => r.status === "no_phone").length

  // Real success rate: only count actually sent / (sent + failed), exclude no_phone
  const deliverable = sentRecipients + failedRecipients
  const realSuccessRate = deliverable > 0
    ? Math.round((sentRecipients / deliverable) * 100)
    : 0

  return {
    totalCampaigns,
    activeCampaigns,
    draftCampaigns,
    partialFailureCampaigns,
    failedCampaigns,
    totalSent,
    totalFailed,
    totalRecipients,
    sentRecipients,
    failedRecipients,
    noPhoneRecipients,
    // successRate now reflects real delivery rate, not "sent / total including no_phone"
    successRate: realSuccessRate,
  }
}

export async function deleteCampaign(id: string) {
  const supabase = await createClient()
  const tenantId = await getTenantId(supabase)
  const { error } = await supabase
    .from("campaigns")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .eq("status", "draft")
  if (error) return { error: error.message }
  revalidatePath("/campaigns")
  return { error: null }
}
