"use client"

import { useState } from "react"
import { useTenant } from "@/hooks/useTenant"
import { useDailyPerformance, useSaveDailyGoal } from "@/hooks/dashboard/useDailyPerformance"
import { PageHeader } from "@/components/shared/PageHeader"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  MessageCircle,
  TrendingUp,
  Users,
  Target,
  Building2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  BarChart3,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function addDays(iso: string, delta: number): string {
  const d = new Date(iso)
  d.setDate(d.getDate() + delta)
  return d.toISOString().slice(0, 10)
}

function formatDisplayDate(iso: string): string {
  if (iso === todayIso()) return "Hoje"
  const [year, month, day] = iso.split("-")
  return `${day}/${month}/${year}`
}

function formatDateBr(iso: string): string {
  const [year, month, day] = iso.split("-")
  return `${day}/${month}/${year}`
}

// ── Stage config ──────────────────────────────────────────────────────────────

const STAGE_CONFIG: Record<string, { label: string; colorClass: string }> = {
  lead:        { label: "Lead",          colorClass: "bg-slate-400" },
  in_service:  { label: "Em atendimento", colorClass: "bg-blue-500" },
  quote_sent:  { label: "Proposta enviada", colorClass: "bg-amber-500" },
  negotiating: { label: "Negociando",    colorClass: "bg-orange-500" },
  closed:      { label: "Fechado",       colorClass: "bg-green-600" },
  recurring:   { label: "Recorrente",    colorClass: "bg-emerald-500" },
}

// ── Progress bar color ────────────────────────────────────────────────────────

function progressColorClass(pct: number): string {
  if (pct >= 80) return "bg-green-500"
  if (pct >= 50) return "bg-amber-500"
  return "bg-red-500"
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DailyPerformancePage() {
  const { tenant } = useTenant()
  const [selectedDate, setSelectedDate] = useState<string>(todayIso())
  const [copiedSummary, setCopiedSummary] = useState(false)
  const [summaryText, setSummaryText] = useState<string | null>(null)
  const [savedGoal, setSavedGoal] = useState(false)
  const [goalInputs, setGoalInputs] = useState({
    goal_contacts: "",
    goal_sales: "",
    goal_revenue: "",
  })

  const { data, isLoading } = useDailyPerformance(tenant.id, selectedDate)
  const saveGoalMutation = useSaveDailyGoal(tenant.id, selectedDate)

  const isToday = selectedDate === todayIso()

  function goBack() {
    setSelectedDate((d) => addDays(d, -1))
    setSummaryText(null)
  }

  function goForward() {
    if (!isToday) {
      setSelectedDate((d) => addDays(d, 1))
      setSummaryText(null)
    }
  }

  // ── Goal save ───────────────────────────────────────────────────────────────

  async function handleSaveGoal() {
    await saveGoalMutation.mutateAsync({
      goal_contacts: Number(goalInputs.goal_contacts) || 0,
      goal_sales: Number(goalInputs.goal_sales) || 0,
      goal_revenue: Number(goalInputs.goal_revenue) || 0,
    })
    setSavedGoal(true)
    setTimeout(() => setSavedGoal(false), 2000)
  }

  // ── Summary generator ───────────────────────────────────────────────────────

  function generateSummary() {
    if (!data) return

    const {
      waContactsTotal,
      waOutbound,
      waInbound,
      waAccountsAttended,
      salesClosed,
      revenueToday,
      pipelineCounts,
      lossReasons,
      goal,
    } = data

    const dateStr = formatDateBr(selectedDate)

    const pipelineCountsLines = pipelineCounts
      .map((s) => {
        const label = STAGE_CONFIG[s.stage]?.label ?? s.stage
        return `• ${label}: ${s.count}`
      })
      .join("\n")

    const lossBlock =
      lossReasons.length > 0
        ? `\n❌ *PERDAS HOJE*\n${lossReasons.map((r) => `• ${r.label}: ${r.count}`).join("\n")}\n`
        : ""

    const goalBlock = goal
      ? `\n🎯 *META*\nVendas: ${salesClosed}/${goal.goal_sales} | Receita: R$ ${revenueToday.toFixed(2).replace(".", ",")}/${goal.goal_revenue.toFixed(2).replace(".", ",")}\n`
      : ""

    const text = `📊 *RELATÓRIO DIÁRIO - ${dateStr}*

💬 WhatsApp: ${waContactsTotal} contatos (${waOutbound} enviados, ${waInbound} recebidos)
👥 Clientes atendidos: ${waAccountsAttended}
✅ Vendas fechadas: ${salesClosed}
💰 Receita do dia: ${formatCurrency(revenueToday)}

📈 *PIPELINE*
${pipelineCountsLines}
${lossBlock}${goalBlock}`

    setSummaryText(text.trim())
  }

  async function copySummary() {
    if (!summaryText) return
    await navigator.clipboard.writeText(summaryText)
    setCopiedSummary(true)
    setTimeout(() => setCopiedSummary(false), 2000)
  }

  // ── Derived values ──────────────────────────────────────────────────────────

  const goalPct =
    data?.goal && data.goal.goal_sales > 0
      ? Math.min(100, Math.round((data.salesClosed / data.goal.goal_sales) * 100))
      : 0

  const maxPipelineCount =
    data?.pipelineCounts.reduce((acc, s) => Math.max(acc, s.count), 1) ?? 1

  // ── Date navigation (header action) ────────────────────────────────────────

  const dateNavActions = (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" onClick={goBack} aria-label="Dia anterior">
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <span className="text-sm font-medium min-w-[72px] text-center">
        {formatDisplayDate(selectedDate)}
      </span>
      <Button
        variant="outline"
        size="icon"
        onClick={goForward}
        disabled={isToday}
        aria-label="Próximo dia"
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  )

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div>
      <PageHeader
        title="Desempenho Diário"
        description="Relatório automático do dia"
        actions={dateNavActions}
      />

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <DailyKpiCard
          title="Contatos WhatsApp"
          value={isLoading ? null : data!.waContactsTotal}
          sub={
            isLoading
              ? null
              : `${data!.waOutbound} enviados · ${data!.waInbound} recebidos`
          }
          icon={MessageCircle}
          isLoading={isLoading}
        />
        <DailyKpiCard
          title="Clientes Atendidos"
          value={isLoading ? null : data!.waAccountsAttended}
          sub="com conta vinculada"
          icon={Users}
          isLoading={isLoading}
        />
        <DailyKpiCard
          title="Vendas Fechadas"
          value={isLoading ? null : data!.salesClosed}
          sub={
            isLoading
              ? null
              : formatCurrency(data!.revenueToday)
          }
          icon={TrendingUp}
          isLoading={isLoading}
          highlight={!isLoading && data!.salesClosed > 0 ? "green" : undefined}
        />
        <DailyKpiCard
          title="Meta de Vendas"
          value={isLoading ? null : (data!.goal?.goal_sales ?? "—")}
          sub="estabelecida para hoje"
          icon={Target}
          isLoading={isLoading}
        />
        <DailyKpiCard
          title="Meta de Receita"
          value={
            isLoading
              ? null
              : data!.goal
              ? formatCurrency(data!.goal.goal_revenue)
              : "—"
          }
          sub="receita alvo"
          icon={BarChart3}
          isLoading={isLoading}
        />
      </div>

      {/* ── Goal Progress Bar ── */}
      {!isLoading && data?.goal && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Progresso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full h-3 rounded-full bg-primary/10 overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", progressColorClass(goalPct))}
                style={{ width: `${goalPct}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {data.salesClosed} de {data.goal.goal_sales} vendas ({goalPct}%)
            </p>
          </CardContent>
        </Card>
      )}
      {isLoading && <Skeleton className="h-20 w-full mb-6" />}

      {/* ── Row 2: Pipeline + Loss Reasons ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Pipeline Snapshot */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              Pipeline Atual
              {!isLoading && (
                <span className="text-xs text-muted-foreground font-normal ml-1">
                  ({data!.pipelineCounts.reduce((a, s) => a + s.count, 0)} total)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))
            ) : data!.pipelineCounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados de pipelineCounts para hoje.</p>
            ) : (
              data!.pipelineCounts.map((stage) => {
                const config = STAGE_CONFIG[stage.stage] ?? { label: stage.stage, colorClass: "bg-primary" }
                const pct = Math.round((stage.count / maxPipelineCount) * 100)
                return (
                  <div key={stage.stage}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">{config.label}</span>
                      <span className="font-medium">{stage.count}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-primary/10 overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", config.colorClass)}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* Loss Reasons */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              Motivos de Perda Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            ) : data!.lossReasons.length === 0 ? (
              <p className="text-sm text-green-600 font-medium">
                Nenhuma perda registrada hoje ✓
              </p>
            ) : (
              <div className="space-y-2">
                {data!.lossReasons.map((r) => (
                  <div key={r.label} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{r.label}</span>
                    <span className="text-xs bg-red-100 text-red-700 rounded-full px-2 py-0.5 font-medium">
                      {r.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 3: Unit Breakdown ── */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Por Unidade</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : !data!.unitBreakdown || data!.unitBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados de unidade para hoje.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium text-muted-foreground">Unidade</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Vendas</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Receita</th>
                  </tr>
                </thead>
                <tbody>
                  {data!.unitBreakdown.map((unit) => (
                    <tr key={unit.unit} className="border-b last:border-0">
                      <td className="py-2">{unit.unit}</td>
                      <td className="py-2 text-right font-medium">{unit.sales}</td>
                      <td className="py-2 text-right font-medium">{formatCurrency(unit.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Row 4: Set Daily Goal ── */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Definir Meta do Dia</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              type="number"
              placeholder="Meta contatos"
              value={goalInputs.goal_contacts}
              onChange={(e) =>
                setGoalInputs((prev) => ({ ...prev, goal_contacts: e.target.value }))
              }
              className="flex-1"
            />
            <Input
              type="number"
              placeholder="Meta vendas"
              value={goalInputs.goal_sales}
              onChange={(e) =>
                setGoalInputs((prev) => ({ ...prev, goal_sales: e.target.value }))
              }
              className="flex-1"
            />
            <Input
              type="number"
              placeholder="Meta receita (R$)"
              value={goalInputs.goal_revenue}
              onChange={(e) =>
                setGoalInputs((prev) => ({ ...prev, goal_revenue: e.target.value }))
              }
              className="flex-1"
            />
            <Button
              onClick={handleSaveGoal}
              disabled={saveGoalMutation.isPending}
              className="shrink-0"
            >
              {savedGoal ? "Salvo!" : saveGoalMutation.isPending ? "Salvando..." : "Salvar meta"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Row 5: Summary Text Generator ── */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Resumo para o Time</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            onClick={generateSummary}
            disabled={isLoading || !data}
          >
            Gerar resumo
          </Button>
          {summaryText && (
            <div className="relative">
              <textarea
                readOnly
                value={summaryText}
                rows={14}
                className="w-full resize-none rounded-md border bg-muted/40 p-3 text-sm font-mono leading-relaxed focus:outline-none"
              />
              <Button
                size="sm"
                variant="outline"
                className="absolute top-2 right-2 gap-1.5"
                onClick={copySummary}
              >
                {copiedSummary ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-green-600" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar</span>
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ── Daily KPI Card ────────────────────────────────────────────────────────────

type DailyKpiCardProps = {
  title: string
  value: string | number | null
  sub: string | null
  icon: React.ElementType
  isLoading?: boolean
  highlight?: "green"
}

function DailyKpiCard({ title, value, sub, icon: Icon, isLoading, highlight }: DailyKpiCardProps) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon
          className={cn(
            "w-4 h-4",
            highlight === "green" ? "text-green-500" : "text-muted-foreground"
          )}
        />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <>
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-3 w-24" />
          </>
        ) : (
          <>
            <div
              className={cn(
                "text-2xl font-bold",
                highlight === "green" && "text-green-600"
              )}
            >
              {value ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{sub}</p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
