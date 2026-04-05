import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { WhatsAppMessage } from "@/types"

export type Conversation = {
  key: string               // account_id or phone
  accountId: string | null
  accountName: string | null
  phone: string
  lastMessage: WhatsAppMessage
  unreadCount: number       // inbound messages with no subsequent outbound
  messages: WhatsAppMessage[]
}

export function useInbox(tenantId: string) {
  const supabase = createClient()
  const qc = useQueryClient()

  // Supabase Realtime: invalidate query on any insert to whatsapp_messages
  useEffect(() => {
    if (!tenantId) return

    const channel = supabase
      .channel(`inbox:${tenantId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "whatsapp_messages",
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["inbox", tenantId] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, qc])

  return useQuery<Conversation[]>({
    queryKey: ["inbox", tenantId],
    queryFn: async () => {
      // Fetch last 500 messages
      const { data: messages, error } = await supabase
        .from("whatsapp_messages")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("received_at", { ascending: false })
        .limit(500)

      if (error) throw error
      const allMessages = (messages ?? []) as WhatsAppMessage[]

      // Fetch account names for joined display
      const accountIds = [...new Set(allMessages.map((m) => m.account_id).filter(Boolean))] as string[]
      const accountNames: Record<string, string> = {}
      if (accountIds.length > 0) {
        const { data: accounts } = await supabase
          .from("accounts")
          .select("id, name")
          .in("id", accountIds)
        for (const a of accounts ?? []) {
          accountNames[a.id] = a.name
        }
      }

      // Group by account_id (or phone fallback)
      const groups = new Map<string, WhatsAppMessage[]>()
      for (const msg of allMessages) {
        const key = msg.account_id ?? msg.phone
        if (!groups.has(key)) groups.set(key, [])
        groups.get(key)!.push(msg)
      }

      const conversations: Conversation[] = []
      for (const [key, msgs] of groups) {
        // msgs are already sorted desc; reverse for timeline
        const sorted = [...msgs].sort(
          (a, b) => new Date(a.received_at).getTime() - new Date(b.received_at).getTime()
        )
        const lastMessage = sorted[sorted.length - 1]
        const lastOutboundIdx = sorted.map((m) => m.direction).lastIndexOf("outbound")
        const unreadCount = lastOutboundIdx === -1
          ? sorted.filter((m) => m.direction === "inbound").length
          : sorted.slice(lastOutboundIdx + 1).filter((m) => m.direction === "inbound").length

        conversations.push({
          key,
          accountId: lastMessage.account_id,
          accountName: lastMessage.account_id ? (accountNames[lastMessage.account_id] ?? null) : null,
          phone: lastMessage.phone,
          lastMessage,
          unreadCount,
          messages: sorted,
        })
      }

      // Sort by last message time desc
      return conversations.sort(
        (a, b) =>
          new Date(b.lastMessage.received_at).getTime() -
          new Date(a.lastMessage.received_at).getTime()
      )
    },
    staleTime: 30_000,
    refetchInterval: 120_000, // Fallback poll — realtime handles instant updates
  })
}
