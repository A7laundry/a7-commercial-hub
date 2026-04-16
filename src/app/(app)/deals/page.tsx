"use client"

import { useState } from "react"
import { useTenant } from "@/hooks/useTenant"
import { useDeals, useDealsRefetch, DEAL_STAGE_CONFIG } from "@/hooks/deals/useDeals"
import type { DealStage } from "@/types"
import { DealsKanban } from "@/components/modules/deals/DealsKanban"
import { CreateDealDialog } from "@/components/modules/deals/CreateDealDialog"
import { Button } from "@/components/ui/button"
import { RefreshCw, Plus, Target } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

export default function DealsPage() {
  const { tenant } = useTenant()
  const { data: dealsData, isPending: dealsLoading, refetch: refetchDeals } = useDeals(tenant.id)
  const invalidateDeals = useDealsRefetch(tenant.id)

  const [createDealOpen, setCreateDealOpen] = useState(false)

  const isLoading = dealsLoading

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Carregando oportunidades...
      </div>
    )
  }

  const stats = dealsData?.stats

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-background shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold font-headline text-[#022448]">Oportunidades</h1>
            {!stats && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Funil de vendas · Do primeiro contato ao fechamento
              </p>
            )}
            {stats && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {stats.total} oportunidade{stats.total !== 1 ? "s" : ""} ·{" "}
                <span className="text-green-600 font-medium">
                  {formatCurrency(stats.totalValue, "BRL")} em pipeline
                </span>
                {stats.conversionRate > 0 && (
                  <> · <span className="text-blue-600 font-medium">{stats.conversionRate}% conversão</span></>
                )}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setCreateDealOpen(true)}
              className="gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Nova Oportunidade
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { refetchDeals(); invalidateDeals() }}
              className="gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Atualizar
            </Button>
          </div>
        </div>

        {stats && (
          <div className="flex gap-4 mt-3 overflow-x-auto pb-0.5">
            {Object.entries(stats.byStage).map(([stage, s]) => (
              <div key={stage} className="shrink-0 text-center">
                <div className="text-xs text-muted-foreground">
                  {DEAL_STAGE_CONFIG[stage as DealStage]?.label ?? stage}
                </div>
                <div className="text-sm font-semibold">{s.count}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Board */}
      <div className="flex-1 overflow-hidden px-6 py-4">
        {dealsData?.board ? (
          <DealsKanban
            board={dealsData.board}
            tenantId={tenant.id}
            onRefetch={() => {
              refetchDeals()
              invalidateDeals()
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4 max-w-sm mx-auto">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Target className="w-6 h-6 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Você ainda não tem oportunidades.</p>
              <p className="text-sm text-muted-foreground">
                Crie sua primeira oportunidade agora e comece a organizar seu funil de vendas.
              </p>
            </div>
            <Button onClick={() => setCreateDealOpen(true)} className="gap-1.5">
              <Plus className="w-4 h-4" />
              Criar primeira oportunidade
            </Button>
          </div>
        )}
      </div>

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
