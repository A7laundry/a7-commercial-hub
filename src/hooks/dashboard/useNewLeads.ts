/**
 * useNewLeads — Dashboard hook
 *
 * Leads novos do WhatsApp nas últimas 24h, criados pelo webhook
 * via createLeadFromWebhook (src/lib/lead-capture.ts).
 *
 * Filtros:
 *   - tenant_id = current tenant
 *   - pipeline_stage = 'lead'
 *   - source LIKE 'website-%' (cobre 'website-whatsapp', 'website-no-tag',
 *     'website-no-tag-match')
 *   - created_at >= NOW() - 24h
 *
 * Refetch automático a cada 30s — dashboard sempre atualizado.
 */

import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { Account } from "@/types"

export type NewLead = Pick<
  Account,
  | "id"
  | "name"
  | "source"
  | "tags"
  | "unit"
  | "notes"
  | "pipeline_stage"
  | "last_contact_at"
  | "created_at"
> & {
  phone?: string | null
  lp_label?: string | null
  lp_url?: string | null
  unit_label?: string | null
  first_message?: string | null
}

/**
 * Hook: leads novos do WA (24h) com enriquecimento via timeline metadata.
 */
export function useNewLeads(tenantId: string) {
  return useQuery<NewLead[]>({
    queryKey: ["dashboard:new-leads", tenantId],
    queryFn: async () => {
      const supabase = createClient()
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

      // 1. Pega leads novos
      const { data: accounts, error: accErr } = await supabase
        .from("accounts")
        .select(
          "id, name, source, tags, unit, notes, pipeline_stage, last_contact_at, created_at, phone_mappings(phone)"
        )
        .eq("tenant_id", tenantId)
        .eq("pipeline_stage", "lead")
        .like("source", "website-%")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(50)

      if (accErr) throw new Error(accErr.message)
      const list = (accounts ?? []) as Array<
        NewLead & { phone_mappings?: { phone: string }[] }
      >

      if (list.length === 0) return []

      // 2. Busca metadata do timeline (lead_created) — enriquece com lp_label/unit_label/first_message
      const accountIds = list.map((a) => a.id)
      const { data: events } = await supabase
        .from("account_timeline")
        .select("account_id, metadata")
        .in("account_id", accountIds)
        .eq("event_type", "lead_created")
        .order("created_at", { ascending: false })
        .limit(500)

      const eventByAccount = new Map<string, Record<string, unknown>>()
      for (const ev of events ?? []) {
        if (!eventByAccount.has(ev.account_id)) {
          eventByAccount.set(ev.account_id, (ev.metadata as Record<string, unknown>) ?? {})
        }
      }

      // 3. Monta o resultado enriquecido
      return list.map((a): NewLead => {
        const meta = eventByAccount.get(a.id) ?? {}
        return {
          id: a.id,
          name: a.name,
          source: a.source ?? null,
          tags: a.tags ?? [],
          unit: a.unit ?? null,
          notes: a.notes ?? null,
          pipeline_stage: a.pipeline_stage,
          last_contact_at: a.last_contact_at,
          created_at: a.created_at,
          phone: a.phone_mappings?.[0]?.phone ?? null,
          lp_label: (meta.lp_label as string | null) ?? null,
          lp_url: (meta.lp_url as string | null) ?? null,
          unit_label: (meta.unit_label as string | null) ?? null,
          first_message: (meta.first_message as string | null) ?? null,
        }
      })
    },
    enabled: Boolean(tenantId),
    refetchInterval: 30_000,
    staleTime: 15_000,
  })
}
