"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Account, Contract } from "@/types"

type ContractFormProps = {
  initial?: Partial<Contract>
  accounts: Account[]
  action: (formData: FormData) => Promise<{ error: string | null }>
  onSuccess: () => void
  onCancel: () => void
  submitLabel?: string
}

export function ContractForm({
  initial,
  accounts,
  action,
  onSuccess,
  onCancel,
  submitLabel = "Salvar",
}: ContractFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [accountId, setAccountId] = useState(initial?.account_id ?? "")
  const [autoRenew, setAutoRenew] = useState(initial?.auto_renew ?? false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set("account_id", accountId)
    formData.set("auto_renew", String(autoRenew))

    startTransition(async () => {
      const result = await action(formData)
      if (result.error) {
        setError(result.error)
      } else {
        setError(null)
        onSuccess()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
          {error}
        </p>
      )}

      <div className="space-y-2">
        <Label>Conta *</Label>
        <Select value={accountId} onValueChange={(v) => setAccountId(v ?? "")} required>
          <SelectTrigger>
            <SelectValue placeholder="Selecionar conta..." />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Título *</Label>
        <Input
          id="title"
          name="title"
          defaultValue={initial?.title}
          required
          placeholder="Ex: Contrato de Lavanderia 2026"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="total_value">Valor total</Label>
          <Input
            id="total_value"
            name="total_value"
            type="number"
            step="0.01"
            min="0"
            defaultValue={initial?.total_value ?? 0}
            placeholder="0.00"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="currency">Moeda</Label>
          <Input
            id="currency"
            name="currency"
            defaultValue={initial?.currency ?? "BRL"}
            maxLength={3}
            placeholder="BRL"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="starts_at">Início *</Label>
          <Input
            id="starts_at"
            name="starts_at"
            type="date"
            defaultValue={initial?.starts_at?.slice(0, 10)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ends_at">Vencimento *</Label>
          <Input
            id="ends_at"
            name="ends_at"
            type="date"
            defaultValue={initial?.ends_at?.slice(0, 10)}
            required
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="auto_renew"
          type="checkbox"
          checked={autoRenew}
          onChange={(e) => setAutoRenew(e.target.checked)}
          className="w-4 h-4 rounded border-border"
        />
        <Label htmlFor="auto_renew" className="font-normal cursor-pointer">
          Renovação automática
        </Label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notas</Label>
        <Textarea
          id="notes"
          name="notes"
          defaultValue={initial?.notes ?? ""}
          rows={3}
          placeholder="Observações sobre o contrato..."
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending || !accountId}>
          {isPending ? "Salvando..." : submitLabel}
        </Button>
      </div>
    </form>
  )
}
