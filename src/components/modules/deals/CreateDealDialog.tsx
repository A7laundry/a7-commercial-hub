"use client"

import { useState, useTransition, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { createDeal } from "@/app/(app)/deals/actions"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Account = { id: string; name: string }

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  tenantId: string
  onCreated?: () => void
}

export function CreateDealDialog({ open, onOpenChange, tenantId, onCreated }: Props) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [accountSearch, setAccountSearch] = useState("")
  const [accountId, setAccountId] = useState("")
  const [title, setTitle] = useState("")
  const [value, setValue] = useState("")
  const [expectedCloseDate, setExpectedCloseDate] = useState("")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Fetch accounts for the select
  useEffect(() => {
    if (!open) return

    const supabase = createClient()
    supabase
      .from("accounts")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .order("name")
      .limit(500)
      .then(({ data }) => {
        setAccounts((data as Account[]) ?? [])
      })
  }, [open, tenantId])

  function resetForm() {
    setAccountId("")
    setAccountSearch("")
    setTitle("")
    setValue("")
    setExpectedCloseDate("")
    setNotes("")
    setError(null)
  }

  function handleOpenChange(open: boolean) {
    if (!open) resetForm()
    onOpenChange(open)
  }

  const filteredAccounts = accounts.filter((a) =>
    a.name.toLowerCase().includes(accountSearch.toLowerCase())
  )

  function handleSubmit() {
    if (!accountId) { setError("Selecione uma conta"); return }
    if (!title.trim()) { setError("Informe o título da oportunidade"); return }
    setError(null)

    startTransition(async () => {
      const result = await createDeal({
        account_id: accountId,
        title: title.trim(),
        value: value ? Number(value) : null,
        expected_close_date: expectedCloseDate || null,
        notes: notes.trim() || null,
      })

      if (result.error) {
        setError(result.error)
        return
      }

      resetForm()
      onOpenChange(false)
      onCreated?.()
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Oportunidade</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Account select with search */}
          <div className="space-y-1.5">
            <Label htmlFor="deal-account">Conta <span className="text-destructive">*</span></Label>
            <Input
              id="deal-account-search"
              placeholder="Buscar conta..."
              value={accountSearch}
              onChange={(e) => setAccountSearch(e.target.value)}
              className="mb-1"
            />
            <Select value={accountId} onValueChange={(v) => setAccountId(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione a conta..." />
              </SelectTrigger>
              <SelectContent>
                {filteredAccounts.length === 0 && (
                  <div className="py-2 px-3 text-xs text-muted-foreground">
                    Nenhuma conta encontrada
                  </div>
                )}
                {filteredAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="deal-title">Título <span className="text-destructive">*</span></Label>
            <Input
              id="deal-title"
              placeholder="Ex: Contrato de serviços 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Value */}
          <div className="space-y-1.5">
            <Label htmlFor="deal-value">Valor (R$) <span className="text-muted-foreground text-xs">opcional</span></Label>
            <Input
              id="deal-value"
              type="number"
              placeholder="0,00"
              min="0"
              step="0.01"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>

          {/* Expected close date */}
          <div className="space-y-1.5">
            <Label htmlFor="deal-date">Previsão de fechamento <span className="text-muted-foreground text-xs">opcional</span></Label>
            <Input
              id="deal-date"
              type="date"
              value={expectedCloseDate}
              onChange={(e) => setExpectedCloseDate(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="deal-notes">Observações <span className="text-muted-foreground text-xs">opcional</span></Label>
            <textarea
              id="deal-notes"
              className="w-full min-h-[72px] rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50 resize-none"
              placeholder="Contexto ou detalhes relevantes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter showCloseButton={false}>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Criando..." : "Criar oportunidade"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
