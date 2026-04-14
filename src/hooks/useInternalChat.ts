"use client"

import { useEffect, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"

export type ChatMember = {
  user_id: string
  email: string
  display_name: string | null
  avatar_url: string | null
  role: string
  last_message: string | null
  last_message_at: string | null
  unread_count: number
}

export type ChatMessage = {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  read_at: string | null
  created_at: string
}

// ── List org members with last message + unread count ─────────────────────────

export function useChatMembers(tenantId: string, currentUserId: string) {
  return useQuery({
    queryKey: ["chat:members", tenantId, currentUserId],
    queryFn: async (): Promise<ChatMember[]> => {
      const supabase = createClient()

      // All other users in the tenant (user_id + role)
      const { data: members, error } = await supabase
        .from("tenant_users")
        .select("user_id, role")
        .eq("tenant_id", tenantId)
        .neq("user_id", currentUserId)

      if (error) throw new Error(error.message)
      if (!members?.length) return []

      const otherIds = members.map((m) => m.user_id)

      // Profiles for all members
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", otherIds)

      // Emails from auth (available via RLS-safe view if exists, else fallback to empty)
      // We store email on user_profiles at signup — use display_name as fallback label
      const profileMap = new Map(
        (profiles ?? []).map((p) => [p.user_id, p])
      )
      const roleMap = new Map(members.map((m) => [m.user_id, m.role]))

      // Last message per thread + unread counts
      const result: ChatMember[] = await Promise.all(
        otherIds.map(async (otherId) => {
          const { data: lastMsgs } = await supabase
            .from("internal_messages")
            .select("content, created_at, sender_id")
            .eq("tenant_id", tenantId)
            .or(
              `and(sender_id.eq.${currentUserId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${currentUserId})`
            )
            .order("created_at", { ascending: false })
            .limit(1)

          const { count: unread } = await supabase
            .from("internal_messages")
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", tenantId)
            .eq("sender_id", otherId)
            .eq("receiver_id", currentUserId)
            .is("read_at", null)

          const profile = profileMap.get(otherId)

          return {
            user_id: otherId,
            email: profile?.display_name ?? otherId,
            display_name: profile?.display_name ?? null,
            avatar_url: profile?.avatar_url ?? null,
            role: roleMap.get(otherId) ?? "member",
            last_message: lastMsgs?.[0]?.content ?? null,
            last_message_at: lastMsgs?.[0]?.created_at ?? null,
            unread_count: unread ?? 0,
          }
        })
      )

      return result.sort((a, b) => {
        if (a.last_message_at && b.last_message_at) {
          return b.last_message_at.localeCompare(a.last_message_at)
        }
        if (a.last_message_at) return -1
        if (b.last_message_at) return 1
        return (a.display_name ?? a.email).localeCompare(b.display_name ?? b.email)
      })
    },
    enabled: Boolean(tenantId && currentUserId),
    refetchInterval: 30_000,
  })
}

// ── Total unread count (for badge in header) ──────────────────────────────────

export function useChatUnreadCount(tenantId: string, currentUserId: string) {
  return useQuery({
    queryKey: ["chat:unread", tenantId, currentUserId],
    queryFn: async () => {
      const supabase = createClient()
      const { count } = await supabase
        .from("internal_messages")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("receiver_id", currentUserId)
        .is("read_at", null)
      return count ?? 0
    },
    enabled: Boolean(tenantId && currentUserId),
    refetchInterval: 30_000,
  })
}

// ── Messages in a thread ──────────────────────────────────────────────────────

export function useChatThread(tenantId: string, currentUserId: string, otherId: string | null) {
  const qc = useQueryClient()
  const supabase = createClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const query = useQuery({
    queryKey: ["chat:thread", tenantId, currentUserId, otherId],
    queryFn: async (): Promise<ChatMessage[]> => {
      if (!otherId) return []
      const { data, error } = await supabase
        .from("internal_messages")
        .select("id, sender_id, receiver_id, content, read_at, created_at")
        .eq("tenant_id", tenantId)
        .or(
          `and(sender_id.eq.${currentUserId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${currentUserId})`
        )
        .order("created_at", { ascending: true })
      if (error) throw new Error(error.message)
      return data as ChatMessage[]
    },
    enabled: Boolean(tenantId && currentUserId && otherId),
  })

  // Realtime subscription for this thread
  useEffect(() => {
    if (!tenantId || !currentUserId || !otherId) return

    const channel = supabase
      .channel(`chat:thread:${tenantId}:${currentUserId}:${otherId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "internal_messages",
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const msg = payload.new as ChatMessage & { tenant_id: string }
          const isThisThread =
            (msg.sender_id === currentUserId && msg.receiver_id === otherId) ||
            (msg.sender_id === otherId && msg.receiver_id === currentUserId)
          if (!isThisThread) return

          qc.setQueryData<ChatMessage[]>(
            ["chat:thread", tenantId, currentUserId, otherId],
            (prev) => [...(prev ?? []), msg]
          )
          qc.invalidateQueries({ queryKey: ["chat:members", tenantId] })
          qc.invalidateQueries({ queryKey: ["chat:unread", tenantId] })
        }
      )
      .subscribe()

    channelRef.current = channel
    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, currentUserId, otherId])

  return query
}

// ── Send a message ────────────────────────────────────────────────────────────

export function useSendMessage(tenantId: string, senderId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ receiverId, content }: { receiverId: string; content: string }) => {
      const supabase = createClient()
      const { error } = await supabase.from("internal_messages").insert({
        tenant_id: tenantId,
        sender_id: senderId,
        receiver_id: receiverId,
        content: content.trim(),
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["chat:thread", tenantId, senderId, vars.receiverId] })
      qc.invalidateQueries({ queryKey: ["chat:members", tenantId] })
    },
  })
}

// ── Mark thread as read ───────────────────────────────────────────────────────

export function useMarkRead(tenantId: string, currentUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (senderId: string) => {
      const supabase = createClient()
      await supabase
        .from("internal_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("tenant_id", tenantId)
        .eq("sender_id", senderId)
        .eq("receiver_id", currentUserId)
        .is("read_at", null)
    },
    onSuccess: (_, senderId) => {
      qc.invalidateQueries({ queryKey: ["chat:unread", tenantId] })
      qc.invalidateQueries({ queryKey: ["chat:members", tenantId] })
      qc.invalidateQueries({ queryKey: ["chat:thread", tenantId, currentUserId, senderId] })
    },
  })
}
