import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"

/**
 * Counts inbound messages that have no subsequent outbound reply
 * (i.e., "unread/unanswered" conversations).
 * Lightweight — used only for the sidebar badge.
 */
export function useInboxUnreadCount(tenantId: string) {
  const supabase = createClient()

  return useQuery<number>({
    queryKey: ["inbox:unread-count", tenantId],
    queryFn: async () => {
      // Get last 500 messages to compute unread across all conversations
      const { data: messages } = await supabase
        .from("whatsapp_messages")
        .select("account_id, phone, direction, received_at")
        .eq("tenant_id", tenantId)
        .order("received_at", { ascending: false })
        .limit(500)

      if (!messages) return 0

      // Group by conversation key
      const groups = new Map<string, typeof messages>()
      for (const msg of messages) {
        const key = msg.account_id ?? msg.phone
        if (!groups.has(key)) groups.set(key, [])
        groups.get(key)!.push(msg)
      }

      let unreadConversations = 0
      for (const msgs of groups.values()) {
        const sorted = [...msgs].sort(
          (a, b) => new Date(a.received_at).getTime() - new Date(b.received_at).getTime()
        )
        const lastOutboundIdx = sorted.map((m) => m.direction).lastIndexOf("outbound")
        const unread = lastOutboundIdx === -1
          ? sorted.filter((m) => m.direction === "inbound").length
          : sorted.slice(lastOutboundIdx + 1).filter((m) => m.direction === "inbound").length

        if (unread > 0) unreadConversations++
      }

      return unreadConversations
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}
