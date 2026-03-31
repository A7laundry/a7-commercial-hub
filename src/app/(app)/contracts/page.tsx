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
import type { Contract } from "@/types"

export default function ContractsPage() {
  const { tenant } = useTenant()
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<Contract["status"] | "all">("all")
  const [creating, setCreating] = useState(false)

  const { data: allContracts = [], isLoading, error } = useContracts(tenant.id)
  const { data: accounts = [] } = useAccounts(tenant.id)

  const contracts =
    statusFilter === "all"
      ? allContracts
      : allContracts.filter((c) => c.status === statusFilter)

  function handleSuccess() {
    setCreating(false)
    qc.invalidateQueries({ queryKey: ["contracts", tenant.id] })
  }

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

      {/* Status filter */}
      <div className="flex items-center gap-3 mb-5">
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
        <p className="text-sm text-destructive">Erro ao carregar contratos.</p>
      ) : !isLoading && contracts.length === 0 ? (
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
      ) : (
        <ContractsTable contracts={contracts} isLoading={isLoading} />
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
