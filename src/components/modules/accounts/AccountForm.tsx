"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import type { Account, PipelineStage, CommercialStatus } from "@/types"

type AccountFormProps = {
  initial?: Partial<Account>
  action: (formData: FormData) => Promise<{ error: string | null }>
  onSuccess: () => void
  onCancel: () => void
  submitLabel?: string
  showCrmFields?: boolean
}

export function AccountForm({
  initial,
  action,
  onSuccess,
  onCancel,
  submitLabel = "Salvar",
  showCrmFields = false,
}: AccountFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<Account["status"]>(initial?.status ?? "active")
  const [pipelineStage, setPipelineStage] = useState<PipelineStage>(initial?.pipeline_stage ?? "lead")
  const [commercialStatus, setCommercialStatus] = useState<CommercialStatus>(initial?.commercial_status ?? "active")
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set("status", status)
    if (showCrmFields) {
      formData.set("pipeline_stage", pipelineStage)
      formData.set("commercial_status", commercialStatus)
    }
    startTransition(async () => {
      const result = await action(formData)
      if (result.error) setError(result.error)
      else { setError(null); onSuccess() }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
      )}

      {showCrmFields ? (
        <Tabs defaultValue="comercial">
          <TabsList className="w-full">
            <TabsTrigger value="comercial" className="flex-1">Comercial</TabsTrigger>
            <TabsTrigger value="cadastro" className="flex-1">Cadastro</TabsTrigger>
          </TabsList>

          {/* ── Aba Comercial ── */}
          <TabsContent value="comercial" className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Estágio no pipeline</Label>
                <Select value={pipelineStage} onValueChange={(v) => setPipelineStage(v as PipelineStage)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="in_service">Em serviço</SelectItem>
                    <SelectItem value="quote_sent">Proposta enviada</SelectItem>
                    <SelectItem value="negotiating">Negociando</SelectItem>
                    <SelectItem value="closed">Fechado</SelectItem>
                    <SelectItem value="recurring">Recorrente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status comercial</Label>
                <Select value={commercialStatus} onValueChange={(v) => setCommercialStatus(v as CommercialStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Saudável</SelectItem>
                    <SelectItem value="at_risk">Em risco</SelectItem>
                    <SelectItem value="lost">Perdido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="estimated_value">Ticket (R$)</Label>
                <Input
                  id="estimated_value"
                  name="estimated_value"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={initial?.estimated_value ?? ""}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="frequency">Frequência</Label>
                <Input
                  id="frequency"
                  name="frequency"
                  defaultValue={initial?.frequency ?? ""}
                  placeholder="Ex: 2x/semana, Mensal"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="last_contact_at">Último contato</Label>
                <Input
                  id="last_contact_at"
                  name="last_contact_at"
                  type="date"
                  defaultValue={initial?.last_contact_at?.slice(0, 10) ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="next_action">Próxima ação</Label>
                <Input
                  id="next_action"
                  name="next_action"
                  defaultValue={initial?.next_action ?? ""}
                  placeholder="Ex: Enviar proposta"
                />
              </div>
            </div>
          </TabsContent>

          {/* ── Aba Cadastro ── */}
          <TabsContent value="cadastro" className="space-y-4 pt-2">
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
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                <Label htmlFor="contact_email">Email</Label>
                <Input
                  id="contact_email"
                  name="contact_email"
                  type="email"
                  defaultValue={initial?.contact_email ?? ""}
                  placeholder="email@empresa.com"
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
          </TabsContent>
        </Tabs>
      ) : (
        /* Modo criação — sem tabs, só cadastro básico */
        <>
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
                <SelectTrigger><SelectValue /></SelectTrigger>
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
              <Label htmlFor="contact_email">Email</Label>
              <Input
                id="contact_email"
                name="contact_email"
                type="email"
                defaultValue={initial?.contact_email ?? ""}
                placeholder="email@empresa.com"
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
        </>
      )}

      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando..." : submitLabel}
        </Button>
      </div>
    </form>
  )
}
