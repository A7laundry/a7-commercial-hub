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
import type { Account } from "@/types"

type AccountFormProps = {
  initial?: Partial<Account>
  action: (formData: FormData) => Promise<{ error: string | null }>
  onSuccess: () => void
  onCancel: () => void
  submitLabel?: string
}

export function AccountForm({
  initial,
  action,
  onSuccess,
  onCancel,
  submitLabel = "Salvar",
}: AccountFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<Account["status"]>(
    initial?.status ?? "active"
  )
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set("status", status)

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
        <Label htmlFor="name">Nome *</Label>
        <Input
          id="name"
          name="name"
          defaultValue={initial?.name}
          required
          placeholder="Ex: Hospital São Lucas"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="segment">Segmento</Label>
          <Input
            id="segment"
            name="segment"
            defaultValue={initial?.segment ?? ""}
            placeholder="Ex: Hospitalar"
          />
        </div>

        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as Account["status"])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="prospect">Prospect</SelectItem>
              <SelectItem value="inactive">Inativo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="contact_name">Contato</Label>
          <Input
            id="contact_name"
            name="contact_name"
            defaultValue={initial?.contact_name ?? ""}
            placeholder="Nome do responsável"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact_email">Email do contato</Label>
          <Input
            id="contact_email"
            name="contact_email"
            type="email"
            defaultValue={initial?.contact_email ?? ""}
            placeholder="responsavel@empresa.com"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notas</Label>
        <Textarea
          id="notes"
          name="notes"
          defaultValue={initial?.notes ?? ""}
          rows={3}
          placeholder="Observações relevantes..."
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando..." : submitLabel}
        </Button>
      </div>
    </form>
  )
}
