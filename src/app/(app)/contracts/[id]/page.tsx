"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Pencil, Trash2 } from "lucide-react"
import { useTenant } from "@/hooks/useTenant"
import { useContract } from "@/hooks/contracts/useContract"
import { useAccounts } from "@/hooks/accounts/useAccounts"
import { useQueryClient } from "@tanstack/react-query"
import { updateContract, deleteContract } from "../actions"
import { ContractForm } from "@/components/modules/contracts/ContractForm"
import { DocumentsList } from "@/components/modules/documents/DocumentsList"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { PageHeader } from "@/components/shared/PageHeader"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { formatCurrency, formatDate } from "@/lib/utils"
import Link from "next/link"

export default function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { tenant } = useTenant()
  const router = useRouter()
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const { data: contract, isPending: isLoading } = useContract(tenant.id, id)
  const { data: accounts = [] } = useAccounts(tenant.id)

  async function handleDelete() {
    await deleteContract(id)
    qc.invalidateQueries({ queryKey: ["contracts", tenant.id] })
    router.push("/contracts")
  }

  function handleEditSuccess() {
    setEditing(false)
    qc.invalidateQueries({ queryKey: ["contracts", tenant.id, id] })
    qc.invalidateQueries({ queryKey: ["contracts", tenant.id] })
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (!contract) {
    return (
      <p className="text-sm text-muted-foreground">Contrato não encontrado.</p>
    )
  }

  return (
    <div>
      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/contracts")}
          className="text-muted-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Contratos
        </Button>
      </div>

      <PageHeader
        title={contract.title}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="w-4 h-4 mr-1" />
              Editar
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setConfirming(true)}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Excluir
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <InfoRow label="Status">
          <StatusBadge status={contract.status} />
        </InfoRow>
        <InfoRow label="Conta">
          <Link
            href={`/accounts/${contract.account_id}`}
            className="text-primary hover:underline"
          >
            {contract.account_name ?? contract.account_id}
          </Link>
        </InfoRow>
        <InfoRow label="Valor total">
          {formatCurrency(contract.total_value, contract.currency)}
        </InfoRow>
        <InfoRow label="Início">{formatDate(contract.starts_at)}</InfoRow>
        <InfoRow label="Vencimento">{formatDate(contract.ends_at)}</InfoRow>
        <InfoRow label="Renovação automática">
          {contract.auto_renew ? "Sim" : "Não"}
        </InfoRow>
        {contract.notes && (
          <div className="col-span-full">
            <InfoRow label="Notas">{contract.notes}</InfoRow>
          </div>
        )}
      </div>

      <Separator className="my-6" />

      {/* Documents section */}
      <DocumentsList tenantId={tenant.id} contractId={id} accountId={contract.account_id} />

      {/* Edit dialog */}
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar contrato</DialogTitle>
          </DialogHeader>
          <ContractForm
            initial={contract}
            accounts={accounts}
            action={(formData) => updateContract(id, formData)}
            onSuccess={handleEditSuccess}
            onCancel={() => setEditing(false)}
            submitLabel="Salvar alterações"
          />
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir contrato</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. O contrato será permanentemente removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function InfoRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-muted/40 rounded-lg p-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <div className="text-sm font-medium">{children}</div>
    </div>
  )
}
