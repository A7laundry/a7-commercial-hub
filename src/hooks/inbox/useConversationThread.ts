import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { WhatsAppMessage } from "@/types"

export function useConversationThread(tenantId: string, conversationId: string | null) {
  const supabase = createClient()
  const qc = useQueryClient()

  // Realtime: new messages in this conversation
  useEffect(() => {
    if (!conversationId) return

    const channel = supabase
      .channel(`thread:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "whatsapp_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["thread", tenantId, conversationId] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, qc])

  return useQuery<WhatsAppMessage[]>({
    queryKey: ["thread", tenantId, conversationId],
    queryFn: async () => {
      if (!conversationId) return []

      const { data, error } = await supabase
        .from("whatsapp_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("received_at", { ascending: true })
        .limit(200)

      if (error) throw error
      return (data ?? []) as WhatsAppMessage[]
    },
    enabled: !!conversationId,
    staleTime: 30_000,
  })
}
