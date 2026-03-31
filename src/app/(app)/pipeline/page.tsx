"use client"

import { useState, useTransition } from "react"
import { useTenant } from "@/hooks/useTenant"
import { usePipeline } from "@/hooks/pipeline/usePipeline"
import { KanbanBoard } from "@/components/modules/pipeline/KanbanBoard"
import { checkAutomationTriggers } from "./actions"
import { Button } from "@/components/ui/button"
import { RefreshCw, Zap } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

export default function PipelinePage() {
  const { tenant } = useTenant()
  const { data, isLoading, refetch } = usePipeline(tenant.id)
  const [triggerResult, setTriggerResult] = useState<{ count: number } | null>(null)
  const [isPending, startTransition] = useTransition()

  function runAutomation() {
    startTransition(async () => {
      const result = await checkAutomationTriggers(tenant.id)
      setTriggerResult({ count: result.count })
      refetch()
      setTimeout(() => setTriggerResult(null), 4000)
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Carregando pipeline...
      </div>
    )
  }

  const stats = data?.stats
  const board = data?.board

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-background shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Pipeline Comercial</h1>
            {stats && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {stats.totalAccounts} contas ·{" "}
                <span className="text-green-600 font-medium">
                  {formatCurrency(stats.totalEstimatedValue, "BRL")} estimado
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
              onClick={() => refetch()}
              className="gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Stage summary bar */}
        {stats && (
          <div className="flex gap-4 mt-3 overflow-x-auto pb-0.5">
            {Object.entries(stats.byStage).map(([stage, s]) => (
              <div key={stage} className="shrink-0 text-center">
                <div className="text-xs text-muted-foreground">{stage.replace("_", " ")}</div>
                <div className="text-sm font-semibold">{s.count}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Board */}
      <div className="flex-1 overflow-hidden px-6 py-4">
        {board && <KanbanBoard board={board} />}
      </div>
    </div>
  )
}
