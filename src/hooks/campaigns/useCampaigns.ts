import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { Campaign } from "@/types"

export function useCampaigns(tenantId: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: ["campaigns", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
      if (error) throw error
      return (data ?? []) as Campaign[]
    },
    staleTime: 30_000,
  })
}

export function useCampaignRecipients(tenantId: string, campaignId: string | null) {
  const supabase = createClient()
  return useQuery({
    queryKey: ["campaign_recipients", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_recipients")
        .select("*, accounts(name, contact_name, contact_email)")
        .eq("campaign_id", campaignId!)
        .order("created_at")
      if (error) throw error
      return data ?? []
    },
    enabled: Boolean(campaignId),
    staleTime: 15_000,
  })
}
