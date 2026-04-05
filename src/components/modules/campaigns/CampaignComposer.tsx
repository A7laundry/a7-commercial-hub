"use client"

import { useState, useEffect } from "react"
import type { CampaignType } from "@/types"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { MessageSquare, Sparkles, Gift, Users, Wallet, Clock } from "lucide-react"

type AudienceStats = {
  count: number
  avgTicket: number | null
  avgDays: number | null
} | null

type Props = {
  selectedCount: number
  audienceStats?: AudienceStats
  onConfirm: (payload: { name: string; type: CampaignType; message: string }) => void
  onCancel: () => void
  isPending: boolean
  defaultType?: CampaignType
}

const CAMPAIGN_TYPE_DESCRIPTIONS: Partial<Record<CampaignType, string>> = {
  reactivation: "Clientes sem contato há mais de 60 dias. Objetivo: reabrir conversa.",
  follow_up:    "Acompanhamento pós-visita ou proposta enviada.",
  upsell:       "Clientes ativos com potencial de ampliar o ticket.",
  renewal:      "Contratos próximos do vencimento que precisam ser renovados.",
  risk:         "Clientes em risco de cancelamento. Agir rápido.",
  acquisition:  "Prospects que ainda não viraram clientes.",
  recurrence:   "Reforço de relacionamento com clientes recorrentes.",
  birthday:     "Mensagem comemorativa com oferta especial.",
  custom:       "Mensagem personalizada sem segmento pré-definido.",
}

const CAMPAIGN_TYPES: { value: CampaignType; label: string; emoji: string; color: string }[] = [
  { value: "reactivation", label: "Reativação",  emoji: "🔴", color: "border-red-300 bg-red-50 text-red-700" },
  { value: "follow_up",    label: "Follow-up",   emoji: "📞", color: "border-blue-300 bg-blue-50 text-blue-700" },
  { value: "upsell",       label: "Upsell",      emoji: "💰", color: "border-emerald-300 bg-emerald-50 text-emerald-700" },
  { value: "renewal",      label: "Renovação",   emoji: "🔄", color: "border-amber-300 bg-amber-50 text-amber-700" },
  { value: "risk",         label: "Retenção",    emoji: "🚨", color: "border-orange-300 bg-orange-50 text-orange-700" },
  { value: "acquisition",  label: "Prospecção",  emoji: "🌱", color: "border-violet-300 bg-violet-50 text-violet-700" },
  { value: "recurrence",   label: "Recorrência", emoji: "⭐", color: "border-cyan-300 bg-cyan-50 text-cyan-700" },
  { value: "birthday",     label: "Aniversário", emoji: "🎂", color: "border-pink-300 bg-pink-50 text-pink-700" },
  { value: "custom",       label: "Livre",       emoji: "✏️", color: "border-slate-300 bg-slate-50 text-slate-700" },
]

const TEMPLATES: Partial<Record<CampaignType, string>> = {
  reactivation: "Olá! Aqui é da equipe A7 Lavanderia. Faz um tempo que não conversamos e gostaríamos de retomar o contato. Temos novidades que podem ser do seu interesse. Tem disponibilidade para uma conversa rápida?",
  follow_up:    "Olá! Passando para dar um alô e verificar se está tudo certo com nossos serviços. Qualquer dúvida ou necessidade, estamos à disposição! 😊",
  upsell:       "Olá! Como nosso parceiro, identificamos uma oportunidade especial para expandir nossa parceria. Gostaria de apresentar uma proposta personalizada para vocês. Podemos conversar ainda essa semana?",
  renewal:      "Olá! Nosso contrato está próximo do vencimento e gostaríamos de garantir a continuidade dos nossos serviços. Podemos conversar sobre a renovação ainda essa semana?",
  risk:         "Olá! Percebemos que pode haver alguns pontos de melhoria no nosso serviço para vocês. Gostaríamos de entender como podemos atender melhor e fortalecer nossa parceria. Podemos conversar?",
  acquisition:  "Olá! Somos da A7 Lavanderia, especialistas em soluções de lavanderia para empresas. Gostaríamos de apresentar como podemos ajudar o seu negócio com serviços de qualidade e preços competitivos. Tem alguns minutos?",
  recurrence:   "Olá! Obrigado por confiar nos nossos serviços regularmente. Seu relacionamento com a A7 é muito importante para nós. Tem algo que podemos fazer para melhorar ainda mais o seu atendimento?",
  birthday:     "Olá! A equipe A7 Lavanderia deseja um ótimo aniversário! Para comemorar, preparamos uma condição especial para vocês. Pode entrar em contato para saber mais? 🎉",
  custom:       "",
}

export function CampaignComposer({ selectedCount, audienceStats, onConfirm, onCancel, isPending, defaultType }: Props) {
  const [name, setName] = useState("")
  const [type, setType] = useState<CampaignType>(defaultType ?? "follow_up")
  const [message, setMessage] = useState(TEMPLATES[defaultType ?? "follow_up"] ?? "")
  const [couponCode, setCouponCode] = useState("")
  const [couponExpiry, setCouponExpiry] = useState("")
  const [showCoupon, setShowCoupon] = useState(false)

  useEffect(() => {
    if (defaultType) {
      setType(defaultType)
      setMessage(TEMPLATES[defaultType] ?? "")
    }
  }, [defaultType])

  function handleTypeChange(t: CampaignType) {
    setType(t)
    if (TEMPLATES[t]) setMessage(TEMPLATES[t]!)
  }

  function buildFinalMessage(): string {
    let msg = message.trim()
    if (showCoupon && couponCode.trim()) {
      const expiry = couponExpiry
        ? ` (válido até ${new Date(couponExpiry).toLocaleDateString("pt-BR")})`
        : ""
      msg += `\n\n🎁 Cupom especial: *${couponCode.trim()}*${expiry}`
    }
    return msg
  }

  const canSubmit = name.trim().length > 0 && message.trim().length > 0

  const currentType = CAMPAIGN_TYPES.find((t) => t.value === type)

  return (
    <div className="space-y-5">
      {/* Audience preview */}
      {audienceStats ? (
        <div className="rounded-lg border bg-gradient-to-r from-primary/5 to-primary/10 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Audiência selecionada</p>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="text-sm font-bold text-primary">{audienceStats.count}</span>
              <span className="text-xs text-muted-foreground">clientes</span>
            </div>
            {audienceStats.avgTicket != null && (
              <div className="flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="text-sm font-bold text-emerald-700">
                  {audienceStats.avgTicket.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
                </span>
                <span className="text-xs text-muted-foreground">ticket médio</span>
              </div>
            )}
            {audienceStats.avgDays != null && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className={cn("text-sm font-bold", audienceStats.avgDays > 30 ? "text-red-600" : "text-amber-700")}>
                  {audienceStats.avgDays}d
                </span>
                <span className="text-xs text-muted-foreground">último contato médio</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
          <MessageSquare className="w-4 h-4" />
          <span><strong className="text-foreground">{selectedCount}</strong> clientes selecionados para esta campanha</span>
        </div>
      )}

      {/* Name */}
      <div className="space-y-2">
        <Label>Nome da campanha</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Reativação Abril, Follow-up Propostas..."
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
                "flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full border transition-all",
                type === t.value
                  ? t.color + " shadow-sm"
                  : "border-border text-muted-foreground hover:bg-muted"
              )}
            >
              <span>{t.emoji}</span>
              {t.label}
            </button>
          ))}
        </div>
        {CAMPAIGN_TYPE_DESCRIPTIONS[type] && (
          <p className="text-[11px] text-muted-foreground pl-1">
            {currentType?.emoji} {CAMPAIGN_TYPE_DESCRIPTIONS[type]}
          </p>
        )}
      </div>

      {/* Message */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Mensagem WhatsApp</Label>
          {TEMPLATES[type] && (
            <button
              type="button"
              onClick={() => setMessage(TEMPLATES[type]!)}
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
          rows={5}
          className="w-full text-sm border rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
          placeholder="Escreva a mensagem que será enviada..."
        />
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground">Variáveis: {"{name}"} {"{service}"}</p>
          <p className="text-xs text-muted-foreground">{message.length} chars</p>
        </div>
      </div>

      {/* Coupon section */}
      <div className="border rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setShowCoupon((v) => !v)}
          className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors"
        >
          <Gift className="w-4 h-4 text-muted-foreground" />
          <span>Adicionar cupom / oferta</span>
          <span className="ml-auto text-muted-foreground text-xs">{showCoupon ? "▲" : "▼"}</span>
        </button>
        {showCoupon && (
          <div className="px-3 pb-3 space-y-3 border-t pt-3 bg-muted/20">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Código do cupom</Label>
                <Input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Ex: A7ABRIL20"
                  className="mt-1 h-8 text-sm font-mono"
                />
              </div>
              <div>
                <Label className="text-xs">Válido até</Label>
                <Input
                  type="date"
                  value={couponExpiry}
                  onChange={(e) => setCouponExpiry(e.target.value)}
                  className="mt-1 h-8 text-sm"
                />
              </div>
            </div>
            {couponCode && (
              <p className="text-xs text-muted-foreground bg-card border rounded px-2 py-1.5">
                Preview: 🎁 Cupom especial: <strong>{couponCode}</strong>
                {couponExpiry && ` (válido até ${new Date(couponExpiry).toLocaleDateString("pt-BR")})`}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button
          onClick={() => onConfirm({ name: name.trim(), type, message: buildFinalMessage() })}
          disabled={!canSubmit || isPending}
          className="gap-2"
        >
          {isPending ? "Criando..." : `Criar campanha (${selectedCount} clientes)`}
        </Button>
      </div>
    </div>
  )
}
