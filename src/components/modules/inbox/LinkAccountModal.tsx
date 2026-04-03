"use client"

import { useState, useTransition } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useTenant } from "@/hooks/useTenant"
import { useAccounts } from "@/hooks/accounts/useAccounts"
import { mapPhoneToAccount, createAccountFromInbox } from "@/app/(app)/inbox/actions"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Plus, Building2, CheckCircle2, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const PIPELINE_LABEL: Record<string, string> = {
  lead: "Lead", in_service: "Em serviço", quote_sent: "Proposta enviada",
  negotiating: "Negociando", closed: "Fechado", recurring: "Recorrente",
}

type Props = {
  phone: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onLinked: (accountId: string, accountName: string) => void
}

export function LinkAccountModal({ phone, open, onOpenChange, onLinked }: Props) {
  const { tenant } = useTenant()
  const qc = useQueryClient()
  const [search, setSearch] = useState("")
  const [createMode, setCreateMode] = useState(false)
  const [newName, setNewName] = useState("")
  const [isPending, startTransition] = useTransition()
  const [linkedId, setLinkedId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const { data: accounts = [], isPending: searching } = useAccounts(tenant.id, {
    search: search.length >= 1 ? search : undefined,
  })

  const displayAccounts = search ? accounts : accounts.slice(0, 8)

  function handleLink(accountId: string, accountName: string) {
    setErrorMsg(null)
    startTransition(async () => {
      const result = await mapPhoneToAccount(phone, accountId)
      if (result.error) {
        setErrorMsg(result.error)
        return
      }
      setLinkedId(accountId)
      qc.invalidateQueries({ queryKey: ["inbox", tenant.id] })
      qc.invalidateQueries({ queryKey: ["accounts", tenant.id, accountId] })
      qc.invalidateQueries({ queryKey: ["whatsapp", tenant.id, accountId] })
      setTimeout(() => {
        onLinked(accountId, accountName)
        onOpenChange(false)
        setLinkedId(null)
        setSearch("")
      }, 600)
    })
  }

  function handleCreate() {
    if (!newName.trim()) return
    setErrorMsg(null)
    startTransition(async () => {
      const result = await createAccountFromInbox(phone, newName)
      if (result.error) {
        setErrorMsg(result.error)
        return
      }
      if (result.accountId) {
        qc.invalidateQueries({ queryKey: ["inbox", tenant.id] })
        qc.invalidateQueries({ queryKey: ["accounts", tenant.id] })
        onLinked(result.accountId, newName)
        onOpenChange(false)
        setNewName("")
        setCreateMode(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">
            Vincular {phone} a uma conta
          </DialogTitle>
        </DialogHeader>

        {errorMsg && (
          <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
            {errorMsg}
          </p>
        )}

        {!createMode ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar conta por nome..."
                className="pl-9"
                autoFocus
              />
            </div>

            <div className="space-y-1 max-h-64 overflow-y-auto">
              {searching && search ? (
                <div className="flex items-center justify-center py-6 text-muted-foreground text-sm gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Buscando...
                </div>
              ) : displayAccounts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Nenhuma conta encontrada
                </p>
              ) : (
                displayAccounts.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    disabled={isPending}
                    onClick={() => handleLink(acc.id, acc.name)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-left transition-colors",
                      "hover:bg-muted/50 disabled:opacity-60",
                      linkedId === acc.id && "border-green-300 bg-green-50"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{acc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {PIPELINE_LABEL[acc.pipeline_stage] ?? acc.pipeline_stage}
                        </p>
                      </div>
                    </div>
                    {linkedId === acc.id ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                    ) : (
                      <span className="text-xs text-primary font-medium shrink-0">
                        {isPending ? "..." : "Vincular"}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>

            <div className="pt-1 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="w-full gap-2 text-muted-foreground"
                onClick={() => setCreateMode(true)}
              >
                <Plus className="w-4 h-4" />
                Criar nova conta para este número
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Criar nova conta com o número <span className="font-mono text-foreground">{phone}</span>
            </p>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nome da conta ou empresa..."
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate() }}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCreateMode(false)}
                disabled={isPending}
              >
                Voltar
              </Button>
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={isPending || !newName.trim()}
                className="flex-1 gap-2"
              >
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Criar e vincular
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
