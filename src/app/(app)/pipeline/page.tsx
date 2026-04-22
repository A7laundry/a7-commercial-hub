"use client"

import { useState, useTransition, useEffect } from "react"
import Link from "next/link"
import { useTenant } from "@/hooks/useTenant"
import { usePipeline } from "@/hooks/pipeline/usePipeline"
import { KanbanBoard } from "@/components/modules/pipeline/KanbanBoard"
import { checkAutomationTriggers } from "./actions"
import { Button } from "@/components/ui/button"
import { RefreshCw, Zap, ArrowRight } from "lucide-react"
import { formatCurrencyBR } from "@/lib/format"

const PIPELINE_STAGE_LABEL: Record<string, string> = {
  lead:       "Lead",
  em_contato: "Em contato",
  proposta:   "Proposta",
  sucesso:    "Sucesso",
  cliente:    "Cliente ativo",
  recorrente: "Recorrente",
}

export default function PipelinePage() {
  const { tenant } = useTenant()
  const { data: pipelineData, isPending: pipelineLoading, refetch: refetchPipeline } = usePipeline(tenant.id)

  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const [triggerResult, setTriggerResult] = useState<{ count: number } | null>(null)
  const [isPending, startTransition] = useTransition()

  function runAutomation() {
    startTransition(async () => {
      const result = await checkAutomationTriggers(tenant.id)
      setTriggerResult({ count: result.count })
      refetchPipeline()
      setTimeout(() => setTriggerResult(null), 4000)
    })
  }

  const isLoading = !mounted || pipelineLoading

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Carregando pipeline...
      </div>
    )
  }

  const pipelineStats = pipelineData?.stats

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-background shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold font-headline text-[#022448]">Carteira</h1>

            {!pipelineStats && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Acompanhe o relacionamento e o estágio de cada cliente
              </p>
            )}
            {pipelineStats && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {pipelineStats.totalAccounts} clientes ·{" "}
                <span className="text-green-600 font-medium">
                  {formatCurrencyBR(pipelineStats.closedValue)} em vendas fechadas
                </span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {triggerResult !== null && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
                {triggerResult.count} gatilho{triggerResult.count !== 1 ? "s" : ""} detectado{triggerResult.count !== 1 ? "s" : ""}
              </span>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={runAutomation}
              disabled={isPending}
              className="gap-1.5"
            >
              <Zap className="w-3.5 h-3.5" />
              {isPending ? "Verificando..." : "Automações"}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetchPipeline()}
              className="gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Stage stats cards */}
        {pipelineStats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 px-6 pb-4 mt-3 -mx-6">
            {(["lead", "em_contato", "proposta", "recorrente"] as const).map((stage) => {
              const s = pipelineStats.byStage[stage]
              if (!s) return null
              return (
                <div
                  key={stage}
                  className="bg-card rounded-xl p-4 shadow-[0_24px_40px_rgba(25,28,29,0.03)] border border-transparent"
                >
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {PIPELINE_STAGE_LABEL[stage] ?? stage}
                  </p>
                  <p className="text-2xl font-extrabold font-headline text-[#022448] mt-1">
                    {s.count}
                  </p>
                  <p className="text-xs font-medium text-[#F5A623] mt-0.5">
                    {formatCurrencyBR(s.value)}
                  </p>
                </div>
              )
            })}
            {/* Total carteira summary card */}
            <div className="bg-card rounded-xl p-4 shadow-[0_24px_40px_rgba(25,28,29,0.03)] border border-transparent">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Total Carteira
              </p>
              <p className="text-2xl font-extrabold font-headline text-[#022448] mt-1">
                {pipelineStats.totalAccounts}
              </p>
              <p className="text-xs font-medium text-[#F5A623] mt-0.5">
                {formatCurrencyBR(pipelineStats.closedValue)}
              </p>
            </div>

            <div className="col-span-2 md:col-span-5 flex justify-end -mt-1">
              <Link
                href="/deals"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Ver Oportunidades
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Board area */}
      <div className="flex-1 overflow-hidden px-6 py-4">
        {pipelineData?.board && (
          <KanbanBoard
            board={pipelineData.board}
            tenantId={tenant.id}
            operatorByAccount={pipelineData.operatorByAccount}
          />
        )}
      </div>
    </div>
  )
}
