import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { Campaign } from "@/types"

export type CampaignStats = {
  totalCampaigns: number
  activeCampaigns: number
  draftCampaigns: number
  totalSent: number
  totalRecipients: number
  sentRecipients: number
  noPhoneRecipients: number
  successRate: number
}

export type CampaignWithRecipientStats = Campaign & {
  sentCount: number
  pendingCount: number
  noPhoneCount: number
  failedCount: number
  totalCount: number
}

export function useCampaignDashboard(tenantId: string) {
  const supabase = createClient()

  return useQuery<{ stats: CampaignStats; recentCampaigns: CampaignWithRecipientStats[] }>({
    queryKey: ["campaign_dashboard", tenantId],
    queryFn: async () => {
      const [campaignsRes, recipientsRes] = await Promise.all([
        supabase
          .from("campaigns")
          .select("*")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("campaign_recipients")
          .select("campaign_id, status")
          .eq("tenant_id", tenantId),
      ])

      const campaigns = (campaignsRes.data ?? []) as Campaign[]
      const allRecipients = recipientsRes.data ?? []

      // Compute per-campaign stats
      const recipientsByCampaign = new Map<string, typeof allRecipients>()
      for (const r of allRecipients) {
        if (!recipientsByCampaign.has(r.campaign_id)) {
          recipientsByCampaign.set(r.campaign_id, [])
        }
        recipientsByCampaign.get(r.campaign_id)!.push(r)
      }

      const recentCampaigns: CampaignWithRecipientStats[] = campaigns.map((c) => {
        const recs = recipientsByCampaign.get(c.id) ?? []
        return {
          ...c,
          sentCount: recs.filter((r) => r.status === "sent").length,
          pendingCount: recs.filter((r) => r.status === "pending").length,
          noPhoneCount: recs.filter((r) => r.status === "no_phone").length,
          failedCount: recs.filter((r) => r.status === "failed").length,
          totalCount: recs.length,
        }
      })

      // Global stats
      const totalCampaigns = campaigns.length
      const activeCampaigns = campaigns.filter((c) => c.status === "active").length
      const draftCampaigns = campaigns.filter((c) => c.status === "draft").length
      const totalSent = campaigns.reduce((sum, c) => sum + (c.sent_count ?? 0), 0)
      const totalRecipients = allRecipients.length
      const sentRecipients = allRecipients.filter((r) => r.status === "sent").length
      const failedRecipients = allRecipients.filter((r) => r.status === "failed").length
      const noPhoneRecipients = allRecipients.filter((r) => r.status === "no_phone").length
      // Real success rate: sent / (sent + failed) — excludes no_phone (not deliverable)
      const deliverable = sentRecipients + failedRecipients
      const successRate = deliverable > 0 ? Math.round((sentRecipients / deliverable) * 100) : 0

      return {
        stats: {
          totalCampaigns,
          activeCampaigns,
          draftCampaigns,
          totalSent,
          totalRecipients,
          sentRecipients,
          noPhoneRecipients,
          successRate,
        },
        recentCampaigns,
      }
    },
    staleTime: 30_000,
  })
}
