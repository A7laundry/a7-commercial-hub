"use client"

import { useState } from "react"
import type { ImportSummaryStats } from "@/lib/import/intelligence-analyzer"
import type { BatchImportResult } from "@/app/(app)/import/actions"
import { CheckCircle, Copy, Check, Users, ArrowRight, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { cn } from "@/lib/utils"

type Props = {
  importResult: BatchImportResult
  stats: ImportSummaryStats
}

export function ImportSummary({ importResult, stats }: Props) {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  async function copy(id: string, text: string) {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="space-y-8">
      {/* Result banner */}
      <div className="flex items-center gap-4 bg-green-50 border border-green-200 rounded-xl p-5">
        <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shrink-0">
          <CheckCircle className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="text-lg font-bold text-green-800">Importação concluída!</p>
          <p className="text-sm text-green-700 mt-0.5">
            <strong>{importResult.imported}</strong> conta{importResult.imported !== 1 ? "s" : ""} importada{importResult.imported !== 1 ? "s" : ""} com sucesso.
            {importResult.skipped > 0 && ` ${importResult.skipped} ignorada${importResult.skipped > 1 ? "s" : ""} (duplicatas ou já existentes).`}
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          <Link href="/accounts">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Ver contas
            </Button>
          </Link>
          <Link href="/pipeline">
            <Button size="sm" className="gap-1.5">
              Pipeline
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {importResult.errors.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
          <p className="text-sm font-semibold text-destructive mb-2">Erros durante importação:</p>
          {importResult.errors.map((e, i) => (
            <p key={i} className="text-xs text-destructive">{e}</p>
          ))}
        </div>
      )}

      {/* Action plan */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* SDR targets */}
        {stats.sdrTargets.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              SDR — Reativação & Cold Outreach
            </h3>
            <div className="space-y-2">
              {stats.sdrTargets.slice(0, 8).map((row, i) => (
                <div key={i} className="flex items-center gap-2 p-2.5 bg-card border rounded-md">
                  <span className="text-xs font-bold text-muted-foreground w-4 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{row.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {row.status === "inactive" ? "Inativo" : "Sem contato recente"}
                      {row.estimated_value ? ` · R$ ${row.estimated_value.toFixed(0)}` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Closer targets */}
        {stats.closerTargets.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Closer — Upsell & Alto Valor
            </h3>
            <div className="space-y-2">
              {stats.closerTargets.slice(0, 8).map((row, i) => (
                <div key={i} className="flex items-center gap-2 p-2.5 bg-card border rounded-md">
                  <span className="text-xs font-bold text-muted-foreground w-4 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{row.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {row._score === "upsell" ? "Upsell" : "Alto valor"}
                      {row.estimated_value ? ` · R$ ${row.estimated_value.toFixed(0)}` : ""}
                    </p>
                  </div>
                  {row.estimated_value && row.estimated_value > 5000 && (
                    <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full shrink-0">
                      ⭐ Priority
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Message templates */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
          Sugestões de Mensagem WhatsApp
        </h3>

        {[
          { key: "reactivation", label: "Reativação", color: "text-red-600" },
          { key: "upsell",       label: "Upsell",      color: "text-emerald-600" },
          { key: "followUp",     label: "Follow-up",   color: "text-blue-600" },
        ].map(({ key, label, color }) => {
          const msgs = stats.messages[key] ?? []
          if (!msgs.length) return null
          return (
            <div key={key} className="mb-4">
              <p className={cn("text-xs font-semibold mb-2", color)}>{label}</p>
              <div className="space-y-2">
                {msgs.map((msg, i) => {
                  const id = `${key}_${i}`
                  const isCopied = copiedId === id
                  return (
                    <div key={id} className="bg-card border rounded-md p-3 flex gap-3">
                      <MessageSquare className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                      <p className="flex-1 text-xs text-muted-foreground leading-relaxed">{msg}</p>
                      <button
                        type="button"
                        onClick={() => copy(id, msg)}
                        className={cn(
                          "shrink-0 flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded transition-colors",
                          isCopied
                            ? "text-green-700 bg-green-50"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                      >
                        {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {isCopied ? "Copiado" : "Copiar"}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
