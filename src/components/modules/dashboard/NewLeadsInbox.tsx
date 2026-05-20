"use client"

/**
 * NewLeadsInbox — Card mobile-first de leads novos do WhatsApp (24h)
 *
 * Operador vê em segundos:
 *   - quem é (telefone)
 *   - de onde veio (LP)
 *   - quem atende (unidade)
 *   - primeira mensagem (snippet)
 *   - quando chegou
 *
 * Ação rápida: clica → abre /accounts/[id] pra qualificar.
 */

import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import { Sparkles, ArrowRight, MessageSquare, MapPin, Tag, Phone } from "lucide-react"
import { useNewLeads, type NewLead } from "@/hooks/dashboard/useNewLeads"

function timeAgo(iso: string | null) {
  if (!iso) return ""
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "agora"
  if (mins < 60) return `${mins}min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

function truncate(s: string | null | undefined, n: number): string {
  if (!s) return ""
  return s.length > n ? s.slice(0, n - 1) + "…" : s
}

/** Badge visual da fonte (origem do lead) */
function SourceBadge({ source }: { source: string | null | undefined }) {
  if (!source) return null
  const styles: Record<string, { label: string; cls: string }> = {
    "website-whatsapp":      { label: "LP identificada",       cls: "bg-green-100 text-green-700 ring-1 ring-green-200" },
    "website-no-tag-match":  { label: "Tag não mapeada",       cls: "bg-amber-100 text-amber-700 ring-1 ring-amber-200" },
    "website-no-tag":        { label: "Sem tag",               cls: "bg-slate-100 text-slate-600 ring-1 ring-slate-200" },
  }
  const cfg = styles[source] ?? { label: source, cls: "bg-slate-100 text-slate-600 ring-1 ring-slate-200" }
  return (
    <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

function LeadRow({ lead }: { lead: NewLead }) {
  const lpLabel = lead.lp_label ?? (lead.tags?.[0] ?? "—")
  const unitLabel = lead.unit_label ?? lead.unit ?? null

  return (
    <Link
      href={`/accounts/${lead.id}`}
      className="block py-3 px-2 -mx-2 rounded-lg hover:bg-[#f8f9fa] transition-colors group"
    >
      {/* Linha 1: nome/telefone + tempo + badge */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-[#022448]/10 flex items-center justify-center shrink-0">
            <Phone className="w-3.5 h-3.5 text-[#022448]" />
          </div>
          <p className="text-sm font-bold text-[#022448] truncate group-hover:text-[#F5A623] transition-colors">
            {lead.phone ?? lead.name}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <SourceBadge source={lead.source} />
          <span
            className="text-[10px] text-muted-foreground font-medium"
            suppressHydrationWarning
          >
            {timeAgo(lead.created_at)}
          </span>
        </div>
      </div>

      {/* Linha 2: LP + unidade */}
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-1 ml-9">
        <span className="flex items-center gap-1 min-w-0">
          <Tag className="w-3 h-3 shrink-0" />
          <span className="truncate font-medium">{lpLabel}</span>
        </span>
        {unitLabel && (
          <span className="flex items-center gap-1 min-w-0">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{unitLabel}</span>
          </span>
        )}
      </div>

      {/* Linha 3: primeira mensagem */}
      {lead.first_message && (
        <div className="flex items-start gap-1.5 text-[11px] text-[#022448]/70 italic ml-9">
          <MessageSquare className="w-3 h-3 mt-0.5 shrink-0" />
          <span className="line-clamp-2">{truncate(lead.first_message, 160)}</span>
        </div>
      )}
    </Link>
  )
}

export function NewLeadsInbox({ tenantId }: { tenantId: string }) {
  const { data: leads = [], isPending } = useNewLeads(tenantId)

  return (
    <div className="bg-white rounded-xl border border-transparent shadow-[0_2px_16px_rgba(2,36,72,0.07)] overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-[#f8f9fa]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#F5A623]/15">
            <Sparkles className="w-3.5 h-3.5 text-[#F5A623]" />
          </div>
          <h3 className="text-sm font-extrabold font-headline text-[#022448]">
            Leads novos · últimas 24h
          </h3>
          {leads.length > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F5A623]/15 text-[#F5A623]">
              {leads.length}
            </span>
          )}
        </div>
        <Link
          href="/accounts?stage=lead"
          className="text-[10px] font-semibold text-muted-foreground hover:text-[#F5A623] flex items-center gap-1 transition-colors"
        >
          Ver todos <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Body */}
      <div className="px-4 py-3 flex-1 overflow-y-auto max-h-[520px]">
        {isPending ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-7 h-7 rounded-full" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-4 w-20 rounded-full" />
                </div>
                <Skeleton className="h-3 w-48 ml-9" />
                <Skeleton className="h-3 w-full ml-9" />
              </div>
            ))}
          </div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
            <div className="w-12 h-12 rounded-full bg-[#022448]/8 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[#022448]/40" />
            </div>
            <p className="text-sm font-semibold text-[#022448]">
              Sem leads novos nas últimas 24h
            </p>
            <p className="text-[11px] text-muted-foreground max-w-[280px]">
              Quando um lead novo chamar pelo WhatsApp, vai aparecer aqui automaticamente.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#022448]/6">
            {leads.map((lead) => (
              <LeadRow key={lead.id} lead={lead} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
