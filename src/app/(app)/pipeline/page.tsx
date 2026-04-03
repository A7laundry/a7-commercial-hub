"use client"

import { useState, useTransition, useEffect } from "react"
import { useTenant } from "@/hooks/useTenant"
import { usePipeline } from "@/hooks/pipeline/usePipeline"
import { useDeals, useDealsRefetch, DEAL_STAGE_CONFIG } from "@/hooks/deals/useDeals"
import type { DealStage } from "@/types"
import { KanbanBoard } from "@/components/modules/pipeline/KanbanBoard"
import { DealsKanban } from "@/components/modules/deals/DealsKanban"
import { CreateDealDialog } from "@/components/modules/deals/CreateDealDialog"
import { checkAutomationTriggers } from "./actions"
import { Button } from "@/components/ui/button"
import { RefreshCw, Zap, Plus } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

const PIPELINE_STAGE_LABEL: Record<string, string> = {
  lead:        "Lead",
  in_service:  "Em serviço",
  quote_sent:  "Proposta enviada",
  negotiating: "Negociando",
  closed:      "Fechado",
  recurring:   "Recorrente",
}

export default function PipelinePage() {
  const { tenant } = useTenant()
  // isPending (not isLoading) is SSR-safe in React Query v5:
  // isLoading = isPending && isFetching — isFetching is false on server, so isLoading=false server-side
  // isPending = status==='pending' — true on both server and client when no cached data → consistent render
  const { data: pipelineData, isPending: pipelineLoading, refetch: refetchPipeline } = usePipeline(tenant.id)
  const { data: dealsData, isPending: dealsLoading, refetch: refetchDeals } = useDeals(tenant.id)
  const invalidateDeals = useDealsRefetch(tenant.id)

  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const [activeTab, setActiveTab] = useState<"contas" | "oportunidades">("contas")
  const [createDealOpen, setCreateDealOpen] = useState(false)
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

  const isLoading = !mounted || (activeTab === "contas" ? pipelineLoading : dealsLoading)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        {mounted
          ? (activeTab === "contas" ? "Carregando pipeline..." : "Carregando oportunidades...")
          : "Carregando pipeline..."}
      </div>
    )
  }

  const pipelineStats = pipelineData?.stats
  const dealsStats = dealsData?.stats

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-background shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Pipeline (Carteira)</h1>

            {/* Stats line per active tab */}
            {activeTab === "contas" && !pipelineStats && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Gestão de carteira · Acompanhe o relacionamento com seus clientes
              </p>
            )}
            {activeTab === "contas" && pipelineStats && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {pipelineStats.totalAccounts} clientes ·{" "}
                <span className="text-green-600 font-medium">
                  {formatCurrency(pipelineStats.totalEstimatedValue, "BRL")} estimado
                </span>
              </p>
            )}
            {activeTab === "oportunidades" && dealsStats && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {dealsStats.total} oportunidades ·{" "}
                <span className="text-green-600 font-medium">
                  {formatCurrency(dealsStats.totalValue, "BRL")} em pipeline
                </span>
                {dealsStats.conversionRate > 0 && (
                  <> · <span className="text-blue-600 font-medium">{dealsStats.conversionRate}% conversão</span></>
                )}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {triggerResult !== null && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
                {triggerResult.count} gatilho{triggerResult.count !== 1 ? "s" : ""} detectado{triggerResult.count !== 1 ? "s" : ""}
              </span>
            )}

            {activeTab === "contas" && (
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
            )}

            {activeTab === "oportunidades" && (
              <Button
                size="sm"
                onClick={() => setCreateDealOpen(true)}
                className="gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Nova Oportunidade
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => activeTab === "contas" ? refetchPipeline() : refetchDeals()}
              className="gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Stage summary bar */}
        {activeTab === "contas" && pipelineStats && (
          <div className="flex gap-4 mt-3 overflow-x-auto pb-0.5">
            {Object.entries(pipelineStats.byStage).map(([stage, s]) => (
              <div key={stage} className="shrink-0 text-center">
                <div className="text-xs text-muted-foreground">
                  {PIPELINE_STAGE_LABEL[stage] ?? stage}
                </div>
                <div className="text-sm font-semibold">{s.count}</div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "oportunidades" && dealsStats && (
          <div className="flex gap-4 mt-3 overflow-x-auto pb-0.5">
            {Object.entries(dealsStats.byStage).map(([stage, s]) => (
              <div key={stage} className="shrink-0 text-center">
                <div className="text-xs text-muted-foreground">
                  {DEAL_STAGE_CONFIG[stage as DealStage]?.label ?? stage}
                </div>
                <div className="text-sm font-semibold">{s.count}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tab switcher */}
        <div className="mt-3 flex gap-1 bg-muted p-1 rounded-lg w-fit">
          {(["contas", "oportunidades"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={[
                "px-3 py-1 text-sm rounded-md transition-colors",
                activeTab === tab
                  ? "bg-background text-foreground shadow-sm font-medium"
                  : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {tab === "contas" ? "Contas" : "Oportunidades"}
            </button>
          ))}
        </div>
      </div>

      {/* Board area */}
      <div className="flex-1 overflow-hidden px-6 py-4">
        {activeTab === "contas" && pipelineData?.board && (
          <KanbanBoard board={pipelineData.board} />
        )}
        {activeTab === "oportunidades" && dealsData?.board && (
          <DealsKanban
            board={dealsData.board}
            onRefetch={() => {
              refetchDeals()
              invalidateDeals()
            }}
          />
        )}
      </div>

      {/* Create deal dialog — mounted only when open to avoid SSR portal mismatch */}
      {createDealOpen && (
        <CreateDealDialog
          open={createDealOpen}
          onOpenChange={setCreateDealOpen}
          tenantId={tenant.id}
          onCreated={() => {
            refetchDeals()
            invalidateDeals()
          }}
        />
      )}
    </div>
  )
}
