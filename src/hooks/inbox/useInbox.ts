import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { ConversationStatus } from "@/app/(app)/inbox/actions"

export type { ConversationStatus }

export type InboxFilter =
  | "all"         // everything except spam
  | "open"        // open + pending_customer + pending_internal
  | "mine"        // assigned to current user, not resolved/spam
  | "unassigned"  // no assignee, not resolved/spam
  | "resolved"    // resolved only
  | "spam"        // spam only

export type Conversation = {
  id: string
  key: string                // alias for id, kept for backwards compat
  accountId: string | null
  accountName: string | null
  phone: string
  status: ConversationStatus
  assignedTo: string | null
  assignedAt: string | null
  unreadCount: number
  lastMessageAt: string | null
  lastMessagePreview: string | null
  lastMessageDirection: "inbound" | "outbound" | null
  windowExpiresAt: string | null
}

export function useInbox(
  tenantId: string,
  filter: InboxFilter = "all",
  userId?: string | null
) {
  const supabase = createClient()
  const qc = useQueryClient()

  // Realtime: invalidate all filter caches on any conversation change
  useEffect(() => {
    if (!tenantId) return

    const channel = supabase
      .channel(`inbox:${tenantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "wa_conversations",
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          // Invalidate all ["inbox", tenantId, *] keys
          qc.invalidateQueries({ queryKey: ["inbox", tenantId] })
          qc.invalidateQueries({ queryKey: ["inbox:unread-count", tenantId] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, qc])

  return useQuery<Conversation[]>({
    queryKey: ["inbox", tenantId, filter, userId ?? ""],
    queryFn: async () => {
      let query = supabase
        .from("wa_conversations")
        .select(`
          id, phone, account_id, status,
          assigned_to, assigned_at,
          unread_count, last_message_at,
          last_message_preview, last_message_direction,
          window_expires_at
        `)
        .eq("tenant_id", tenantId)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(100)

      // Apply server-side filter
      switch (filter) {
        case "all":
          query = query.not("status", "eq", "spam")
          break
        case "open":
          query = query.in("status", ["open", "pending_customer", "pending_internal"])
          break
        case "mine":
          if (userId) {
            query = query
              .eq("assigned_to", userId)
              .in("status", ["open", "pending_customer", "pending_internal"])
          }
          break
        case "unassigned":
          query = query
            .is("assigned_to", null)
            .in("status", ["open", "pending_customer", "pending_internal"])
          break
        case "resolved":
          query = query.eq("status", "resolved")
          break
        case "spam":
          query = query.eq("status", "spam")
          break
      }

      const { data: rows, error } = await query
      if (error) throw error

      // Fetch account names in one query
      const accountIds = [...new Set(
        (rows ?? []).map((r) => r.account_id).filter(Boolean) as string[]
      )]
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

      return (rows ?? []).map((r) => ({
        id: r.id,
        key: r.id,
        accountId: r.account_id,
        accountName: r.account_id ? (accountNames[r.account_id] ?? null) : null,
        phone: r.phone,
        status: r.status as ConversationStatus,
        assignedTo: r.assigned_to,
        assignedAt: r.assigned_at,
        unreadCount: r.unread_count ?? 0,
        lastMessageAt: r.last_message_at,
        lastMessagePreview: r.last_message_preview,
        lastMessageDirection: r.last_message_direction as "inbound" | "outbound" | null,
        windowExpiresAt: r.window_expires_at,
      }))
    },
    staleTime: 30_000,
    refetchInterval: 120_000,
  })
}
