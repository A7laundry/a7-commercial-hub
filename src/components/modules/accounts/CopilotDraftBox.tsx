"use client"

/**
 * CopilotDraftBox — UI do operador pra gerar e usar sugestão de resposta IA.
 *
 * Aparece dentro da página da Account (perto do WhatsAppTimeline).
 * Operador clica "Gerar sugestão" → recebe draft → clica "Usar" → texto é
 * copiado pro clipboard + emite evento custom pro form de envio capturar.
 *
 * Feature flag: só renderiza se NEXT_PUBLIC_AI_COPILOT_ENABLED=true.
 * (server-side AI_COPILOT_ENABLED é o gate real; este é só pra esconder UI)
 */

import { useState } from "react"
import { Sparkles, RefreshCcw, Copy, Check, AlertCircle, ArrowDownToLine } from "lucide-react"
import { useGenerateDraft } from "@/hooks/ai-copilot/useGenerateDraft"
import type { CopilotResult } from "@/lib/ai-copilot"

interface Props {
  accountId: string
  /** Callback opcional — chamado quando operador clica "Usar". Recebe o texto do draft. */
  onUseDraft?: (text: string) => void
}

export function CopilotDraftBox({ accountId, onUseDraft }: Props) {
  const [hint, setHint] = useState("")
  const [copied, setCopied] = useState(false)
  const { mutate, data, isPending, error, reset } = useGenerateDraft()

  // Feature flag client-side (não é gate real — apenas oculta UI)
  if (process.env.NEXT_PUBLIC_AI_COPILOT_ENABLED !== "true") {
    return null
  }

  function handleGenerate() {
    setCopied(false)
    mutate({ account_id: accountId, operator_hint: hint.trim() || undefined })
  }

  function handleUse() {
    if (!data?.draft) return
    navigator.clipboard.writeText(data.draft).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    onUseDraft?.(data.draft)
  }

  function handleRegenerate() {
    reset()
    handleGenerate()
  }

  return (
    <div className="bg-gradient-to-br from-[#022448]/3 to-[#F5A623]/5 rounded-xl border border-[#F5A623]/20 p-4 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#F5A623]/15">
            <Sparkles className="w-4 h-4 text-[#F5A623]" />
          </div>
          <h3 className="text-sm font-extrabold text-[#022448]">
            Copiloto IA · sugestão de resposta
          </h3>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#F5A623]">
          Beta
        </span>
      </div>

      {/* Hint input */}
      <div className="mb-3">
        <label className="text-[11px] font-semibold text-[#022448]/70 mb-1 block">
          Hint pro copiloto (opcional)
        </label>
        <input
          type="text"
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          disabled={isPending}
          placeholder="ex: oferecer foto, confirmar valor, follow-up de 24h…"
          className="w-full text-sm px-3 py-2 rounded-lg border border-[#022448]/15 bg-white focus:outline-none focus:ring-2 focus:ring-[#F5A623]/40 disabled:opacity-50"
        />
      </div>

      {/* CTA principal */}
      {!data && (
        <button
          onClick={handleGenerate}
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 bg-[#F5A623] hover:bg-[#D48C1D] disabled:opacity-50 text-white font-bold text-sm px-4 py-2.5 rounded-lg transition-colors"
        >
          <Sparkles className={`w-4 h-4 ${isPending ? "animate-pulse" : ""}`} />
          {isPending ? "Gerando…" : "Gerar sugestão"}
        </button>
      )}

      {/* Erro */}
      {error && (
        <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="text-[11px] text-red-700 flex-1">
            <p className="font-semibold mb-0.5">Erro ao gerar sugestão</p>
            <p className="text-red-600/80">{error.message}</p>
          </div>
        </div>
      )}

      {/* Resultado */}
      {data && <DraftResult data={data} copied={copied} onUse={handleUse} onRegenerate={handleRegenerate} />}
    </div>
  )
}

function DraftResult({
  data,
  copied,
  onUse,
  onRegenerate,
}: {
  data: CopilotResult
  copied: boolean
  onUse: () => void
  onRegenerate: () => void
}) {
  // Caso ESCALAR
  if (data.escalate) {
    return (
      <div className="space-y-3">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-[11px] font-bold text-amber-900 uppercase tracking-wider mb-1">
                IA recomendou escalar
              </p>
              <p className="text-sm text-amber-900">{data.escalate_reason}</p>
              <p className="text-[11px] text-amber-700 mt-2 italic">
                Responda você direto — caso fora do padrão.
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={onRegenerate}
          className="w-full flex items-center justify-center gap-1.5 text-[11px] font-semibold text-[#022448] hover:text-[#F5A623] py-1.5 transition-colors"
        >
          <RefreshCcw className="w-3 h-3" /> Tentar novamente
        </button>
      </div>
    )
  }

  // Caso normal: draft pronto
  return (
    <div className="space-y-3">
      {/* Racional */}
      <div className="text-[11px] text-[#022448]/70 italic flex items-start gap-1.5">
        <span className="font-bold uppercase tracking-wider text-[10px] text-[#F5A623] shrink-0 mt-0.5">
          Racional
        </span>
        <span>{data.reasoning}</span>
      </div>

      {/* Draft */}
      <div className="bg-white border border-[#022448]/10 rounded-lg p-3 text-sm text-[#022448] whitespace-pre-wrap leading-relaxed">
        {data.draft}
      </div>

      {/* Ações */}
      <div className="flex items-center gap-2">
        <button
          onClick={onUse}
          className="flex-1 flex items-center justify-center gap-2 bg-[#022448] hover:bg-[#022448]/90 text-white font-bold text-sm px-4 py-2 rounded-lg transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" /> Copiado!
            </>
          ) : (
            <>
              <ArrowDownToLine className="w-4 h-4" /> Usar este draft
            </>
          )}
        </button>
        <button
          onClick={onRegenerate}
          className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-[#022448]/70 hover:text-[#F5A623] px-3 py-2 transition-colors"
          title="Gerar de novo com outro racional"
        >
          <RefreshCcw className="w-3 h-3" /> Regenerar
        </button>
      </div>

      {/* Métricas (footer discreto) */}
      <div className="flex items-center justify-between text-[9px] text-[#022448]/40 pt-2 border-t border-[#022448]/5">
        <span>{data.model_used}</span>
        <span>
          {data.tokens_input + data.tokens_output} tok
          {data.cache_read_tokens > 0 && ` · cache ${data.cache_read_tokens}`}
        </span>
      </div>
    </div>
  )
}

// Helper export pra UI integration (opcional uso futuro)
export { Copy }
