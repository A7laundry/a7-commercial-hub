"use client"

import { useState, useTransition } from "react"
import { useTenant } from "@/hooks/useTenant"
import { useCampaigns } from "@/hooks/campaigns/useCampaigns"
import { useQueryClient } from "@tanstack/react-query"
import { createCampaign } from "./actions"
import { AccountSelector } from "@/components/modules/campaigns/AccountSelector"
import { CampaignComposer } from "@/components/modules/campaigns/CampaignComposer"
import { CampaignCard } from "@/components/modules/campaigns/CampaignCard"
import { CampaignDashboard } from "@/components/modules/campaigns/CampaignDashboard"
import { PageHeader } from "@/components/shared/PageHeader"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Megaphone, Send, X, History, BarChart2 } from "lucide-react"
import type { CampaignType } from "@/types"

type Toast = { msg: string; ok: boolean } | null

export default function CampaignsPage() {
  const { tenant } = useTenant()
  const qc = useQueryClient()
  const { data: campaigns = [], isPending: isLoading } = useCampaigns(tenant.id)

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [composing, setComposing] = useState(false)
  const [toast, setToast] = useState<Toast>(null)
  const [isPending, startTransition] = useTransition()
  const [view, setView] = useState<"selector" | "history" | "dashboard">("selector")

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  function handleConfirm(payload: { name: string; type: CampaignType; message: string }) {
    startTransition(async () => {
      const result = await createCampaign({
        name: payload.name,
        type: payload.type,
        message_template: payload.message,
        account_ids: Array.from(selected),
      })
      if (result.error) {
        showToast(result.error, false)
      } else {
        qc.invalidateQueries({ queryKey: ["campaigns", tenant.id] })
        showToast(`Campanha criada com ${selected.size} destinatários!`, true)
        setSelected(new Set())
        setComposing(false)
        setView("history")
      }
    })
  }

  function handleCancel() {
    setComposing(false)
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Campanhas"
        description="Selecione clientes e dispare campanhas de WhatsApp"
      />

      {/* View toggle */}
      <div className="px-6 pb-3 flex items-center gap-2">
        <Button
          variant={view === "selector" ? "default" : "outline"}
          size="sm"
          onClick={() => { setView("selector"); setComposing(false) }}
          className="gap-2"
        >
          <Megaphone className="w-3.5 h-3.5" />
          Nova campanha
        </Button>
        <Button
          variant={view === "history" ? "default" : "outline"}
          size="sm"
          onClick={() => setView("history")}
          className="gap-2"
        >
          <History className="w-3.5 h-3.5" />
          Histórico
          {campaigns.length > 0 && (
            <span className="ml-1 text-[10px] bg-primary/20 text-primary rounded-full px-1.5 py-0.5">
              {campaigns.length}
            </span>
          )}
        </Button>
        <Button
          variant={view === "dashboard" ? "default" : "outline"}
          size="sm"
          onClick={() => setView("dashboard")}
          className="gap-2"
        >
          <BarChart2 className="w-3.5 h-3.5" />
          Dashboard
        </Button>
      </div>

      {/* Main content */}
      <div className="flex-1 px-6 pb-6 overflow-hidden">
        {view === "selector" ? (
          <div className="h-full flex gap-4">
            {/* Left: Account selector */}
            <div className={cn(
              "flex flex-col transition-all duration-300",
              composing ? "w-1/2" : "w-full"
            )}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold">Base de clientes</h2>
                {selected.size > 0 && !composing && (
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setComposing(true)}
                  >
                    <Send className="w-3.5 h-3.5" />
                    Criar campanha com {selected.size} clientes
                  </Button>
                )}
                {composing && (
                  <span className="text-xs text-muted-foreground">
                    {selected.size} selecionados
                  </span>
                )}
              </div>
              <div className="flex-1 overflow-hidden bg-card border rounded-lg p-3">
                <AccountSelector
                  tenantId={tenant.id}
                  selected={selected}
                  onSelectionChange={setSelected}
                />
              </div>
            </div>

            {/* Right: Campaign composer */}
            {composing && (
              <div className="w-1/2 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold">Compor campanha</h2>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto bg-card border rounded-lg p-4">
                  <CampaignComposer
                    selectedCount={selected.size}
                    onConfirm={handleConfirm}
                    onCancel={handleCancel}
                    isPending={isPending}
                  />
                </div>
              </div>
            )}
          </div>
        ) : view === "dashboard" ? (
          <div className="overflow-y-auto pb-6">
            <CampaignDashboard />
          </div>
        ) : (
          /* History view */
          <div className="max-w-3xl space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-muted/40 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : campaigns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Megaphone className="w-10 h-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Nenhuma campanha criada ainda</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Selecione clientes na aba Nova Campanha para começar.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setView("selector")}
                >
                  Criar primeira campanha
                </Button>
              </div>
            ) : (
              campaigns.map((c) => (
                <CampaignCard
                  key={c.id}
                  campaign={c}
                  onToast={showToast}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all",
            toast.ok
              ? "bg-green-600 text-white"
              : "bg-destructive text-destructive-foreground"
          )}
        >
          {toast.msg}
        </div>
      )}
    </div>
  )
}
