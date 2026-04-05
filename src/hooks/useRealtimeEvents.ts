"use client"

/**
 * useRealtimeEvents
 *
 * Mounted ONCE at AppShell level. Creates two Supabase Realtime channels:
 *
 *  1. realtime:wa:{tenantId}   — whatsapp_messages INSERT
 *     → invalidates "inbox:unread-count"
 *     → fires toast for known inbound messages (account_id present)
 *
 *  2. realtime:alerts:{tenantId} — alerts INSERT
 *     → invalidates "alerts:open-count"
 *     → fires toast for critical severity
 *
 * Toast cooldown: 3s per account to prevent duplicate toasts from burst events.
 * Fallback: polling (refetchInterval on individual hooks) handles reconnect gaps.
 */

import { useEffect, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

type WaInsertPayload = {
  account_id: string | null
  direction: "inbound" | "outbound"
  phone: string
  tenant_id: string
}

type AlertInsertPayload = {
  severity: "critical" | "warning" | "info"
  title: string
  account_id: string | null
  tenant_id: string
}

export function useRealtimeEvents(tenantId: string) {
  const qc = useQueryClient()
  const supabase = createClient()
  // Toast cooldown: map of account_id (or phone) → last toast timestamp
  const lastToastAt = useRef(new Map<string, number>())

  useEffect(() => {
    if (!tenantId) return

    // ── Channel 1: inbound WhatsApp messages ──────────────────────────────────
    const waChannel = supabase
      .channel(`realtime:wa:${tenantId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "whatsapp_messages",
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const msg = payload.new as WaInsertPayload
          if (msg.direction !== "inbound") return

          // Invalidate inbox count
          qc.invalidateQueries({ queryKey: ["inbox:unread-count", tenantId] })

          // Toast: only for messages from known accounts, with 3s cooldown
          if (msg.account_id) {
            const key = msg.account_id
            const now = Date.now()
            const last = lastToastAt.current.get(key) ?? 0
            if (now - last < 3_000) return

            lastToastAt.current.set(key, now)

            // Try to get account name from React Query cache
            const accountsCache = qc.getQueriesData<{ id: string; name: string }[]>({
              queryKey: ["accounts"],
            })
            let accountName: string | null = null
            for (const [, data] of accountsCache) {
              if (!Array.isArray(data)) continue
              const found = data.find((a) => a.id === msg.account_id)
              if (found) { accountName = found.name; break }
            }

            toast(accountName ? `${accountName} respondeu` : "Nova mensagem", {
              description: "WhatsApp · toque para ver",
              action: {
                label: "Inbox",
                onClick: () => window.location.assign("/inbox"),
              },
              duration: 4_000,
            })
          }
        },
      )
      .subscribe()

    // ── Channel 2: new alerts ─────────────────────────────────────────────────
    const alertsChannel = supabase
      .channel(`realtime:alerts:${tenantId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "alerts",
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const alert = payload.new as AlertInsertPayload

          qc.invalidateQueries({ queryKey: ["alerts:open-count", tenantId] })

          // Toast only for critical alerts — warning/info covered by badge
          if (alert.severity === "critical") {
            toast.error(alert.title, {
              description: "Alerta crítico — ação necessária agora",
              action: {
                label: "Ver alertas",
                onClick: () => window.location.assign("/alerts"),
              },
              duration: 8_000,
            })
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(waChannel)
      supabase.removeChannel(alertsChannel)
    }
  }, [tenantId, qc, supabase])
}
