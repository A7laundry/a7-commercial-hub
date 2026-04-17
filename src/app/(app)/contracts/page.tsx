"use client"

import { useState } from "react"
import { Plus, FileText } from "lucide-react"
import { useTenant } from "@/hooks/useTenant"
import { useContracts } from "@/hooks/contracts/useContracts"
import { useAccounts } from "@/hooks/accounts/useAccounts"
import { useQueryClient } from "@tanstack/react-query"
import { createContract } from "./actions"
import { ContractsTable } from "@/components/modules/contracts/ContractsTable"
import { ContractForm } from "@/components/modules/contracts/ContractForm"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatCurrencyBR } from "@/lib/format"
import type { Contract } from "@/types"

export default function ContractsPage() {
  const { tenant } = useTenant()
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<Contract["status"] | "all">("all")
  const [creating, setCreating] = useState(false)

  const { data: allContracts = [], isPending: isLoading, error } = useContracts(tenant.id)
  const { data: accounts = [] } = useAccounts(tenant.id)

  const contracts =
    statusFilter === "all"
      ? allContracts
      : allContracts.filter((c) => c.status === statusFilter)

  function handleSuccess() {
    setCreating(false)
    qc.invalidateQueries({ queryKey: ["contracts:list", tenant.id] })
  }

  const totalContracts = allContracts.length
  const totalAtivos = allContracts.filter((c) => c.status === "active").length
  const totalVencendo = allContracts.filter((c) => c.status === "expiring").length
  const totalVencidos = allContracts.filter((c) => c.status === "expired").length
  const valorAtivos = allContracts
    .filter((c) => c.status === "active")
    .reduce((sum, c) => sum + (c.total_value ?? 0), 0)

  return (
    <div>
      <PageHeader
        title="Contratos"
        description="Gerencie contratos de serviço"
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Novo contrato
          </Button>
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
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total</p>
              <p className="text-2xl font-extrabold font-headline text-[#022448] mt-1">{totalContracts}</p>
            </div>
            <div className="bg-card rounded-xl p-4 shadow-[0_24px_40px_rgba(25,28,29,0.03)] border border-transparent">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ativos</p>
              <p className="text-2xl font-extrabold font-headline text-emerald-600 mt-1">{totalAtivos}</p>
              <p className="text-[11px] text-slate-400 mt-0.5 font-medium">{formatCurrencyBR(valorAtivos)}</p>
            </div>
            <div className="bg-card rounded-xl p-4 shadow-[0_24px_40px_rgba(25,28,29,0.03)] border border-transparent">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vencendo</p>
              <p className="text-2xl font-extrabold font-headline text-amber-600 mt-1">{totalVencendo}</p>
            </div>
            <div className="bg-card rounded-xl p-4 shadow-[0_24px_40px_rgba(25,28,29,0.03)] border border-transparent">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vencidos</p>
              <p className="text-2xl font-extrabold font-headline text-red-600 mt-1">{totalVencidos}</p>
            </div>
          </>
        )}
      </div>

      {/* Status filter */}
      <div className="flex items-center gap-3 px-6 py-4">
        <Select
          value={statusFilter}
          onValueChange={(v) =>
            setStatusFilter(v as Contract["status"] | "all")
          }
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="expiring">Vencendo em breve</SelectItem>
            <SelectItem value="expired">Vencidos</SelectItem>
            <SelectItem value="draft">Rascunhos</SelectItem>
            <SelectItem value="cancelled">Cancelados</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {contracts.length} contrato{contracts.length !== 1 ? "s" : ""}
        </span>
      </div>

      {error ? (
        <p className="text-sm text-destructive px-6">Erro ao carregar contratos.</p>
      ) : !isLoading && contracts.length === 0 ? (
        <div className="px-6">
          <EmptyState
            icon={FileText}
            title="Nenhum contrato encontrado"
            description={
              statusFilter !== "all"
                ? "Nenhum contrato com esse status."
                : "Crie seu primeiro contrato para começar."
            }
            action={
              statusFilter === "all" ? (
                <Button size="sm" onClick={() => setCreating(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Novo contrato
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="px-6">
          <ContractsTable contracts={contracts} isLoading={isLoading} />
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo contrato</DialogTitle>
          </DialogHeader>
          <ContractForm
            accounts={accounts}
            action={createContract}
            onSuccess={handleSuccess}
            onCancel={() => setCreating(false)}
            submitLabel="Criar contrato"
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
