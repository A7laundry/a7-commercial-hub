"use client"

import { useState } from "react"
import type { CampaignType } from "@/types"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { MessageSquare, Sparkles } from "lucide-react"

type Props = {
  selectedCount: number
  onConfirm: (payload: { name: string; type: CampaignType; message: string }) => void
  onCancel: () => void
  isPending: boolean
}

const CAMPAIGN_TYPES: { value: CampaignType; label: string; color: string }[] = [
  { value: "reactivation", label: "Reativação",  color: "border-red-300 bg-red-50 text-red-700" },
  { value: "follow_up",    label: "Follow-up",   color: "border-blue-300 bg-blue-50 text-blue-700" },
  { value: "upsell",       label: "Upsell",      color: "border-emerald-300 bg-emerald-50 text-emerald-700" },
  { value: "renewal",      label: "Renovação",   color: "border-amber-300 bg-amber-50 text-amber-700" },
  { value: "custom",       label: "Personalizada",color: "border-slate-300 bg-slate-50 text-slate-700" },
]

const TEMPLATES: Record<CampaignType, string> = {
  reactivation: "Olá! Tudo bem? Aqui é da equipe comercial. Faz um tempo que não conversamos e gostaríamos de retomar o contato. Temos novidades que podem ser do seu interesse. Tem disponibilidade para uma conversa rápida?",
  follow_up:    "Olá! Passando para dar um alô e verificar se está tudo certo com nossos serviços. Qualquer dúvida ou necessidade, estamos à disposição! 😊",
  upsell:       "Olá! Como nosso cliente, identificamos uma oportunidade especial para expandir nossa parceria. Gostaria de apresentar uma proposta personalizada para vocês. Podemos conversar ainda essa semana?",
  renewal:      "Olá! Nosso contrato está próximo do vencimento e gostaríamos de garantir a continuidade dos nossos serviços. Podemos conversar sobre a renovação ainda essa semana?",
  custom:       "",
}

export function CampaignComposer({ selectedCount, onConfirm, onCancel, isPending }: Props) {
  const [name, setName] = useState("")
  const [type, setType] = useState<CampaignType>("follow_up")
  const [message, setMessage] = useState(TEMPLATES.follow_up)

  function handleTypeChange(t: CampaignType) {
    setType(t)
    if (TEMPLATES[t]) setMessage(TEMPLATES[t])
  }

  const canSubmit = name.trim().length > 0 && message.trim().length > 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
        <MessageSquare className="w-4 h-4" />
        <span><strong className="text-foreground">{selectedCount}</strong> clientes selecionados para esta campanha</span>
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label>Nome da campanha</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Reativação Dezembro, Follow-up Propostas..."
          autoFocus
        />
      </div>

      {/* Type selector */}
      <div className="space-y-2">
        <Label>Tipo</Label>
        <div className="flex flex-wrap gap-2">
          {CAMPAIGN_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => handleTypeChange(t.value)}
              className={cn(
                "text-xs font-medium px-3 py-1.5 rounded-full border transition-all",
                type === t.value
                  ? t.color + " shadow-sm"
                  : "border-border text-muted-foreground hover:bg-muted"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Message */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Mensagem WhatsApp</Label>
          {TEMPLATES[type] && (
            <button
              type="button"
              onClick={() => setMessage(TEMPLATES[type])}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Sparkles className="w-3 h-3" />
              Usar sugestão
            </button>
          )}
        </div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
          className="w-full text-sm border rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
          placeholder="Escreva a mensagem que será enviada para os clientes selecionados..."
        />
        <p className="text-xs text-muted-foreground text-right">{message.length} caracteres</p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button
          onClick={() => onConfirm({ name: name.trim(), type, message: message.trim() })}
          disabled={!canSubmit || isPending}
          className="gap-2"
        >
          {isPending ? "Criando..." : `Criar campanha com ${selectedCount} clientes`}
        </Button>
      </div>
    </div>
  )
}
