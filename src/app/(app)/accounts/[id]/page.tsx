"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Pencil, Trash2, BarChart2 } from "lucide-react"
import { useTenant } from "@/hooks/useTenant"
import { useAccount } from "@/hooks/accounts/useAccount"
import { useContracts } from "@/hooks/contracts/useContracts"
import { useQueryClient } from "@tanstack/react-query"
import { updateAccount, deleteAccount } from "../actions"
import { AccountForm } from "@/components/modules/accounts/AccountForm"
import { ContractsTable } from "@/components/modules/contracts/ContractsTable"
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
import Link from "next/link"

export default function AccountDetailPage({
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

  const { data: account, isLoading } = useAccount(tenant.id, id)
  const { data: contracts = [], isLoading: contractsLoading } = useContracts(
    tenant.id,
    { accountId: id }
  )

  async function handleDelete() {
    await deleteAccount(id)
    qc.invalidateQueries({ queryKey: ["accounts", tenant.id] })
    router.push("/accounts")
  }

  function handleEditSuccess() {
    setEditing(false)
    qc.invalidateQueries({ queryKey: ["accounts", tenant.id, id] })
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (!account) {
    return (
      <p className="text-sm text-muted-foreground">Conta não encontrada.</p>
    )
  }

  return (
    <div>
      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/accounts")}
          className="text-muted-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Contas
        </Button>
      </div>

      <PageHeader
        title={account.name}
        actions={
          <div className="flex gap-2">
            <Link href={`/accounts/${id}/summary`}>
              <Button variant="outline" size="sm">
                <BarChart2 className="w-4 h-4 mr-1" />
                Resumo executivo
              </Button>
            </Link>
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

      {/* Info grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <InfoRow label="Status">
          <StatusBadge status={account.status} />
        </InfoRow>
        <InfoRow label="Segmento">{account.segment ?? "—"}</InfoRow>
        <InfoRow label="Contato">{account.contact_name ?? "—"}</InfoRow>
        <InfoRow label="Email">
          {account.contact_email ? (
            <a
              href={`mailto:${account.contact_email}`}
              className="text-primary hover:underline"
            >
              {account.contact_email}
            </a>
          ) : (
            "—"
          )}
        </InfoRow>
        {account.notes && (
          <div className="col-span-full">
            <InfoRow label="Notas">{account.notes}</InfoRow>
          </div>
        )}
      </div>

      <Separator className="my-6" />

      {/* Contracts section */}
      <div>
        <h2 className="text-lg font-semibold mb-4">
          Contratos ({contracts.length})
        </h2>
        {contractsLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : contracts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum contrato vinculado a esta conta.
          </p>
        ) : (
          <ContractsTable contracts={contracts} />
        )}
      </div>

      <Separator className="my-6" />

      {/* Documents section */}
      <DocumentsList tenantId={tenant.id} accountId={id} />

      {/* Edit dialog */}
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar conta</DialogTitle>
          </DialogHeader>
          <AccountForm
            initial={account}
            action={(formData) => updateAccount(id, formData)}
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
            <AlertDialogTitle>Excluir conta</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. Contratos vinculados não serão excluídos
              automaticamente — remova-os antes ou verifique as dependências.
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
