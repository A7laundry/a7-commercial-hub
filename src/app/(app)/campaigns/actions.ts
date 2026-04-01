"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { CampaignType } from "@/types"

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

  // Fetch campaign + pending recipients with phones
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

  // Create outbound whatsapp_messages records
  const messages = pendingWithPhone.map((r) => ({
    tenant_id: tenantId,
    account_id: r.account_id,
    phone: r.phone,
    message_text: campaign.message_template,
    direction: "outbound" as const,
    received_at: new Date().toISOString(),
    processed: false,
  }))

  const { error: msgError } = await supabase.from("whatsapp_messages").insert(messages)
  if (msgError) return { error: msgError.message }

  // Try Meta Cloud API for each recipient (fire-and-forget)
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  if (phoneNumberId && accessToken) {
    await Promise.allSettled(
      pendingWithPhone.map((r) =>
        fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: r.phone.replace(/\D/g, ""),
            type: "text",
            text: { body: campaign.message_template },
          }),
        })
      )
    )
  }

  // Mark recipients as sent
  await supabase
    .from("campaign_recipients")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("campaign_id", campaignId)
    .eq("status", "pending")
    .not("phone", "is", null)

  // Update campaign
  await supabase
    .from("campaigns")
    .update({
      status: "active",
      sent_count: pendingWithPhone.length,
      executed_at: new Date().toISOString(),
    })
    .eq("id", campaignId)
    .eq("tenant_id", tenantId)

  revalidatePath("/campaigns")
  return { error: null, sent: pendingWithPhone.length }
}

export async function getCampaignStats(tenantId: string) {
  const supabase = await createClient()

  const [campaignsRes, recipientsRes] = await Promise.all([
    supabase
      .from("campaigns")
      .select("id, status, sent_count, type, executed_at")
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
  const totalSent = campaigns.reduce((sum, c) => sum + (c.sent_count ?? 0), 0)
  const totalRecipients = recipients.length
  const sentRecipients = recipients.filter((r) => r.status === "sent").length
  const noPhoneRecipients = recipients.filter((r) => r.status === "no_phone").length
  const successRate = totalRecipients > 0 ? Math.round((sentRecipients / totalRecipients) * 100) : 0

  return {
    totalCampaigns,
    activeCampaigns,
    draftCampaigns,
    totalSent,
    totalRecipients,
    sentRecipients,
    noPhoneRecipients,
    successRate,
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
