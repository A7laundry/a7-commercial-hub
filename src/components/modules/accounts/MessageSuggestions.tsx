"use client"

import { useState } from "react"
import { getMessageSuggestions, computeCommercialScore } from "@/lib/commercial-intelligence"
import type { Account, Contract } from "@/types"
import { cn } from "@/lib/utils"
import { Copy, Check, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"

type Props = {
  account: Account
  contracts: Contract[]
}

const TYPE_LABEL: Record<string, string> = {
  follow_up:   "Follow-up",
  upsell:      "Upsell",
  reactivation: "Reativação",
  renewal:     "Renovação",
}

export function MessageSuggestions({ account, contracts }: Props) {
  const [copied, setCopied] = useState<string | null>(null)
  const score = computeCommercialScore(account, contracts)
  const suggestions = getMessageSuggestions(account, score, contracts)

  async function copy(id: string, text: string) {
    await navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-3">
      {suggestions.map((s, i) => {
        const id = `${s.type}_${i}`
        const isCopied = copied === id
        return (
          <div key={id} className="rounded-md border bg-card p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {TYPE_LABEL[s.type] ?? s.type}
                </span>
                <span className="text-xs text-muted-foreground/60">·</span>
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className={cn("h-6 px-2 text-xs gap-1", isCopied && "text-green-600")}
                onClick={() => copy(id, s.text)}
              >
                {isCopied ? (
                  <>
                    <Check className="w-3 h-3" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copiar
                  </>
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {s.text}
            </p>
          </div>
        )
      })}
    </div>
  )
}
