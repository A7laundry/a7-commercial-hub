"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useTenant } from "@/hooks/useTenant"
import { usePlan } from "@/hooks/usePlan"
import { PLANS, type PlanId } from "@/lib/plans"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { CheckCircle2, Zap, Crown, Building2, Loader2, AlertCircle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

function daysFromNow(dateStr: string): string {
  const days = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
  if (days <= 0) return "hoje"
  if (days === 1) return "em 1 dia"
  return `em ${days} dias`
}

// Checks URL params for Stripe redirect result
function BillingSearchParamsHandler() {
  const searchParams = useSearchParams()
  useEffect(() => {
    if (searchParams.get("success") === "1") {
      toast.success("Assinatura ativada com sucesso! Seu plano será atualizado em instantes.")
    } else if (searchParams.get("canceled") === "1") {
      toast.info("Assinatura cancelada. Você pode tentar novamente quando quiser.")
    }
  }, [searchParams])
  return null
}

const PLAN_ICONS = {
  free: Building2,
  pro: Zap,
  scale: Crown,
}

const PLAN_FEATURE_LIST: Record<PlanId, string[]> = {
  free: [
    "Até 50 clientes",
    "100 mensagens/mês",
    "1 usuário",
    "CRM básico",
    "Painel de execução",
  ],
  pro: [
    "Até 500 clientes",
    "Mensagens ilimitadas",
    "3 usuários",
    "CRM completo",
    "Campanhas (20/mês)",
    "Insights de IA",
    "Relatórios avançados",
  ],
  scale: [
    "Clientes ilimitados",
    "Mensagens ilimitadas",
    "10 usuários",
    "Todos os recursos Pro",
    "Campanhas ilimitadas",
    "API de acesso",
    "Suporte prioritário",
  ],
}

function StatusBadge({ status, daysLeft }: { status: string; daysLeft: number | null }) {
  if (status === "trialing") {
    return (
      <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1.5">
        <Clock className="h-3 w-3" />
        Trial{daysLeft !== null ? ` — ${daysLeft}d restantes` : ""}
      </Badge>
    )
  }
  if (status === "active") {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1.5">
        <CheckCircle2 className="h-3 w-3" />
        Ativo
      </Badge>
    )
  }
  if (status === "past_due") {
    return (
      <Badge className="bg-destructive/10 text-destructive border-destructive/20 gap-1.5">
        <AlertCircle className="h-3 w-3" />
        Pagamento pendente
      </Badge>
    )
  }
  if (status === "canceled") {
    return (
      <Badge variant="outline" className="text-muted-foreground gap-1.5">
        Cancelado
      </Badge>
    )
  }
  return <Badge variant="outline">{status}</Badge>
}

function BillingPageContent() {
  const { tenant } = useTenant()
  const planState = usePlan(tenant.id)
  const [upgrading, setUpgrading] = useState<PlanId | null>(null)
  const [renewalText, setRenewalText] = useState<string | null>(null)
  useEffect(() => {
    if (planState.currentPeriodEnd && planState.status === "active") {
      setRenewalText(daysFromNow(planState.currentPeriodEnd))
    } else {
      setRenewalText(null)
    }
  }, [planState.currentPeriodEnd, planState.status])

  async function handleUpgrade(planId: PlanId) {
    const plan = PLANS[planId]
    if (!plan.stripePriceId) {
      toast.error("Configure STRIPE_PRICE_" + planId.toUpperCase() + "_MONTHLY no ambiente")
      return
    }
    setUpgrading(planId)
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      })
      const body = await res.json() as { url?: string; error?: string }
      if (!res.ok || !body.url) {
        toast.error(body.error ?? "Erro ao criar sessão de pagamento")
        return
      }
      window.location.href = body.url
    } catch {
      toast.error("Erro de rede. Tente novamente.")
    } finally {
      setUpgrading(null)
    }
  }

  const isCurrent = (planId: PlanId) => planState.plan === planId

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Current plan status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-base">Assinatura atual</CardTitle>
              <CardDescription>
                Plano <span className="font-semibold">{planState.planName}</span>
                {renewalText && (
                  <> · renova {renewalText}</>
                )}
              </CardDescription>
            </div>
            <StatusBadge status={planState.status} daysLeft={planState.daysLeftInTrial} />
          </div>
        </CardHeader>
        {planState.status === "past_due" && (
          <CardContent className="pt-0">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Pagamento não processado. Atualize o método de pagamento para evitar interrupção do serviço.
            </div>
          </CardContent>
        )}
        {planState.isTrial && (
          <CardContent className="pt-0">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-sm">
              <Clock className="w-4 h-4 shrink-0" />
              Você está no período de avaliação gratuita. Aproveite todos os recursos Pro por {planState.daysLeftInTrial ?? 7} dias.
            </div>
          </CardContent>
        )}
      </Card>

      <Separator />
      <h2 className="text-base font-semibold">Escolha seu plano</h2>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(["free", "pro", "scale"] as PlanId[]).map((planId) => {
          const plan = PLANS[planId]
          const Icon = PLAN_ICONS[planId]
          const current = isCurrent(planId)
          const features = PLAN_FEATURE_LIST[planId]
          const isDowngrade = planId === "free" && planState.plan !== "free"

          return (
            <Card
              key={planId}
              className={cn(
                "relative flex flex-col transition-shadow",
                plan.highlighted && "ring-2 ring-primary shadow-md",
                current && "ring-2 ring-emerald-500"
              )}
            >
              {plan.highlighted && !current && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5">
                    Mais popular
                  </Badge>
                </div>
              )}
              {current && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-emerald-500 text-white text-[10px] px-2 py-0.5">
                    Seu plano
                  </Badge>
                </div>
              )}

              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center",
                    planId === "free" ? "bg-muted" : planId === "pro" ? "bg-primary/10" : "bg-amber-500/10"
                  )}>
                    <Icon className={cn(
                      "h-4 w-4",
                      planId === "free" ? "text-muted-foreground" : planId === "pro" ? "text-primary" : "text-amber-500"
                    )} />
                  </div>
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                </div>
                <div className="text-2xl font-bold">{plan.priceLabel}</div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>

              <CardContent className="flex-1 pt-0">
                <ul className="space-y-2">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="pt-4">
                {current ? (
                  <Button variant="outline" className="w-full" disabled>
                    <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" />
                    Plano atual
                  </Button>
                ) : isDowngrade ? (
                  <Button variant="outline" className="w-full text-muted-foreground" disabled>
                    Downgrade
                  </Button>
                ) : planId === "free" ? (
                  <Button variant="outline" className="w-full" disabled>
                    Grátis sempre
                  </Button>
                ) : (
                  <Button
                    className={cn(
                      "w-full gap-2",
                      plan.highlighted && "bg-primary hover:bg-primary/90"
                    )}
                    onClick={() => handleUpgrade(planId)}
                    disabled={upgrading !== null}
                  >
                    {upgrading === planId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Zap className="h-4 w-4" />
                    )}
                    {planState.isTrial ? "Assinar agora" : "Fazer upgrade"}
                  </Button>
                )}
              </CardFooter>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export default function BillingPage() {
  return (
    <>
      <PageHeader
        title="Assinatura"
        description="Gerencie seu plano e cobrança"
      />
      <Suspense fallback={null}>
        <BillingSearchParamsHandler />
      </Suspense>
      <BillingPageContent />
    </>
  )
}
