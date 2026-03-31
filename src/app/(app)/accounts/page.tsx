"use client"

import { useState } from "react"
import { Plus, Building2, Search } from "lucide-react"
import { useTenant } from "@/hooks/useTenant"
import { useAccounts } from "@/hooks/accounts/useAccounts"
import { useQueryClient } from "@tanstack/react-query"
import { createAccount } from "./actions"
import { AccountsTable } from "@/components/modules/accounts/AccountsTable"
import { AccountForm } from "@/components/modules/accounts/AccountForm"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import type { Account } from "@/types"

export default function AccountsPage() {
  const { tenant } = useTenant()
  const qc = useQueryClient()
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<Account["status"] | "all">("all")
  const [creating, setCreating] = useState(false)

  const { data: accounts = [], isLoading, error } = useAccounts(tenant.id, {
    search,
    status,
  })

  function handleSuccess() {
    setCreating(false)
    qc.invalidateQueries({ queryKey: ["accounts", tenant.id] })
  }

  return (
    <div>
      <PageHeader
        title="Contas"
        description="Gerencie seus clientes e parceiros"
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nova conta
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar contas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => setStatus(v as Account["status"] | "all")}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="prospect">Prospect</SelectItem>
            <SelectItem value="inactive">Inativo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {error ? (
        <p className="text-sm text-destructive">Erro ao carregar contas.</p>
      ) : !isLoading && accounts.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Nenhuma conta encontrada"
          description={
            search || status !== "all"
              ? "Tente ajustar os filtros."
              : "Crie sua primeira conta para começar."
          }
          action={
            !search && status === "all" ? (
              <Button size="sm" onClick={() => setCreating(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Nova conta
              </Button>
            ) : undefined
          }
        />
      ) : (
        <AccountsTable accounts={accounts} isLoading={isLoading} />
      )}

      {/* Create dialog */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova conta</DialogTitle>
          </DialogHeader>
          <AccountForm
            action={createAccount}
            onSuccess={handleSuccess}
            onCancel={() => setCreating(false)}
            submitLabel="Criar conta"
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
