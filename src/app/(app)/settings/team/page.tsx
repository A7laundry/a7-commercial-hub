import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { PageHeader } from "@/components/shared/PageHeader"
import { UserAvatar } from "@/components/shared/UserAvatar"
import { cn } from "@/lib/utils"
import {
  MessageSquare, Target, Trophy, Users,
  TrendingUp, Calendar, PhoneCall, CheckCircle2, BarChart3,
} from "lucide-react"
import { DeactivateMemberButton } from "./DeactivateMemberButton"

const ROLE_LABEL: Record<string, string> = {
  owner:  "Proprietário",
  admin:  "Administrador",
  member: "Membro",
  viewer: "Visualizador",
}

const ROLE_COLOR: Record<string, string> = {
  owner:  "bg-amber-100 text-amber-700",
  admin:  "bg-blue-100 text-blue-700",
  member: "bg-slate-100 text-slate-600",
  viewer: "bg-gray-100 text-gray-500",
}

const STATUS_COLOR: Record<string, { dot: string; label: string; badge: string }> = {
  active:    { dot: "bg-emerald-400", label: "Ativo",    badge: "text-emerald-700" },
  attention: { dot: "bg-amber-400",   label: "Baixo",    badge: "text-amber-700" },
  inactive:  { dot: "bg-slate-300",   label: "Inativo",  badge: "text-slate-500" },
}

function deriveStatus(interactions: number): "active" | "attention" | "inactive" {
  if (interactions === 0) return "inactive"
  if (interactions < 5)  return "attention"
  return "active"
}

export default async function TeamPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: membership } = await supabase
    .from("tenant_users")
    .select("tenant_id, role")
    .eq("user_id", user.id)
    .single()

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    redirect("/settings")
  }

  const tenantId = membership.tenant_id
  const service  = createServiceClient()

  const now        = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const days30Ago  = new Date(Date.now() - 30 * 86400_000).toISOString()
  // last 3 days: for the "recent activity" check
  const days3Ago   = new Date(Date.now() - 3 * 86400_000).toLocaleDateString("sv")

  // Fetch all members
  const { data: membersData } = await supabase
    .from("tenant_users")
    .select("user_id, role, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at")

  const members = membersData ?? []
  const userIds  = members.map((m) => m.user_id)

  // All queries in parallel
  const [
    profilesRes,
    conversationsRes,
    dealsRes,
    timelineRes,
    outcomesRes,
    authUsersRes,
  ] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("user_id, display_name, job_title, avatar_url")
      .in("user_id", userIds),

    supabase
      .from("wa_conversations")
      .select("assigned_to, status")
      .eq("tenant_id", tenantId)
      .not("assigned_to", "is", null),

    supabase
      .from("deals")
      .select("assigned_to, stage, value, won_at")
      .eq("tenant_id", tenantId)
      .not("assigned_to", "is", null),

    supabase
      .from("account_timeline")
      .select("created_by, created_at")
      .eq("tenant_id", tenantId)
      .not("created_by", "is", null)
      .gte("created_at", days30Ago),

    // interaction_outcomes: the primary source of daily operator activity
    supabase
      .from("interaction_outcomes")
      .select("operator_name, outcome_type, revenue_amount, date, created_at")
      .eq("tenant_id", tenantId)
      .gte("created_at", days30Ago)
      .order("created_at", { ascending: false }),

    service.auth.admin.listUsers({ perPage: 1000 }),
  ])

  const profiles     = profilesRes.data     ?? []
  const conversations = conversationsRes.data ?? []
  const deals        = dealsRes.data         ?? []
  const timelineRows = timelineRes.data      ?? []
  const outcomes     = outcomesRes.data      ?? []
  const authUsers    = authUsersRes.data?.users ?? []

  // Lookup maps
  const profileMap = new Map(profiles.map((p) => [p.user_id, p]))
  const emailMap   = new Map(authUsers.map((u) => [u.id, u.email ?? ""]))

  // ── Aggregate interaction_outcomes by operator_name ───────────────────────────

  type OutcomeAgg = {
    contacts: number
    sales: number
    revenue: number
    lastDate: string | null
    recentContacts: number  // last 3 days
  }

  const outcomeMap = new Map<string, OutcomeAgg>()
  for (const row of outcomes) {
    const name = (row.operator_name as string | null)?.trim() ?? "Desconhecido"
    const existing = outcomeMap.get(name) ?? {
      contacts: 0, sales: 0, revenue: 0, lastDate: null, recentContacts: 0,
    }
    existing.contacts += 1
    if (row.outcome_type === "sale") {
      existing.sales  += 1
      existing.revenue += row.revenue_amount ?? 0
    }
    if (!existing.lastDate || row.date > existing.lastDate) {
      existing.lastDate = row.date as string
    }
    if ((row.date as string) >= days3Ago) {
      existing.recentContacts += 1
    }
    outcomeMap.set(name, existing)
  }

  // ── Count timeline events per user_id ─────────────────────────────────────────

  const timelineCountMap = new Map<string, number>()
  for (const row of timelineRows) {
    if (row.created_by) {
      timelineCountMap.set(row.created_by, (timelineCountMap.get(row.created_by) ?? 0) + 1)
    }
  }

  // ── Build per-member stats ─────────────────────────────────────────────────────

  const stats = members.map((member) => {
    const profile = profileMap.get(member.user_id)
    const email   = emailMap.get(member.user_id) ?? ""
    const displayName = profile?.display_name ?? null

    // Try to match by display_name to interaction_outcomes.operator_name
    const outcomeKey = displayName?.trim() ?? ""
    const myOutcomes = outcomeKey ? (outcomeMap.get(outcomeKey) ?? null) : null

    // WA conversations
    const myConvs  = conversations.filter((c) => c.assigned_to === member.user_id)
    const inboxOpen  = myConvs.filter((c) => c.status === "open").length
    const inboxTotal = myConvs.length

    // Deals
    const myDeals = deals.filter((d) => d.assigned_to === member.user_id)
    const dealsActive      = myDeals.filter((d) => !["won", "lost"].includes(d.stage))
    const dealsActiveCount = dealsActive.length
    const dealsActiveValue = dealsActive.reduce((s, d) => s + (d.value ?? 0), 0)
    const dealsWonMonth    = myDeals.filter(
      (d) => d.stage === "won" && d.won_at && d.won_at >= monthStart
    )
    const dealsWonCount = dealsWonMonth.length
    const dealsWonValue = dealsWonMonth.reduce((s, d) => s + (d.value ?? 0), 0)

    // Timeline (new, starts today — grows over time)
    const timelineCount = timelineCountMap.get(member.user_id) ?? 0

    const contacts30d       = myOutcomes?.contacts ?? 0
    const sales30d          = myOutcomes?.sales ?? 0
    const revenue30d        = myOutcomes?.revenue ?? 0
    const recentContacts    = myOutcomes?.recentContacts ?? 0
    const lastActivityDate  = myOutcomes?.lastDate ?? null
    const activityStatus    = deriveStatus(contacts30d)

    return {
      userId: member.user_id,
      role: member.role,
      memberSince: member.created_at,
      displayName,
      jobTitle: profile?.job_title ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      email,
      inboxOpen,
      inboxTotal,
      dealsActiveCount,
      dealsActiveValue,
      dealsWonCount,
      dealsWonValue,
      timelineCount,
      contacts30d,
      sales30d,
      revenue30d,
      recentContacts,
      lastActivityDate,
      activityStatus,
    }
  })

  // Unmatched outcome operators (names not linked to any profile)
  const linkedNames = new Set(
    stats.map((s) => s.displayName?.trim()).filter(Boolean) as string[]
  )
  const unmatchedOutcomes = Array.from(outcomeMap.entries())
    .filter(([name]) => !linkedNames.has(name))
    .map(([name, agg]) => ({ name, ...agg }))
    .sort((a, b) => b.contacts - a.contacts)

  const isOwner = membership.role === "owner"

  // Summary totals
  const totalContacts30d  = stats.reduce((s, op) => s + op.contacts30d, 0) +
    unmatchedOutcomes.reduce((s, op) => s + op.contacts, 0)
  const totalSales30d     = stats.reduce((s, op) => s + op.sales30d, 0) +
    unmatchedOutcomes.reduce((s, op) => s + op.sales, 0)
  const totalRevenue30d   = stats.reduce((s, op) => s + op.revenue30d, 0) +
    unmatchedOutcomes.reduce((s, op) => s + op.revenue, 0)

  return (
    <div className="pb-12">
      <PageHeader
        title="Equipe"
        description={`${members.length} membro${members.length !== 1 ? "s" : ""} · últimos 30 dias`}
      />

      {/* ── Summary strip ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Contatos (30d)",  value: totalContacts30d, icon: PhoneCall,    color: "text-blue-600",    fmt: "num" },
          { label: "Vendas (30d)",    value: totalSales30d,    icon: CheckCircle2, color: "text-emerald-600", fmt: "num" },
          { label: "Receita (30d)",   value: totalRevenue30d,  icon: TrendingUp,   color: "text-amber-500",   fmt: "brl" },
        ].map(({ label, value, icon: Icon, color, fmt }) => (
          <div key={label} className="bg-white rounded-xl p-4 shadow-[0_2px_12px_rgba(2,36,72,0.05)] border border-transparent">
            <div className="flex items-center gap-1.5 mb-1">
              <Icon className={cn("w-3 h-3", color)} />
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
            </div>
            <p className={cn("text-2xl font-extrabold font-headline", color)}>
              {fmt === "brl"
                ? value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
                : value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Operator cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        {stats.map((op) => {
          const statusCfg = STATUS_COLOR[op.activityStatus]
          const convRate  = op.contacts30d > 0
            ? Math.round((op.sales30d / op.contacts30d) * 100)
            : 0

          return (
            <div
              key={op.userId}
              className="bg-white border border-transparent rounded-2xl shadow-[0_2px_16px_rgba(2,36,72,0.07)] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center gap-4 p-5 border-b border-slate-100">
                <div className="relative shrink-0">
                  <UserAvatar
                    avatarUrl={op.avatarUrl}
                    displayName={op.displayName}
                    email={op.email}
                    size={48}
                  />
                  <span className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white",
                    statusCfg.dot
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-[#022448] text-sm">
                      {op.displayName ?? op.email.split("@")[0]}
                    </p>
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full",
                      ROLE_COLOR[op.role] ?? "bg-slate-100 text-slate-600"
                    )}>
                      {ROLE_LABEL[op.role] ?? op.role}
                    </span>
                    <span className={cn("text-[10px] font-semibold", statusCfg.badge)}>
                      {statusCfg.label}
                    </span>
                  </div>
                  {op.jobTitle && (
                    <p className="text-xs text-muted-foreground mt-0.5">{op.jobTitle}</p>
                  )}
                  <div className="flex items-center gap-3 mt-0.5">
                    <p className="text-xs text-muted-foreground truncate">{op.email}</p>
                    {op.lastActivityDate && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 shrink-0">
                        <Calendar className="w-2.5 h-2.5" />
                        último: {op.lastActivityDate.split("-").reverse().join("/")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Deactivate button — owner only, not for self or other owners */}
                {isOwner && op.userId !== user.id && op.role !== "owner" && (
                  <DeactivateMemberButton
                    userId={op.userId}
                    displayName={op.displayName}
                    email={op.email}
                  />
                )}
              </div>

              {/* KPI grid — 2×3 */}
              <div className="grid grid-cols-3 gap-px bg-slate-100">
                <KpiCell
                  icon={PhoneCall}
                  iconColor="text-blue-500"
                  label="Contatos 30d"
                  value={op.contacts30d}
                  sub={op.recentContacts > 0 ? `${op.recentContacts} últimos 3d` : "Nenhum recente"}
                  dimIfZero
                />
                <KpiCell
                  icon={CheckCircle2}
                  iconColor="text-emerald-500"
                  label="Vendas 30d"
                  value={op.sales30d}
                  sub={op.revenue30d > 0
                    ? op.revenue30d.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
                    : "—"}
                  highlight={op.sales30d > 0}
                />
                <KpiCell
                  icon={BarChart3}
                  iconColor="text-purple-500"
                  label="Conversão"
                  value={convRate}
                  valueSuffix="%"
                  sub={`${op.contacts30d} contatos`}
                  dimIfZero
                />
                <KpiCell
                  icon={MessageSquare}
                  iconColor="text-sky-500"
                  label="Inbox aberto"
                  value={op.inboxOpen}
                  sub={`${op.inboxTotal} atribuídas`}
                  dimIfZero
                />
                <KpiCell
                  icon={Target}
                  iconColor="text-violet-500"
                  label="Deals ativos"
                  value={op.dealsActiveCount}
                  sub={op.dealsActiveValue > 0
                    ? op.dealsActiveValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
                    : "Sem valor"}
                  dimIfZero
                />
                <KpiCell
                  icon={Trophy}
                  iconColor="text-amber-500"
                  label="Deals ganhos mês"
                  value={op.dealsWonCount}
                  sub={op.dealsWonValue > 0
                    ? op.dealsWonValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
                    : "—"}
                  highlight={op.dealsWonCount > 0}
                />
              </div>

              {/* Recent activity indicator */}
              {op.recentContacts === 0 && op.contacts30d > 0 && (
                <div className="px-4 py-2.5 bg-amber-50 border-t border-amber-100">
                  <p className="text-[11px] text-amber-700 font-medium">
                    ⚠ Sem lançamentos nos últimos 3 dias — último em {op.lastActivityDate?.split("-").reverse().join("/")}
                  </p>
                </div>
              )}
              {op.contacts30d === 0 && (
                <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100">
                  <p className="text-[11px] text-slate-500 font-medium">
                    Nenhum lançamento registrado nos últimos 30 dias
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Operadores sem perfil vinculado ──────────────────────────────── */}
      {unmatchedOutcomes.length > 0 && (
        <div className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
            Lançamentos por nome (sem vínculo de perfil)
          </p>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Nome</th>
                  <th className="text-right px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Contatos 30d</th>
                  <th className="text-right px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Vendas</th>
                  <th className="text-right px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Receita</th>
                  <th className="text-right px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Últimos 3d</th>
                  <th className="text-right px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Último dia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {unmatchedOutcomes.map((op) => (
                  <tr key={op.name} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-[#022448]">{op.name}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{op.contacts}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={op.sales > 0 ? "text-emerald-700 font-bold" : "text-slate-400"}>
                        {op.sales}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {op.revenue > 0
                        ? op.revenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={op.recentContacts > 0 ? "text-emerald-600 font-semibold" : "text-slate-400"}>
                        {op.recentContacts}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                      {op.lastDate ? op.lastDate.split("-").reverse().join("/") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            Para vincular ao perfil: o operador precisa configurar o Display Name em Configurações → Perfil igual ao nome usado nos lançamentos.
          </p>
        </div>
      )}

      {members.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Users className="w-10 h-10 opacity-30 mb-3" />
          <p className="text-sm">Nenhum membro encontrado.</p>
        </div>
      )}
    </div>
  )
}

// ── KPI cell ──────────────────────────────────────────────────────────────────

function KpiCell({
  icon: Icon,
  iconColor,
  label,
  value,
  valueSuffix,
  sub,
  highlight,
  dimIfZero,
}: {
  icon: React.ElementType
  iconColor: string
  label: string
  value: number
  valueSuffix?: string
  sub?: string
  highlight?: boolean
  dimIfZero?: boolean
}) {
  const dim = dimIfZero && value === 0
  return (
    <div className={cn("bg-white p-3.5", highlight && "bg-amber-50/40")}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className={cn("w-3 h-3", dim ? "text-slate-300" : iconColor)} />
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 leading-none">{label}</p>
      </div>
      <p className={cn(
        "text-xl font-extrabold font-headline",
        highlight ? "text-amber-600" : dim ? "text-slate-300" : "text-[#022448]"
      )}>
        {value}{valueSuffix}
      </p>
      {sub && <p className={cn("text-[10px] mt-0.5", dim ? "text-slate-300" : "text-muted-foreground")}>{sub}</p>}
    </div>
  )
}
