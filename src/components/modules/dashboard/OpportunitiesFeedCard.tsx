"use client"

import { useState } from "react"
import Link from "next/link"
import { useOpportunities } from "@/hooks/dashboard/useOpportunities"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { TrendingUp, PhoneCall, RefreshCw, Zap, Flame, Copy, Check } from "lucide-react"

const ACTION_CONFIG = {
  upsell:       { icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50", label: "Upsell" },
  follow_up:    { icon: PhoneCall,  color: "text-amber-600",   bg: "bg-amber-50",   label: "Follow-up" },
  renewal:      { icon: RefreshCw,  color: "text-blue-600",    bg: "bg-blue-50",    label: "Renovação" },
  reactivation: { icon: Zap,        color: "text-red-600",     bg: "bg-red-50",     label: "Reativar" },
}

const SEVERITY_DOT = {
  critical: "bg-red-500",
  warning:  "bg-amber-400",
  info:     "bg-blue-400",
}

type Props = {
  tenantId: string
}

export function OpportunitiesFeedCard({ tenantId }: Props) {
  const { data: items = [], isPending: isLoading } = useOpportunities(tenantId)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  async function copyMessage(id: string, text: string, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="bg-card border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b">
        <Flame className="w-4 h-4 text-orange-500" />
        <h3 className="text-sm font-semibold">Oportunidades</h3>
        {!isLoading && items.length > 0 && (
          <span className="ml-auto text-[10px] font-medium bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
            {items.length}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="divide-y">
        {isLoading ? (
          <div className="p-3 space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full rounded-md" />)}
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma oportunidade identificada.
          </p>
        ) : (
          items.slice(0, 8).map((item) => {
            const cfg = ACTION_CONFIG[item.actionType]
            const Icon = cfg.icon

            return (
              <Link
                key={item.id}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
              >
                {/* Severity dot */}
                <div className={cn("w-1.5 h-1.5 rounded-full shrink-0 mt-0.5", SEVERITY_DOT[item.severity])} />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.accountName}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.signal}</p>
                </div>

                {/* Action badge + copy + LTV */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className={cn(
                      "flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full",
                      cfg.bg, cfg.color
                    )}>
                      <Icon className="w-2.5 h-2.5" />
                      {cfg.label}
                    </span>
                    {item.messageText && (
                      <button
                        type="button"
                        onClick={(e) => copyMessage(item.id, item.messageText!, e)}
                        className={cn(
                          "flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded border transition-colors",
                          copiedId === item.id
                            ? "border-green-300 text-green-600 bg-green-50"
                            : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                        title="Copiar mensagem WhatsApp"
                      >
                        {copiedId === item.id
                          ? <><Check className="w-2.5 h-2.5" /> Copiado</>
                          : <><Copy className="w-2.5 h-2.5" /> Copiar</>
                        }
                      </button>
                    )}
                  </div>
                  {item.ltv != null && (
                    <span className="text-[10px] text-muted-foreground">
                      LTV {item.ltv.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
                    </span>
                  )}
                </div>
              </Link>
            )
          })
        )}
      </div>

      {items.length > 8 && (
        <div className="px-4 py-2 border-t text-center">
          <Link href="/accounts" className="text-xs text-primary hover:underline">
            Ver todas as {items.length} oportunidades →
          </Link>
        </div>
      )}
    </div>
  )
}
