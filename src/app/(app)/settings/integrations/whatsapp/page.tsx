"use client"

import { useState, useEffect } from "react"
import { loadIntegration, saveIntegration, disconnectIntegration } from "./actions"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  MessageSquare,
  Phone,
  CheckCircle2,
  XCircle,
  Loader2,
  Send,
  Wifi,
  WifiOff,
  ArrowRight,
  ArrowLeft,
  Clock,
  Zap,
  Copy,
  ExternalLink,
  KeyRound,
  Hash,
} from "lucide-react"

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error"

interface ConnectionData {
  phoneNumber: string
  phoneNumberId: string
  wabaId: string | null
  verifyToken: string
  lastActivity: string
}

interface WebhookStatus {
  lastEventReceived: string | null
  connectionStatus: "active" | "inactive" | "unknown"
}

function StatusBadge({ status }: { status: ConnectionStatus }) {
  switch (status) {
    case "connected":
      return (
        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/10 gap-1.5">
          <Wifi className="h-3 w-3" />
          Conectado
        </Badge>
      )
    case "connecting":
      return (
        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/10 gap-1.5">
          <Loader2 className="h-3 w-3 animate-spin" />
          Conectando
        </Badge>
      )
    case "error":
      return (
        <Badge className="bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/10 gap-1.5">
          <XCircle className="h-3 w-3" />
          Erro
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="gap-1.5 text-muted-foreground">
          <WifiOff className="h-3 w-3" />
          Não conectado
        </Badge>
      )
  }
}

function CopyField({ label, value }: { label: string; value: string }) {
  function copy() {
    navigator.clipboard.writeText(value).then(() => toast.success(`${label} copiado`))
  }
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          value={value}
          readOnly
          className="font-mono text-xs bg-muted/60 cursor-default"
        />
        <Button type="button" variant="outline" size="icon" className="shrink-0 h-9 w-9" onClick={copy}>
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

export default function WhatsAppIntegrationPage() {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected")
  const [connectionData, setConnectionData] = useState<ConnectionData | null>(null)
  const [webhookStatus, setWebhookStatus] = useState<WebhookStatus>({
    lastEventReceived: null,
    connectionStatus: "unknown",
  })

  // Setup flow
  const [showSetup, setShowSetup] = useState(false)
  const [setupStep, setSetupStep] = useState(1)
  const [accessToken, setAccessToken]   = useState("")
  const [phoneNumberId, setPhoneNumberId] = useState("")
  const [phoneNumber, setPhoneNumber]   = useState("")
  const [wabaId, setWabaId]             = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Test area
  const [testPhone, setTestPhone]     = useState("")
  const [testMessage, setTestMessage] = useState("")
  const [isSendingTest, setIsSendingTest] = useState(false)

  // Computed webhook URL shown to the operator
  const webhookUrl =
    (typeof window !== "undefined" ? window.location.origin : "") +
    "/api/whatsapp/ingest"

  // Load persisted integration state on mount
  useEffect(() => {
    loadIntegration().then((row) => {
      if (!row || row.status === "disconnected") return
      setStatus(row.status)
      setConnectionData({
        phoneNumber: row.phone_number,
        phoneNumberId: row.phone_number_id,
        wabaId: row.waba_id,
        verifyToken: row.verify_token,
        lastActivity: row.last_activity_at ?? new Date().toISOString(),
      })
      setWebhookStatus({
        lastEventReceived: row.webhook_last_event_at,
        connectionStatus: row.webhook_status,
      })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleConnect() {
    setShowSetup(true)
    setSetupStep(1)
  }

  async function handleSetupSubmit() {
    if (!accessToken.trim() || !phoneNumberId.trim() || !phoneNumber.trim()) {
      toast.error("Preencha os campos obrigatórios: Access Token, Phone Number ID e número")
      return
    }

    setIsSubmitting(true)
    setSetupStep(3)

    const { error, verify_token } = await saveIntegration({
      phoneNumber,
      accessToken,
      phoneNumberId,
      wabaId,
    })

    if (error) {
      setStatus("error")
      toast.error("Falha ao salvar. Tente novamente.")
      setSetupStep(2)
      setIsSubmitting(false)
      return
    }

    const now = new Date().toISOString()
    setStatus("connected")
    setConnectionData({
      phoneNumber,
      phoneNumberId,
      wabaId: wabaId || null,
      verifyToken: verify_token ?? "",
      lastActivity: now,
    })
    setWebhookStatus({ lastEventReceived: null, connectionStatus: "unknown" })
    setIsSubmitting(false)
    toast.success("WhatsApp Business conectado com sucesso!")
    setTimeout(() => setShowSetup(false), 1500)
  }

  async function handleDisconnect() {
    const { error } = await disconnectIntegration()
    if (error) {
      toast.error("Erro ao desconectar: " + error)
    } else {
      setStatus("disconnected")
      setConnectionData(null)
      toast.success("Integração desconectada")
    }
  }

  async function handleSendTest() {
    if (!testPhone.trim() || !testMessage.trim()) {
      toast.error("Preencha o número e a mensagem")
      return
    }

    setIsSendingTest(true)

    try {
      const res = await fetch("/api/whatsapp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: testPhone, message: testMessage }),
      })

      if (res.ok) {
        toast.success(`Mensagem de teste enviada para ${testPhone}`)
        setTestMessage("")
      } else {
        const body = await res.json().catch(() => ({})) as { error?: string }
        toast.error(body.error ?? "Falha ao enviar mensagem de teste")
      }
    } catch {
      toast.error("Erro de rede ao enviar mensagem de teste")
    } finally {
      setIsSendingTest(false)
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <>
      <PageHeader
        title="Integração WhatsApp"
        description="Conecte seu WhatsApp Business via Meta Cloud API oficial"
      />

      <div className="max-w-3xl mx-auto space-y-6">
        {/* Status Card */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">WhatsApp Business</CardTitle>
                  <CardDescription>Meta Cloud API oficial</CardDescription>
                </div>
              </div>
              <StatusBadge status={status} />
            </div>
          </CardHeader>
          <CardContent>
            {status === "disconnected" && (
              <div className="text-center py-6 space-y-4">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                  <WifiOff className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Nenhuma conta conectada</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Conecte sua conta WhatsApp Business via Meta for Developers
                  </p>
                </div>
                <Button onClick={handleConnect} className="gap-2">
                  <Zap className="h-4 w-4" />
                  Conectar WhatsApp Business
                </Button>
              </div>
            )}

            {status === "connected" && connectionData && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Número</p>
                      <p className="text-sm font-medium truncate">{connectionData.phoneNumber}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Phone Number ID</p>
                      <p className="text-sm font-mono truncate">{connectionData.phoneNumberId}</p>
                    </div>
                  </div>
                  {connectionData.wabaId && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <KeyRound className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">WABA ID</p>
                        <p className="text-sm font-mono truncate">{connectionData.wabaId}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Última atividade</p>
                      <p className="text-sm font-medium" suppressHydrationWarning>
                        {formatDate(connectionData.lastActivity)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSetupStep(1)
                      setAccessToken("")
                      setPhoneNumberId("")
                      setPhoneNumber("")
                      setWabaId("")
                      setShowSetup(true)
                    }}
                    className="gap-2"
                  >
                    Reconfigurar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDisconnect}
                    className="gap-2 text-destructive hover:text-destructive"
                  >
                    Desconectar
                  </Button>
                </div>
              </div>
            )}

            {status === "error" && (
              <div className="text-center py-6 space-y-4">
                <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                  <XCircle className="h-8 w-8 text-destructive" />
                </div>
                <div>
                  <p className="font-medium">Erro na conexão</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Não foi possível conectar. Verifique suas credenciais no Meta for Developers.
                  </p>
                </div>
                <Button onClick={handleConnect} variant="destructive" className="gap-2">
                  Tentar novamente
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Webhook Config — shown when connected */}
        {status === "connected" && connectionData && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Configuração do Webhook</CardTitle>
              <CardDescription>
                Use estes valores no painel Meta for Developers → WhatsApp → Configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <CopyField label="Callback URL" value={webhookUrl} />
              {connectionData.verifyToken && (
                <CopyField label="Verify Token" value={connectionData.verifyToken} />
              )}
              <p className="text-xs text-muted-foreground">
                No painel Meta: selecione os campos{" "}
                <code className="font-mono bg-muted px-1 py-0.5 rounded text-[11px]">messages</code> e{" "}
                <code className="font-mono bg-muted px-1 py-0.5 rounded text-[11px]">message_deliveries</code>{" "}
                em Webhook Fields.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Webhook Status */}
        {status === "connected" && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Status do Webhook</CardTitle>
              <CardDescription>Monitoramento de eventos em tempo real</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <div
                    className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                      webhookStatus.connectionStatus === "active"
                        ? "bg-emerald-500 animate-pulse"
                        : "bg-muted-foreground"
                    }`}
                  />
                  <div>
                    <p className="text-xs text-muted-foreground">Status da conexão</p>
                    <p className="text-sm font-medium">
                      {webhookStatus.connectionStatus === "active"
                        ? "Ativo"
                        : webhookStatus.connectionStatus === "inactive"
                          ? "Inativo"
                          : "Desconhecido"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Último evento recebido</p>
                    <p className="text-sm font-medium" suppressHydrationWarning>
                      {webhookStatus.lastEventReceived
                        ? formatDate(webhookStatus.lastEventReceived)
                        : "Nenhum evento"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Test Area */}
        {status === "connected" && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Enviar mensagem de teste</CardTitle>
              <CardDescription>Verifique se a integração está funcionando corretamente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="test-phone">Número de destino</Label>
                  <Input
                    id="test-phone"
                    placeholder="+55 11 99999-9999"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="test-message">Mensagem</Label>
                  <Input
                    id="test-message"
                    placeholder="Olá, esta é uma mensagem de teste"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                  />
                </div>
              </div>
              <Button
                onClick={handleSendTest}
                disabled={isSendingTest || !testPhone.trim() || !testMessage.trim()}
                className="gap-2"
                size="sm"
              >
                {isSendingTest ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Enviar teste
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Setup Dialog */}
      <Dialog open={showSetup} onOpenChange={setShowSetup}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Conectar WhatsApp Business</DialogTitle>
            <DialogDescription>
              Configure a integração com a Meta Cloud API oficial
            </DialogDescription>
          </DialogHeader>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Passo {setupStep} de 3</span>
              <span>{Math.round((setupStep / 3) * 100)}%</span>
            </div>
            <Progress value={(setupStep / 3) * 100} className="h-1.5" />
          </div>

          {/* Step 1 — Instruções Meta */}
          {setupStep === 1 && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">1</span>
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-sm">Acesse o Meta for Developers</p>
                    <p className="text-sm text-muted-foreground">
                      Entre em{" "}
                      <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
                        developers.facebook.com
                      </span>{" "}
                      → seu app → <strong>WhatsApp → API Setup</strong>.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">2</span>
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-sm">Copie suas credenciais</p>
                    <p className="text-sm text-muted-foreground">
                      Você precisará de três valores: <strong>Access Token</strong> (token temporário ou permanente via System User),{" "}
                      <strong>Phone Number ID</strong> e <strong>WhatsApp Business Account ID</strong>.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">3</span>
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-sm">Configure o webhook depois</p>
                    <p className="text-sm text-muted-foreground">
                      Após salvar, você receberá a URL e o Verify Token para configurar
                      em <strong>WhatsApp → Configuration → Webhook</strong>.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="https://developers.facebook.com/apps"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Abrir Meta for Developers
                </a>
                <Button onClick={() => setSetupStep(2)} className="flex-1 gap-2">
                  Continuar
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2 — Credenciais */}
          {setupStep === 2 && (
            <div className="space-y-4 py-2">
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="access-token">
                    Access Token <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="access-token"
                    type="password"
                    placeholder="EAAxxxxxxxxxxxxx..."
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground">
                    Token permanente via System User ou token temporário do painel de teste
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone-number-id">
                    Phone Number ID <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="phone-number-id"
                    placeholder="1234567890123456"
                    value={phoneNumberId}
                    onChange={(e) => setPhoneNumberId(e.target.value)}
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground">
                    ID numérico do número em API Setup → Phone Number ID
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone-number">
                    Número do telefone <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="phone-number"
                    placeholder="+55 11 99999-9999"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="waba-id">
                    WhatsApp Business Account ID{" "}
                    <span className="text-muted-foreground text-xs">(opcional)</span>
                  </Label>
                  <Input
                    id="waba-id"
                    placeholder="1234567890123456"
                    value={wabaId}
                    onChange={(e) => setWabaId(e.target.value)}
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground">
                    Necessário para gerenciar templates aprovados pela Meta
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSetupStep(1)} className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </Button>
                <Button
                  onClick={handleSetupSubmit}
                  disabled={!accessToken.trim() || !phoneNumberId.trim() || !phoneNumber.trim()}
                  className="flex-1 gap-2"
                >
                  Conectar
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3 — Resultado */}
          {setupStep === 3 && (
            <div className="py-8 text-center space-y-4">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                  <div>
                    <p className="font-medium">Salvando credenciais...</p>
                    <p className="text-sm text-muted-foreground mt-1">Conectando à Meta Cloud API</p>
                  </div>
                </>
              ) : status === "connected" ? (
                <>
                  <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                  </div>
                  <div>
                    <p className="font-medium">Conectado com sucesso!</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Configure agora o webhook usando os dados exibidos na tela.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                    <XCircle className="h-8 w-8 text-destructive" />
                  </div>
                  <div>
                    <p className="font-medium">Falha na conexão</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Verifique suas credenciais no Meta for Developers e tente novamente.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
