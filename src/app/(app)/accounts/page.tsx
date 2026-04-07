"use client"

import { useState } from "react"
import { Plus, LayoutGrid, TableProperties } from "lucide-react"
import { useTenant } from "@/hooks/useTenant"
import { useAccounts } from "@/hooks/accounts/useAccounts"
import { useQueryClient } from "@tanstack/react-query"
import { createAccountFull } from "./actions"
import { AccountCardGrid } from "@/components/modules/accounts/AccountCardGrid"
import { AccountsSpreadsheet } from "@/components/modules/accounts/AccountsSpreadsheet"
import { AccountCreateWizard } from "@/components/modules/accounts/AccountCreateWizard"
import { PageHeader } from "@/components/shared/PageHeader"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

type ViewMode = "cards" | "spreadsheet"

export default function AccountsPage() {
  const { tenant } = useTenant()
  const router = useRouter()
  const qc = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>("cards")
  const [search, setSearch] = useState("")

  const { data: accounts = [], isPending: isLoading } = useAccounts(tenant.id, { search })

  function handleSuccess(accountId: string) {
    qc.invalidateQueries({ queryKey: ["accounts", tenant.id] })
    qc.invalidateQueries({ queryKey: ["accounts_table", tenant.id] })
  }

  const totalClientes = accounts.length
  const totalAtivos = accounts.filter((a) => a.commercial_status === "active").length
  const totalEmRisco = accounts.filter((a) => a.commercial_status === "at_risk").length
  const totalInativos = accounts.filter((a) => a.status === "inactive").length

  return (
    <div className={cn(
      "flex flex-col",
      viewMode === "spreadsheet" ? "h-[calc(100vh-3.5rem)]" : ""
    )}>
      <PageHeader
        title="Clientes"
        description="Gerencie seus clientes e parceiros"
        actions={
          <div className="flex items-center gap-2">
            {/* Search input */}
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-8 px-3 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring w-48"
            />

            {/* View toggle */}
            <div className="flex items-center border rounded-md overflow-hidden">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                title="Cards"
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors",
                  viewMode === "cards"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Cards
              </button>
              <button
                type="button"
                onClick={() => setViewMode("spreadsheet")}
                title="Planilha"
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors",
                  viewMode === "spreadsheet"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <TableProperties className="w-3.5 h-3.5" />
                Planilha
              </button>
            </div>

            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Novo cliente
            </Button>
          </div>
        }
      />

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-4 gap-4 px-6 py-4 bg-background border-b">
        {isLoading ? (
          <>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-card rounded-xl p-4 shadow-[0_24px_40px_rgba(25,28,29,0.03)] border border-transparent"
              >
                <div className="animate-pulse w-20 h-3 bg-slate-200 rounded mb-3" />
                <div className="animate-pulse w-16 h-6 bg-slate-200 rounded" />
              </div>
            ))}
          </>
        ) : (
          <>
            <div className="bg-card rounded-xl p-4 shadow-[0_24px_40px_rgba(25,28,29,0.03)] border border-transparent">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Clientes</p>
              <p className="text-2xl font-extrabold font-headline text-[#022448] mt-1">{totalClientes}</p>
            </div>
            <div className="bg-card rounded-xl p-4 shadow-[0_24px_40px_rgba(25,28,29,0.03)] border border-transparent">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ativos</p>
              <p className="text-2xl font-extrabold font-headline text-emerald-600 mt-1">{totalAtivos}</p>
            </div>
            <div className="bg-card rounded-xl p-4 shadow-[0_24px_40px_rgba(25,28,29,0.03)] border border-transparent">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Em Risco</p>
              <p className="text-2xl font-extrabold font-headline text-amber-500 mt-1">{totalEmRisco}</p>
            </div>
            <div className="bg-card rounded-xl p-4 shadow-[0_24px_40px_rgba(25,28,29,0.03)] border border-transparent">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inativos</p>
              <p className="text-2xl font-extrabold font-headline text-slate-400 mt-1">{totalInativos}</p>
            </div>
          </>
        )}
      </div>

      {/* Content */}
      <div className={cn("flex-1 overflow-hidden", viewMode === "cards" ? "overflow-auto" : "")}>
        {viewMode === "cards" ? (
          <div className="pb-6">
            <AccountCardGrid accounts={accounts} isLoading={isLoading} />
          </div>
        ) : (
          <AccountsSpreadsheet tenantId={tenant.id} />
        )}
      </div>

      {/* Create wizard dialog */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo cliente</DialogTitle>
          </DialogHeader>
          <AccountCreateWizard
            createFn={createAccountFull}
            onSuccess={(accountId) => {
              handleSuccess(accountId)
            }}
            onCancel={() => setCreating(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
