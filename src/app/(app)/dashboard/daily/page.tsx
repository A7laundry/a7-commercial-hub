"use client"

import { useState } from "react"
import { useTenant } from "@/hooks/useTenant"
import { useDailyPerformance, useSaveDailyGoal, OUTCOME_LABELS, OUTCOME_NEGATIVE } from "@/hooks/dashboard/useDailyPerformance"
import { useLogOutcome, useDeleteOutcome } from "@/hooks/dashboard/useInteractionOutcomes"
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
  Percent,
  UserCheck,
  AlertTriangle,
  Trash2,
  Plus,
  Medal,
  UserPlus,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
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
  lead:        { label: "Lead",             colorClass: "bg-slate-400" },
  in_service:  { label: "Em atendimento",   colorClass: "bg-blue-500" },
  quote_sent:  { label: "Proposta enviada", colorClass: "bg-amber-500" },
  negotiating: { label: "Negociando",       colorClass: "bg-orange-500" },
  closed:      { label: "Fechado",          colorClass: "bg-green-600" },
  recurring:   { label: "Recorrente",       colorClass: "bg-emerald-500" },
}

// ── Outcome badge color ───────────────────────────────────────────────────────

function outcomeBadgeClass(type: string): string {
  switch (type) {
    case "sale":             return "bg-green-100 text-green-700 border-green-200"
    case "quote_only":       return "bg-amber-100 text-amber-700 border-amber-200"
    case "follow_up_pending": return "bg-blue-100 text-blue-700 border-blue-200"
    case "lost_price":       return "bg-red-100 text-red-700 border-red-200"
    default:                 return "bg-slate-100 text-slate-600 border-slate-200"
  }
}

// Dot color for outcome breakdown
function outcomeDotClass(type: string): string {
  switch (type) {
    case "sale":             return "bg-green-500"
    case "quote_only":       return "bg-amber-400"
    case "follow_up_pending": return "bg-blue-500"
    default:                 return "bg-red-400"
  }
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

  // Outcome form state
  const [showOutcomeForm, setShowOutcomeForm] = useState(false)
  const [outcomeForm, setOutcomeForm] = useState({
    account_name: "",
    operator_name: "",
    unit: "",
    outcome_type: "sale",
    revenue_amount: "",
    notes: "",
  })

  const { data, isPending: isLoading } = useDailyPerformance(tenant.id, selectedDate)
  const saveGoalMutation = useSaveDailyGoal(tenant.id, selectedDate)
  const logOutcomeMutation = useLogOutcome(tenant.id, selectedDate)
  const deleteOutcomeMutation = useDeleteOutcome(tenant.id, selectedDate)

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

  // ── Log outcome ─────────────────────────────────────────────────────────────

  async function handleLogOutcome(e: React.FormEvent) {
    e.preventDefault()
    await logOutcomeMutation.mutateAsync({
      account_name: outcomeForm.account_name,
      operator_name: outcomeForm.operator_name || "Equipe",
      unit: outcomeForm.unit || undefined,
      outcome_type: outcomeForm.outcome_type,
      revenue_amount: outcomeForm.revenue_amount ? Number(outcomeForm.revenue_amount) : null,
      notes: outcomeForm.notes || undefined,
    })
    setOutcomeForm({ account_name: "", operator_name: "", unit: "", outcome_type: "sale", revenue_amount: "", notes: "" })
    setShowOutcomeForm(false)
  }

  // ── Summary generator ───────────────────────────────────────────────────────

  function generateSummary() {
    if (!data) return

    const {
      waContactsTotal,
      waAccountsAttended,
      salesClosed,
      revenueToday,
      pipelineCounts,
      lossReasons,
      goal,
      totalOutcomes,
      salesFromOutcomes,
      revenueFromOutcomes,
      conversionContactToSale,
      conversionAttendedToSale,
      quoteOnlyCount,
      followUpPendingCount,
      operatorBreakdown,
      outcomeBreakdown,
    } = data

    const dateStr = formatDateBr(selectedDate)

    const pipelineLines = pipelineCounts
      .map((s) => {
        const label = STAGE_CONFIG[s.stage]?.label ?? s.stage
        return `• ${label}: ${s.count}`
      })
      .join("\n")

    // Top 3 operators
    const top3Operators = operatorBreakdown.slice(0, 3)
    const operatorsBlock =
      top3Operators.length > 0
        ? top3Operators
            .map((op) => `• ${op.operator}: ${op.sales} vendas (${op.convRate}%)`)
            .join("\n")
        : "• Sem dados de operadores"

    // Negative outcomes block
    const negativeOutcomes = outcomeBreakdown.filter((o) =>
      OUTCOME_NEGATIVE.includes(o.type),
    )
    const gargalosBlock =
      negativeOutcomes.length > 0
        ? `\n⚠️ *MAIORES GARGALOS*\n${negativeOutcomes
            .slice(0, 3)
            .map((o) => `• ${o.label}: ${o.count}`)
            .join("\n")}\n`
        : lossReasons.length > 0
        ? `\n⚠️ *MAIORES GARGALOS*\n${lossReasons
            .slice(0, 3)
            .map((r) => `• ${r.label}: ${r.count}`)
            .join("\n")}\n`
        : ""

    // Priority block
    let priorityLine = "• Manter ritmo e focar em recorrentes"
    if (followUpPendingCount > 0) {
      priorityLine = `• Retornar ${followUpPendingCount} orçamentos pendentes`
    } else if (conversionContactToSale < 20 && totalOutcomes > 0) {
      priorityLine = `• Melhorar abordagem inicial (${conversionContactToSale}% conversão)`
    } else if (quoteOnlyCount > salesFromOutcomes) {
      priorityLine = `• Converter orçamentos em vendas (${quoteOnlyCount} abertos)`
    }

    const goalBlock = goal
      ? `\n🎯 META: ${salesClosed}/${goal.goal_sales} vendas · R$ ${(revenueFromOutcomes || revenueToday).toFixed(2).replace(".", ",")}/${goal.goal_revenue.toFixed(2).replace(".", ",")}\n`
      : ""

    const effectiveSales = salesFromOutcomes || salesClosed
    const effectiveRevenue = revenueFromOutcomes || revenueToday

    const text = `📊 *RELATÓRIO DIÁRIO - ${dateStr}*

💬 *ATENDIMENTOS*
Total: ${totalOutcomes || waContactsTotal} interações
Clientes atendidos: ${waAccountsAttended}
Vendas: ${effectiveSales} | Receita: ${formatCurrency(effectiveRevenue)}

📈 *CONVERSÃO*
Contato → Venda: ${conversionContactToSale}%
Atendido → Venda: ${conversionAttendedToSale}%
Orçamentos: ${quoteOnlyCount} | Pendentes: ${followUpPendingCount}

🏆 *OPERADORES*
${operatorsBlock}

📊 *PIPELINE*
${pipelineLines}
${gargalosBlock}
🎯 *PRIORIDADE AMANHÃ*
${priorityLine}
${goalBlock}`

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

      {/* ── SECTION 1: KPI Row ── */}
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
          sub={isLoading ? null : formatCurrency(data!.revenueToday)}
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

      {/* ── SECTION 2: Conversion KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Contact → Sale */}
        <Card>
          <CardContent className="pt-4 pb-4">
            {isLoading ? (
              <>
                <Skeleton className="h-6 w-10 mb-1" />
                <Skeleton className="h-3 w-24" />
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Percent
                  className={cn(
                    "w-5 h-5 shrink-0",
                    (data?.conversionContactToSale ?? 0) >= 30
                      ? "text-green-500"
                      : "text-muted-foreground",
                  )}
                />
                <div>
                  <div
                    className={cn(
                      "text-xl font-bold",
                      (data?.conversionContactToSale ?? 0) >= 30 && "text-green-600",
                    )}
                  >
                    {data?.totalOutcomes ? `${data.conversionContactToSale}%` : "—"}
                  </div>
                  <p className="text-xs text-muted-foreground">Contato → Venda</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attended → Sale */}
        <Card>
          <CardContent className="pt-4 pb-4">
            {isLoading ? (
              <>
                <Skeleton className="h-6 w-10 mb-1" />
                <Skeleton className="h-3 w-24" />
              </>
            ) : (
              <div className="flex items-center gap-3">
                <UserCheck
                  className={cn(
                    "w-5 h-5 shrink-0",
                    (data?.conversionAttendedToSale ?? 0) < 50 && (data?.totalOutcomes ?? 0) > 0
                      ? "text-amber-500"
                      : "text-muted-foreground",
                  )}
                />
                <div>
                  <div
                    className={cn(
                      "text-xl font-bold",
                      (data?.conversionAttendedToSale ?? 0) < 50 && (data?.totalOutcomes ?? 0) > 0
                        ? "text-amber-600"
                        : "",
                    )}
                  >
                    {data?.totalOutcomes ? `${data.conversionAttendedToSale}%` : "—"}
                  </div>
                  <p className="text-xs text-muted-foreground">Atendido → Venda</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quote Only */}
        <Card>
          <CardContent className="pt-4 pb-4">
            {isLoading ? (
              <>
                <Skeleton className="h-6 w-10 mb-1" />
                <Skeleton className="h-3 w-24" />
              </>
            ) : (
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500" />
                <div>
                  <div className="text-xl font-bold">
                    {data?.totalOutcomes ? data.quoteOnlyCount : "—"}
                  </div>
                  <p className="text-xs text-muted-foreground">Só Orçamento</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Follow-up Pending */}
        <Card>
          <CardContent className="pt-4 pb-4">
            {isLoading ? (
              <>
                <Skeleton className="h-6 w-10 mb-1" />
                <Skeleton className="h-3 w-24" />
              </>
            ) : (
              <div className="flex items-center gap-3">
                <MessageCircle className="w-5 h-5 shrink-0 text-blue-500" />
                <div>
                  <div className="text-xl font-bold">
                    {data?.totalOutcomes ? data.followUpPendingCount : "—"}
                  </div>
                  <p className="text-xs text-muted-foreground">Follow-up Pendente</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── SECTION 3: Goal Progress Bar ── */}
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

      {/* ── SECTION 4: Register Interaction ── */}
      <Card className="mb-6">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Registrar Interação</CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setShowOutcomeForm((v) => !v)}
          >
            <Plus className="w-4 h-4" />
            {showOutcomeForm ? "Fechar" : "Nova"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Form */}
          {showOutcomeForm && (
            <form onSubmit={handleLogOutcome} className="space-y-3 border rounded-lg p-4 bg-muted/30">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  placeholder="Cliente / Prospect"
                  value={outcomeForm.account_name}
                  onChange={(e) =>
                    setOutcomeForm((f) => ({ ...f, account_name: e.target.value }))
                  }
                  required
                />
                <Input
                  placeholder="Operador"
                  value={outcomeForm.operator_name}
                  onChange={(e) =>
                    setOutcomeForm((f) => ({ ...f, operator_name: e.target.value }))
                  }
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={outcomeForm.outcome_type}
                  onChange={(e) =>
                    setOutcomeForm((f) => ({ ...f, outcome_type: e.target.value }))
                  }
                >
                  {Object.entries(OUTCOME_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <Input
                  placeholder="Unidade"
                  value={outcomeForm.unit}
                  onChange={(e) =>
                    setOutcomeForm((f) => ({ ...f, unit: e.target.value }))
                  }
                />
              </div>
              {outcomeForm.outcome_type === "sale" && (
                <Input
                  type="number"
                  placeholder="Valor da venda R$"
                  value={outcomeForm.revenue_amount}
                  onChange={(e) =>
                    setOutcomeForm((f) => ({ ...f, revenue_amount: e.target.value }))
                  }
                  min={0}
                  step={0.01}
                />
              )}
              <Textarea
                placeholder="Observações (opcional)"
                value={outcomeForm.notes}
                onChange={(e) =>
                  setOutcomeForm((f) => ({ ...f, notes: e.target.value }))
                }
                rows={2}
              />
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={logOutcomeMutation.isPending || !outcomeForm.account_name}
                  size="sm"
                >
                  {logOutcomeMutation.isPending ? "Registrando..." : "Registrar"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowOutcomeForm(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          )}

          {/* Outcomes list */}
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : !data?.outcomes || data.outcomes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma interação registrada hoje.
            </p>
          ) : (
            <div className="space-y-1.5">
              {data.outcomes.slice(0, 20).map((outcome: any) => (
                <div
                  key={outcome.id}
                  className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm"
                >
                  <span
                    className={cn(
                      "shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium",
                      outcomeBadgeClass(outcome.outcome_type),
                    )}
                  >
                    {OUTCOME_LABELS[outcome.outcome_type] ?? outcome.outcome_type}
                  </span>
                  <span className="flex-1 font-medium truncate">{outcome.account_name}</span>
                  {outcome.operator_name && (
                    <span className="text-muted-foreground truncate hidden sm:block">
                      {outcome.operator_name}
                    </span>
                  )}
                  {outcome.unit && (
                    <span className="text-muted-foreground text-xs hidden md:block">
                      {outcome.unit}
                    </span>
                  )}
                  {outcome.outcome_type === "sale" && outcome.revenue_amount ? (
                    <span className="text-green-600 font-medium text-xs shrink-0">
                      {formatCurrency(outcome.revenue_amount)}
                    </span>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 text-muted-foreground hover:text-red-600"
                    onClick={() => deleteOutcomeMutation.mutate(outcome.id)}
                    disabled={deleteOutcomeMutation.isPending}
                    aria-label="Remover interação"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── SECTION 5: Operator Ranking ── */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Ranking de Operadores</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : !data?.operatorBreakdown || data.operatorBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sem dados de operadores para hoje.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium text-muted-foreground w-8">#</th>
                    <th className="text-left py-2 font-medium text-muted-foreground">Operador</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Contatos</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Vendas</th>
                    <th className="text-right py-2 font-medium text-muted-foreground hidden md:table-cell">Receita</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Conversão</th>
                    <th className="text-left py-2 font-medium text-muted-foreground hidden lg:table-cell pl-4">Principal Perda</th>
                  </tr>
                </thead>
                <tbody>
                  {data.operatorBreakdown.map((op, idx) => (
                    <tr key={op.operator} className="border-b last:border-0">
                      <td className="py-2 w-8">
                        {idx === 0 ? (
                          <Medal className="w-4 h-4 text-yellow-500" />
                        ) : idx === 1 ? (
                          <Medal className="w-4 h-4 text-slate-400" />
                        ) : idx === 2 ? (
                          <Medal className="w-4 h-4 text-amber-700" />
                        ) : (
                          <span className="text-muted-foreground">{idx + 1}</span>
                        )}
                      </td>
                      <td className="py-2 font-medium">{op.operator}</td>
                      <td className="py-2 text-right">{op.contacts}</td>
                      <td className="py-2 text-right font-medium">{op.sales}</td>
                      <td className="py-2 text-right hidden md:table-cell">
                        {formatCurrency(op.revenue)}
                      </td>
                      <td className="py-2 text-right">
                        <span
                          className={cn(
                            "font-medium",
                            op.convRate >= 40
                              ? "text-green-600"
                              : op.convRate >= 20
                              ? "text-amber-600"
                              : "text-red-600",
                          )}
                        >
                          {op.convRate}%
                        </span>
                      </td>
                      <td className="py-2 text-muted-foreground text-xs hidden lg:table-cell pl-4">
                        {op.topOutcome}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── SECTION 6: Pipeline + Outcome Analysis ── */}
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
              <p className="text-sm text-muted-foreground">
                Sem dados de pipeline para hoje.
              </p>
            ) : (
              data!.pipelineCounts.map((stage) => {
                const config = STAGE_CONFIG[stage.stage] ?? {
                  label: stage.stage,
                  colorClass: "bg-primary",
                }
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

        {/* Análise de Resultados */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Análise de Resultados</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            ) : !data?.outcomeBreakdown || data.outcomeBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma interação registrada.
              </p>
            ) : (
              <div className="space-y-2">
                {data.outcomeBreakdown.map((o) => (
                  <div key={o.type} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "w-2.5 h-2.5 rounded-full shrink-0",
                          outcomeDotClass(o.type),
                        )}
                      />
                      <span className="text-sm text-muted-foreground">{o.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {o.revenue > 0 && (
                        <span className="text-xs text-green-600">
                          {formatCurrency(o.revenue)}
                        </span>
                      )}
                      <span className="text-xs bg-muted rounded-full px-2 py-0.5 font-medium">
                        {o.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── SECTION 7: Unit Breakdown ── */}
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

      {/* ── SECTION 8: New Accounts Registered Today ── */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-blue-500" />
            Novos Cadastros
            {!isLoading && (
              <span className="ml-auto text-sm font-normal text-muted-foreground">
                {data?.newAccounts?.length ?? 0} hoje
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : !data?.newAccounts || data.newAccounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum cliente cadastrado hoje.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-2 font-medium">Nome</th>
                    <th className="pb-2 font-medium">Tipo</th>
                    <th className="pb-2 font-medium">Segmento</th>
                    <th className="pb-2 font-medium">Estágio</th>
                    <th className="pb-2 font-medium text-right">Valor Est.</th>
                  </tr>
                </thead>
                <tbody>
                  {data.newAccounts.map((acc) => (
                    <tr key={acc.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-1.5 font-medium">{acc.name}</td>
                      <td className="py-1.5">
                        <span className={cn(
                          "text-xs px-1.5 py-0.5 rounded font-medium",
                          acc.client_type === "pj"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-blue-100 text-blue-700"
                        )}>
                          {acc.client_type === "pj" ? "PJ" : "PF"}
                        </span>
                      </td>
                      <td className="py-1.5 text-muted-foreground">{acc.segment ?? "—"}</td>
                      <td className="py-1.5">
                        <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          {STAGE_CONFIG[acc.pipeline_stage]?.label ?? acc.pipeline_stage}
                        </span>
                      </td>
                      <td className="py-1.5 text-right">
                        {acc.estimated_value != null
                          ? formatCurrency(acc.estimated_value)
                          : <span className="text-muted-foreground">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── SECTION 9: Define Goal ── */}
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

      {/* ── SECTION 9: Smart Summary ── */}
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
                rows={18}
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
            highlight === "green" ? "text-green-500" : "text-muted-foreground",
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
                highlight === "green" && "text-green-600",
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
