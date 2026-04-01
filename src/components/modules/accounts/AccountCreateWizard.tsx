"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  computeCommercialScore,
  computeNextBestAction,
  SCORE_CONFIG,
} from "@/lib/commercial-intelligence"
import {
  CheckCircle2,
  MessageCircle,
  User,
  Building2,
  ArrowLeft,
  Plus,
  X,
} from "lucide-react"
import type { PipelineStage } from "@/types"

// ── Types ──────────────────────────────────────────────────────────────────────

type ClientType = "pf" | "pj"

export type CreateAccountInput = {
  clientType: ClientType
  name: string
  phone: string
  email: string
  segment?: string
  pipeline_stage?: string
  estimated_value?: string
  frequency?: string
  source?: string
  contact_name?: string
  cnpj?: string
  tags?: string[]
}

type Props = {
  onSuccess: (accountId: string) => void
  onCancel: () => void
  createFn: (
    data: CreateAccountInput
  ) => Promise<{ error: string | null; accountId: string | null; phone: string | null }>
}

type WizardStep = "type" | "essential" | "enrichment" | "success"

type SuccessData = {
  accountId: string
  name: string
  phone: string
}

// ── Constants ──────────────────────────────────────────────────────────────────

const QUICK_TAGS = ["VIP", "Recorrente", "Hospital", "Hotel", "Novo", "Recuperar"]

const SELECT_CLASS =
  "w-full text-sm border rounded-md px-2 py-2 bg-background h-9 focus:outline-none focus:ring-1 focus:ring-primary"

const PIPELINE_OPTIONS: { value: PipelineStage; label: string }[] = [
  { value: "lead", label: "Lead" },
  { value: "in_service", label: "Em serviço" },
  { value: "quote_sent", label: "Proposta" },
  { value: "negotiating", label: "Negociando" },
  { value: "closed", label: "Fechado" },
  { value: "recurring", label: "Recorrente" },
]

// ── Step indicator ─────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: 1 | 2 }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-5">
      <span
        className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold",
          current === 1
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        )}
      >
        1
      </span>
      <span className="text-muted-foreground text-xs">•</span>
      <span
        className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold",
          current === 2
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        )}
      >
        2
      </span>
    </div>
  )
}

// ── Tag section ────────────────────────────────────────────────────────────────

function TagSection({
  tags,
  onChange,
}: {
  tags: string[]
  onChange: (tags: string[]) => void
}) {
  const [customInput, setCustomInput] = useState("")
  const [showInput, setShowInput] = useState(false)

  function toggleTag(tag: string) {
    if (tags.includes(tag)) {
      onChange(tags.filter((t) => t !== tag))
    } else {
      onChange([...tags, tag])
    }
  }

  function addCustom() {
    const trimmed = customInput.trim()
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed])
    }
    setCustomInput("")
    setShowInput(false)
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag))
  }

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium">Tags</span>
      <div className="flex flex-wrap gap-1.5">
        {QUICK_TAGS.map((tag) => {
          const selected = tags.includes(tag)
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={cn(
                "text-xs px-2.5 py-1 rounded-full border transition-colors",
                selected
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted text-muted-foreground border-transparent hover:border-primary/40"
              )}
            >
              {tag}
            </button>
          )
        })}

        {/* Custom tags added by user */}
        {tags
          .filter((t) => !QUICK_TAGS.includes(t))
          .map((tag) => (
            <span
              key={tag}
              className="text-xs px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground border flex items-center gap-1"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="hover:text-destructive"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}

        {showInput ? (
          <input
            autoFocus
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                addCustom()
              }
              if (e.key === "Escape") {
                setCustomInput("")
                setShowInput(false)
              }
            }}
            onBlur={addCustom}
            placeholder="Tag personalizada..."
            className="text-xs border rounded-full px-2.5 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-primary w-36"
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowInput(true)}
            className="text-xs px-2 py-1 rounded-full border border-dashed text-muted-foreground hover:text-primary hover:border-primary flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function AccountCreateWizard({ onSuccess, onCancel, createFn }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Wizard state
  const [step, setStep] = useState<WizardStep>("type")
  const [clientType, setClientType] = useState<ClientType>("pf")
  const [error, setError] = useState<string | null>(null)
  const [successData, setSuccessData] = useState<SuccessData | null>(null)

  // Step 1 fields
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")

  // Step 2 fields
  const [segment, setSegment] = useState("")
  const [pipelineStage, setPipelineStage] = useState("")
  const [estimatedValue, setEstimatedValue] = useState("")
  const [frequency, setFrequency] = useState("")
  const [source, setSource] = useState("")
  const [contactName, setContactName] = useState("")
  const [cnpj, setCnpj] = useState("")
  const [tags, setTags] = useState<string[]>([])

  // ── Handlers ──────────────────────────────────────────────────────────────────

  function handleTypeSelect(type: ClientType) {
    setClientType(type)
    setStep("essential")
  }

  function handleStep1Submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) { setError("Nome é obrigatório."); return }
    if (!phone.trim()) { setError("WhatsApp é obrigatório."); return }
    if (!email.trim()) { setError("Email é obrigatório."); return }

    setStep("enrichment")
  }

  function handleStep2Submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const input: CreateAccountInput = {
      clientType,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      segment: segment || undefined,
      pipeline_stage: pipelineStage || undefined,
      estimated_value: estimatedValue || undefined,
      frequency: frequency || undefined,
      source: source || undefined,
      contact_name: contactName || undefined,
      cnpj: cnpj || undefined,
      tags: tags.length > 0 ? tags : undefined,
    }

    startTransition(async () => {
      const result = await createFn(input)
      if (result.error) {
        setError(result.error)
        return
      }
      if (result.accountId) {
        setSuccessData({
          accountId: result.accountId,
          name: name.trim(),
          phone: result.phone ?? phone.trim(),
        })
        setStep("success")
        onSuccess(result.accountId)
      }
    })
  }

  function resetWizard() {
    setStep("type")
    setClientType("pf")
    setError(null)
    setSuccessData(null)
    setName("")
    setPhone("")
    setEmail("")
    setSegment("")
    setPipelineStage("")
    setEstimatedValue("")
    setFrequency("")
    setSource("")
    setContactName("")
    setCnpj("")
    setTags([])
  }

  function handleStartChat(phone: string, accountId: string) {
    const clean = phone.replace(/\D/g, "")
    window.open(`https://wa.me/${clean}`, "_blank")
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  // ── Step 0: Type selector ──────────────────────────────────────────────────

  if (step === "type") {
    return (
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground text-center">
          Que tipo de cliente você está cadastrando?
        </p>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => handleTypeSelect("pf")}
            className="flex flex-col items-center gap-3 rounded-xl border-2 border-border p-6 hover:border-primary hover:bg-primary/5 transition-colors text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <User className="w-8 h-8 text-primary" />
            <span className="font-semibold text-sm">Pessoa Física</span>
          </button>
          <button
            type="button"
            onClick={() => handleTypeSelect("pj")}
            className="flex flex-col items-center gap-3 rounded-xl border-2 border-border p-6 hover:border-primary hover:bg-primary/5 transition-colors text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Building2 className="w-8 h-8 text-primary" />
            <span className="font-semibold text-sm">Pessoa Jurídica</span>
          </button>
        </div>
        <div className="flex justify-end pt-2 border-t">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </div>
    )
  }

  // ── Step 1: Essential ──────────────────────────────────────────────────────

  if (step === "essential") {
    return (
      <form onSubmit={handleStep1Submit} className="space-y-4">
        <StepIndicator current={1} />

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
            {error}
          </p>
        )}

        <div className="space-y-1.5">
          <label htmlFor="wiz-name" className="text-sm font-medium">
            {clientType === "pj" ? "Razão Social / Nome fantasia" : "Nome"}{" "}
            <span className="text-destructive">*</span>
          </label>
          <Input
            id="wiz-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={
              clientType === "pj" ? "Ex: Lavanderia São Lucas Ltda" : "Ex: João Silva"
            }
            required
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="wiz-phone" className="text-sm font-medium">
            WhatsApp <span className="text-destructive">*</span>
          </label>
          <Input
            id="wiz-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(12) 99999-9999"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="wiz-email" className="text-sm font-medium">
            Email <span className="text-destructive">*</span>
          </label>
          <Input
            id="wiz-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@exemplo.com"
            required
          />
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <button
            type="button"
            onClick={() => { setError(null); setStep("type") }}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar
          </button>
          <Button type="submit">Próximo →</Button>
        </div>
      </form>
    )
  }

  // ── Step 2: Enrichment ─────────────────────────────────────────────────────

  if (step === "enrichment") {
    return (
      <form onSubmit={handleStep2Submit} className="space-y-4">
        <StepIndicator current={2} />

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
            {error}
          </p>
        )}

        <p className="text-xs text-muted-foreground -mt-2">
          Todos os campos abaixo são opcionais — você pode preencher depois.
        </p>

        {/* Row: Segment + Pipeline */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Segmento</label>
            <select
              value={segment}
              onChange={(e) => setSegment(e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="">Selecionar...</option>
              <option value="Hospitalar">Hospitalar</option>
              <option value="Hotel/Pousada">Hotel/Pousada</option>
              <option value="Residencial">Residencial</option>
              <option value="Loja/Comércio">Loja/Comércio</option>
              <option value="Empresa/Escritório">Empresa/Escritório</option>
              <option value="Outro">Outro</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Pipeline</label>
            <select
              value={pipelineStage}
              onChange={(e) => setPipelineStage(e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="">Selecionar...</option>
              {PIPELINE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row: Ticket + Frequency */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="wiz-ticket" className="text-sm font-medium">
              Ticket R$
            </label>
            <Input
              id="wiz-ticket"
              type="number"
              min="0"
              step="0.01"
              value={estimatedValue}
              onChange={(e) => setEstimatedValue(e.target.value)}
              placeholder="0,00"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Frequência</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="">Selecionar...</option>
              <option value="Semanal">Semanal</option>
              <option value="2x/semana">2x/semana</option>
              <option value="Quinzenal">Quinzenal</option>
              <option value="Mensal">Mensal</option>
              <option value="Sob demanda">Sob demanda</option>
            </select>
          </div>
        </div>

        {/* Origem */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Origem</label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className={SELECT_CLASS}
          >
            <option value="">Selecionar...</option>
            <option value="WhatsApp">WhatsApp</option>
            <option value="Indicação">Indicação</option>
            <option value="Visita/Presencial">Visita/Presencial</option>
            <option value="Ligação">Ligação</option>
            <option value="Instagram">Instagram</option>
            <option value="Outro">Outro</option>
          </select>
        </div>

        {/* PJ-only fields */}
        {clientType === "pj" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="wiz-contact-name" className="text-sm font-medium">
                Responsável
              </label>
              <Input
                id="wiz-contact-name"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Nome do contato"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="wiz-cnpj" className="text-sm font-medium">
                CNPJ
              </label>
              <Input
                id="wiz-cnpj"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                placeholder="00.000.000/0001-00"
              />
            </div>
          </div>
        )}

        {/* Tags */}
        <TagSection tags={tags} onChange={setTags} />

        <div className="flex items-center justify-between pt-2 border-t">
          <button
            type="button"
            onClick={() => { setError(null); setStep("essential") }}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar
          </button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Salvando..." : "Criar cliente ✓"}
          </Button>
        </div>
      </form>
    )
  }

  // ── Success state ──────────────────────────────────────────────────────────

  if (step === "success" && successData) {
    // Build a minimal account-like object for score computation
    const fakeAccount = {
      id: successData.accountId,
      tenant_id: "",
      name: successData.name,
      segment: segment || null,
      contact_name: contactName || null,
      contact_email: email || null,
      status: "active" as const,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      pipeline_stage: (pipelineStage as PipelineStage) || "lead",
      commercial_status: "active" as const,
      last_contact_at: null,
      next_action: null,
      estimated_value: estimatedValue ? parseFloat(estimatedValue) : null,
      frequency: frequency || null,
    }

    const score = computeCommercialScore(fakeAccount, [])
    const scoreConfig = SCORE_CONFIG[score]
    const nextAction = computeNextBestAction(fakeAccount, [], score)

    return (
      <div className="flex flex-col items-center text-center gap-4 py-2">
        <CheckCircle2 className="w-12 h-12 text-emerald-500" />
        <div>
          <p className="text-base font-semibold text-foreground">
            Cliente criado com sucesso!
          </p>
          <p className="text-sm font-bold mt-1">{successData.name}</p>
        </div>

        {/* Score badge */}
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full",
            scoreConfig.bg,
            scoreConfig.color
          )}
        >
          <span className={cn("w-1.5 h-1.5 rounded-full", scoreConfig.dot)} />
          {scoreConfig.label}
        </span>

        {/* Next best action */}
        <div className="bg-muted rounded-lg px-4 py-3 text-left w-full max-w-xs">
          <p className="text-xs font-semibold text-foreground">{nextAction.label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{nextAction.description}</p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2 w-full max-w-xs">
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            onClick={() => handleStartChat(successData.phone, successData.accountId)}
          >
            <MessageCircle className="w-4 h-4" />
            Iniciar conversa no WhatsApp
          </Button>

          <Link href={`/accounts/${successData.accountId}`} className="w-full">
            <Button variant="outline" className="w-full">
              Ver perfil
            </Button>
          </Link>
        </div>

        <button
          type="button"
          onClick={resetWizard}
          className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
        >
          Criar outro cliente
        </button>
      </div>
    )
  }

  return null
}
