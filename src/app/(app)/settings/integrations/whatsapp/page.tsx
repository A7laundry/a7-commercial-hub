"use client"

import { useState, useEffect } from "react"
import { loadIntegration, saveIntegration } from "./actions"
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
} from "lucide-react"

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error"

interface ConnectionData {
  phoneNumber: string
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
  const [apiKey, setApiKey] = useState("")
  const [instanceId, setInstanceId] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Test area
  const [testPhone, setTestPhone] = useState("")
  const [testMessage, setTestMessage] = useState("")
  const [isSendingTest, setIsSendingTest] = useState(false)

  // Load persisted integration state on mount
  useEffect(() => {
    loadIntegration().then((row) => {
      if (!row || row.status === "disconnected") return
      setStatus(row.status)
      setConnectionData({
        phoneNumber: row.phone_number,
        lastActivity: row.last_activity_at ?? new Date().toISOString(),
      })
      setWebhookStatus({
        lastEventReceived: row.webhook_last_event_at,
        connectionStatus: row.webhook_status,
      })
    })
  }, [])

  function handleConnect() {
    setShowSetup(true)
    setSetupStep(1)
  }

  async function handleSetupSubmit() {
    if (!apiKey.trim() || !instanceId.trim() || !phoneNumber.trim()) {
      toast.error("Preencha todos os campos obrigatórios")
      return
    }

    setIsSubmitting(true)
    setSetupStep(3)

    const { error } = await saveIntegration({ apiKey, instanceId, phoneNumber })

    if (error) {
      setStatus("error")
      toast.error("Falha ao salvar. Tente novamente.")
      setSetupStep(2)
      setIsSubmitting(false)
      return
    }

    const now = new Date().toISOString()
    setStatus("connected")
    setConnectionData({ phoneNumber, lastActivity: now })
    setWebhookStatus({ lastEventReceived: null, connectionStatus: "unknown" })
    setIsSubmitting(false)
    toast.success("WhatsApp conectado com sucesso!")
    setTimeout(() => setShowSetup(false), 1500)
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
        description="Conecte seu WhatsApp Business para enviar e receber mensagens"
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
                  <CardDescription>Status da conexão</CardDescription>
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
                    Conecte sua conta WhatsApp Business para começar a enviar mensagens
                  </p>
                </div>
                <Button onClick={handleConnect} className="gap-2">
                  <Zap className="h-4 w-4" />
                  Conectar WhatsApp
                </Button>
              </div>
            )}

            {status === "connected" && connectionData && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Número</p>
                      <p className="text-sm font-medium">{connectionData.phoneNumber}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Última atividade</p>
                      <p className="text-sm font-medium">{formatDate(connectionData.lastActivity)}</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowSetup(true)} className="gap-2">
                    Reconfigurar
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
                    Não foi possível conectar. Verifique suas credenciais e tente novamente.
                  </p>
                </div>
                <Button onClick={handleConnect} variant="destructive" className="gap-2">
                  Tentar novamente
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

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
                    className={`h-2.5 w-2.5 rounded-full ${
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
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Último evento recebido</p>
                    <p className="text-sm font-medium">
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
            <DialogTitle>Configurar WhatsApp Business</DialogTitle>
            <DialogDescription>
              Siga os passos abaixo para conectar sua conta
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

          {/* Step 1 */}
          {setupStep === 1 && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-primary">1</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Crie sua conexão WhatsApp Business</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Acesse o painel do seu provedor de WhatsApp API e copie suas credenciais de acesso.
                      Você precisará da API Key, Instance ID e número de telefone.
                    </p>
                  </div>
                </div>
              </div>
              <Button onClick={() => setSetupStep(2)} className="w-full gap-2">
                Continuar
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Step 2 */}
          {setupStep === 2 && (
            <div className="space-y-4 py-2">
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="api-key">API Key</Label>
                  <Input
                    id="api-key"
                    type="password"
                    placeholder="Cole sua API Key aqui"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instance-id">Instance ID</Label>
                  <Input
                    id="instance-id"
                    placeholder="Ex: instance_abc123"
                    value={instanceId}
                    onChange={(e) => setInstanceId(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone-number">Número do telefone</Label>
                  <Input
                    id="phone-number"
                    placeholder="+55 11 99999-9999"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Número registrado na sua conta WhatsApp Business
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
                  disabled={!apiKey.trim() || !instanceId.trim() || !phoneNumber.trim()}
                  className="flex-1 gap-2"
                >
                  Conectar
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {setupStep === 3 && (
            <div className="py-8 text-center space-y-4">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                  <div>
                    <p className="font-medium">Conectando...</p>
                    <p className="text-sm text-muted-foreground mt-1">Verificando suas credenciais</p>
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
                      Seu WhatsApp Business está pronto para uso
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
                      Verifique suas credenciais e tente novamente
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
