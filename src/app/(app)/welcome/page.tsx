"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { CheckCircle2, Loader2, ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { useTenant } from "@/hooks/useTenant"
import { createAccountFull } from "@/app/(app)/accounts/actions"
import { saveIntegration } from "@/app/(app)/settings/integrations/whatsapp/actions"
import {
  getOnboardingDbState,
  markOnboardingStep,
  recordActivation,
  type OnboardingDbState,
} from "./actions"

// ---------------------------------------------------------------------------
// Step 1 — Create first account
// ---------------------------------------------------------------------------

function StepOne({ onDone }: { onDone: (accountId: string, phone: string) => void }) {
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [contactName, setContactName] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) {
      toast.error("Nome e telefone são obrigatórios")
      return
    }
    setSubmitting(true)
    const result = await createAccountFull({
      name: name.trim(),
      phone: phone.trim(),
      email: "",
      contact_name: contactName.trim() || undefined,
      clientType: "pj",
    })
    setSubmitting(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    onDone(result.accountId!, result.phone!)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-primary-foreground">1</span>
          </div>
          <div>
            <CardTitle>Criar primeiro cliente</CardTitle>
            <CardDescription>Cadastre o primeiro cliente para começar</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="account-name">Nome da empresa *</Label>
            <Input
              id="account-name"
              placeholder="Ex: Lavanderia Central"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-phone">Telefone / WhatsApp *</Label>
            <Input
              id="account-phone"
              placeholder="+55 11 99999-9999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-name">Nome do contato</Label>
            <Input
              id="contact-name"
              placeholder="Ex: João Silva"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full gap-2" disabled={submitting}>
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
            Cadastrar e continuar
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Step 2 — Connect WhatsApp
// ---------------------------------------------------------------------------

function StepTwo({ onDone }: { onDone: () => void }) {
  const [accessToken, setAccessToken]     = useState("")
  const [phoneNumberId, setPhoneNumberId] = useState("")
  const [phoneNumber, setPhoneNumber]     = useState("")
  const [submitting, setSubmitting]       = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!accessToken.trim() || !phoneNumberId.trim() || !phoneNumber.trim()) {
      toast.error("Preencha todos os campos obrigatórios")
      return
    }
    setSubmitting(true)
    const result = await saveIntegration({
      accessToken,
      phoneNumberId,
      phoneNumber,
      wabaId: "",
    })
    setSubmitting(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success("WhatsApp conectado com sucesso!")
    onDone()
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-primary-foreground">2</span>
          </div>
          <div>
            <CardTitle>Conectar WhatsApp</CardTitle>
            <CardDescription>Insira as credenciais da Meta Cloud API (Meta for Developers)</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="access-token">Access Token *</Label>
            <Input
              id="access-token"
              type="password"
              placeholder="EAAxxxxxxxxxxxxx..."
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              autoComplete="off"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone-number-id">Phone Number ID *</Label>
            <Input
              id="phone-number-id"
              placeholder="1234567890123456"
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone-number">Número do telefone *</Label>
            <Input
              id="phone-number"
              placeholder="+55 11 99999-9999"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Número registrado na sua conta WhatsApp Business
            </p>
          </div>
          <Button
            type="submit"
            className="w-full gap-2"
            disabled={submitting || !accessToken.trim() || !phoneNumberId.trim() || !phoneNumber.trim()}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
            Conectar e continuar
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Step 3 — Send test message
// ---------------------------------------------------------------------------

function StepThree({
  defaultPhone,
  onDone,
}: {
  defaultPhone: string
  onDone: () => void
}) {
  const [phone, setPhone] = useState(defaultPhone)
  const [message, setMessage] = useState("Olá! Este é o primeiro contato via A7X. 🚀")
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!phone.trim() || !message.trim()) {
      toast.error("Preencha o número e a mensagem")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/whatsapp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), message: message.trim() }),
      })
      if (res.ok) {
        toast.success("Mensagem enviada com sucesso!")
        onDone()
      } else {
        const body = await res.json().catch(() => ({})) as { error?: string }
        toast.error(body.error ?? "Falha ao enviar mensagem")
      }
    } catch {
      toast.error("Erro de rede ao enviar mensagem")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-primary-foreground">3</span>
          </div>
          <div>
            <CardTitle>Enviar primeira mensagem</CardTitle>
            <CardDescription>Teste a integração enviando uma mensagem real</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="test-phone">Número de destino *</Label>
            <Input
              id="test-phone"
              placeholder="+55 11 99999-9999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="test-message">Mensagem *</Label>
            <Input
              id="test-message"
              placeholder="Escreva sua mensagem aqui"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
          </div>
          <Button
            type="submit"
            className="w-full gap-2"
            disabled={submitting || !phone.trim() || !message.trim()}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
            Enviar e ativar sistema
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Completed step indicator
// ---------------------------------------------------------------------------

function CompletedStep({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl ring-1 ring-foreground/10 bg-muted/30 opacity-60">
      <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Activation modal
// ---------------------------------------------------------------------------

function ActivationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={() => undefined}>
      <DialogContent className="sm:max-w-md text-center">
        <div className="flex flex-col items-center gap-6 py-4">
          <div className="h-20 w-20 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">🎉 Você está ativado!</h2>
            <p className="text-muted-foreground">
              Sistema configurado e pronto para uso. Bom trabalho!
            </p>
          </div>
          <Button className="w-full gap-2" size="lg" onClick={onClose}>
            Ir para o Dashboard
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function WelcomePage() {
  const { tenant } = useTenant()
  const router = useRouter()
  const queryClient = useQueryClient()

  const [dbState, setDbState] = useState<OnboardingDbState | null>(null)
  const [dbLoading, setDbLoading] = useState(true)
  const [showWow, setShowWow] = useState(false)

  // Track data from completed steps for later steps
  const [createdAccountPhone, setCreatedAccountPhone] = useState("")

  // Load DB state on mount
  useEffect(() => {
    getOnboardingDbState().then((state) => {
      setDbState(state)
      setDbLoading(false)
      if (state.created_first_account && state.connected_whatsapp && state.sent_first_message && !state.activated_at) {
        // All steps done on mount but not yet activated — show wow
        recordActivation().then(() => setShowWow(true))
      } else if (state.activated_at) {
        // Already activated — go to dashboard
        router.replace("/dashboard")
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function advanceStep(step: "account" | "whatsapp" | "message"): Promise<OnboardingDbState | false> {
    const { error } = await markOnboardingStep(step)
    if (error) {
      toast.error("Erro ao salvar progresso: " + error)
      return false
    }
    await queryClient.invalidateQueries({ queryKey: ["onboarding_state", tenant.id] })
    const next = await getOnboardingDbState()
    setDbState(next)
    return next
  }

  async function handleStep1Done(accountId: string, phone: string) {
    setCreatedAccountPhone(phone)
    await advanceStep("account")
  }

  async function handleStep2Done() {
    await advanceStep("whatsapp")
  }

  async function handleStep3Done() {
    const next = await advanceStep("message")
    if (!next) return
    if (next.created_first_account && next.connected_whatsapp && next.sent_first_message) {
      await recordActivation()
      setShowWow(true)
    }
  }

  function goToDashboard() {
    router.push("/dashboard")
  }

  // Derive current step from DB state
  const currentStep = !dbState
    ? 0
    : !dbState.created_first_account
      ? 1
      : !dbState.connected_whatsapp
        ? 2
        : !dbState.sent_first_message
          ? 3
          : 4 // all done

  const progressPercent = dbState
    ? ([dbState.created_first_account, dbState.connected_whatsapp, dbState.sent_first_message].filter(Boolean).length / 3) * 100
    : 0

  if (dbLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-muted/30">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold font-heading">Bem-vindo ao A7X</h1>
          <p className="text-muted-foreground">Configure em 3 passos para começar</p>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {currentStep <= 3 ? `Passo ${Math.min(currentStep, 3)} de 3` : "Concluído"}
            </span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {dbState?.created_first_account && (
            <CompletedStep label="Primeiro cliente cadastrado" />
          )}

          {currentStep === 1 && (
            <StepOne onDone={handleStep1Done} />
          )}

          {dbState?.created_first_account && dbState.connected_whatsapp && (
            <CompletedStep label="WhatsApp conectado" />
          )}

          {currentStep === 2 && (
            <StepTwo onDone={handleStep2Done} />
          )}

          {dbState?.sent_first_message && (
            <CompletedStep label="Primeira mensagem enviada" />
          )}

          {currentStep === 3 && (
            <StepThree
              defaultPhone={createdAccountPhone}
              onDone={handleStep3Done}
            />
          )}
        </div>

        {/* Skip link */}
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={goToDashboard}
            className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors"
          >
            Pular configuração → Ir para o dashboard
          </button>
        </div>
      </div>

      {/* Activation modal */}
      <ActivationModal open={showWow} onClose={goToDashboard} />
    </div>
  )
}
