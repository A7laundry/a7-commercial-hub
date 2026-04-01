import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { WhatsAppMessage } from "@/types"

export function useAccountWhatsApp(tenantId: string, accountId: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ["whatsapp", tenantId, accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_messages")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("account_id", accountId)
        .order("received_at", { ascending: true })
        .limit(50)

      if (error) throw error
      return (data ?? []) as WhatsAppMessage[]
    },
    staleTime: 30_000,
  })
}
