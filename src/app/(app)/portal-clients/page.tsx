"use client"

import { useState, useTransition, useActionState } from "react"
import { useTenant } from "@/hooks/useTenant"
import { usePortalClients } from "@/hooks/usePortalClients"
import { useAccounts } from "@/hooks/accounts/useAccounts"
import { useQueryClient } from "@tanstack/react-query"
import {
  invitePortalClient,
  resendPortalInvite,
  setPortalClientActive,
  deletePortalClient,
} from "./actions"
import { PageHeader } from "@/components/shared/PageHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { cn } from "@/lib/utils"
import {
  UserPlus,
  Send,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Globe,
  Mail,
  Building2,
  CheckCircle,
  XCircle,
} from "lucide-react"

export default function PortalClientsPage() {
  const { tenant } = useTenant()
  const qc = useQueryClient()
  const { data: clients = [], isPending: isLoading } = usePortalClients(tenant.id)
  const { data: accounts = [] } = useAccounts(tenant.id)

  const [inviteOpen, setInviteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [accountId, setAccountId] = useState("")
  const [actionPending, startAction] = useTransition()
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const [inviteState, inviteAction, invitePending] = useActionState(
    async (_prev: { error: string | null }, formData: FormData) => {
      formData.set("account_id", accountId)
      const result = await invitePortalClient(formData)
      if (!result.error) {
        setInviteOpen(false)
        setAccountId("")
        qc.invalidateQueries({ queryKey: ["portal_clients", tenant.id] })
        showToast("Convite enviado com sucesso!", true)
      }
      return result
    },
    { error: null }
  )

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  function handleResend(email: string) {
    startAction(async () => {
      const result = await resendPortalInvite(email)
      showToast(result.error ?? "Link de acesso reenviado!", !result.error)
    })
  }

  function handleToggleActive(id: string, active: boolean) {
    startAction(async () => {
      const result = await setPortalClientActive(id, !active)
      if (!result.error) qc.invalidateQueries({ queryKey: ["portal_clients", tenant.id] })
      showToast(result.error ?? (active ? "Acesso desativado." : "Acesso reativado."), !result.error)
    })
  }

  function handleDelete(id: string) {
    startAction(async () => {
      const result = await deletePortalClient(id)
      if (!result.error) {
        qc.invalidateQueries({ queryKey: ["portal_clients", tenant.id] })
        showToast("Cliente removido do portal.", true)
      } else {
        showToast(result.error, false)
      }
      setDeleteTarget(null)
    })
  }

  return (
    <div>
      <PageHeader
        title="Portal — Clientes"
        actions={
          <Button onClick={() => setInviteOpen(true)} className="gap-2">
            <UserPlus className="w-4 h-4" />
            Convidar cliente
          </Button>
        }
      />

      <p className="text-sm text-muted-foreground mb-6 flex items-center gap-2">
        <Globe className="w-4 h-4" />
        Gerencie quais clientes têm acesso ao Portal do Cliente em{" "}
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">/portal/login</code>
      </p>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border rounded-lg">
          <Globe className="w-10 h-10 mb-3 opacity-20" />
          <p className="text-sm font-medium">Nenhum cliente convidado ainda.</p>
          <p className="text-xs mt-1 opacity-70">
            Clique em "Convidar cliente" para dar acesso ao portal.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 font-medium">Cliente</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Conta vinculada</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Usuário criado</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium">{client.name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Mail className="w-3 h-3" />
                      {client.email}
                    </p>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Building2 className="w-3.5 h-3.5" />
                      {client.account_name}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {client.user_id ? (
                      <span className="flex items-center gap-1 text-green-700 text-xs">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Ativo
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-muted-foreground text-xs">
                        <XCircle className="w-3.5 h-3.5" />
                        Convite pendente
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded-full",
                      client.active
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-500"
                    )}>
                      {client.active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-xs h-7 px-2"
                        disabled={actionPending}
                        onClick={() => handleResend(client.email)}
                        title="Reenviar link de acesso"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span className="hidden lg:inline">Reenviar</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        disabled={actionPending}
                        onClick={() => handleToggleActive(client.id, client.active)}
                        title={client.active ? "Desativar acesso" : "Reativar acesso"}
                      >
                        {client.active
                          ? <ToggleRight className="w-4 h-4 text-green-600" />
                          : <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                        }
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-destructive hover:text-destructive"
                        disabled={actionPending}
                        onClick={() => setDeleteTarget(client.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Convidar cliente para o portal</DialogTitle>
          </DialogHeader>
          <form action={inviteAction} className="space-y-4 mt-2">
            {inviteState.error && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                {inviteState.error}
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email do cliente *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="cliente@empresa.com"
                required
              />
              <p className="text-xs text-muted-foreground">
                Um link de acesso será enviado para este email.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nome (opcional)</Label>
              <Input
                id="name"
                name="name"
                placeholder="Nome do contato"
              />
            </div>

            <div className="space-y-2">
              <Label>Conta vinculada *</Label>
              <Select value={accountId} onValueChange={(v) => setAccountId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta do cliente" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                O cliente verá apenas dados desta conta no portal.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={invitePending || !accountId} className="gap-2">
                {invitePending ? "Enviando..." : (
                  <><Send className="w-3.5 h-3.5" />Enviar convite</>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover acesso ao portal</AlertDialogTitle>
            <AlertDialogDescription>
              Este cliente perderá o acesso ao portal imediatamente. A conta no CRM não será afetada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Toast */}
      {toast && (
        <div className={cn(
          "fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium border transition-all",
          toast.ok
            ? "bg-green-50 border-green-200 text-green-800"
            : "bg-red-50 border-red-200 text-red-800"
        )}>
          {toast.ok
            ? <CheckCircle className="w-4 h-4 shrink-0" />
            : <XCircle className="w-4 h-4 shrink-0" />
          }
          {toast.msg}
        </div>
      )}
    </div>
  )
}
