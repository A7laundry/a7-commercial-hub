import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { PageHeader } from "@/components/shared/PageHeader"
import { UserAvatar } from "@/components/shared/UserAvatar"
import { cn } from "@/lib/utils"
import { MessageSquare, Target, Trophy, Users, TrendingUp, Calendar } from "lucide-react"

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
  const service = createServiceClient()

  // Fetch all members
  const { data: members = [] } = await supabase
    .from("tenant_users")
    .select("user_id, role, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at")

  const userIds = members.map((m) => m.user_id)

  // Fetch profiles, conversations, deals and auth emails in parallel
  const [profilesRes, conversationsRes, dealsRes, timelineRes, authUsersRes] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("user_id, display_name, job_title, avatar_url")
      .in("user_id", userIds),
    supabase
      .from("wa_conversations")
      .select("assigned_to, status, unread_count")
      .eq("tenant_id", tenantId)
      .not("assigned_to", "is", null),
    supabase
      .from("deals")
      .select("assigned_to, stage, value, won_at")
      .eq("tenant_id", tenantId)
      .not("assigned_to", "is", null),
    supabase
      .from("account_timeline")
      .select("created_by")
      .eq("tenant_id", tenantId)
      .not("created_by", "is", null)
      .gte("created_at", new Date(Date.now() - 30 * 86400_000).toISOString()),
    service.auth.admin.listUsers({ perPage: 1000 }),
  ])

  const profiles = profilesRes.data ?? []
  const conversations = conversationsRes.data ?? []
  const deals = dealsRes.data ?? []
  const timelineRows = timelineRes.data ?? []
  const authUsers = authUsersRes.data?.users ?? []

  // Build fast lookup maps
  const profileMap = new Map(profiles.map((p) => [p.user_id, p]))
  const emailMap = new Map(authUsers.map((u) => [u.id, u.email ?? ""]))

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  // Count timeline events (last 30d) per user
  const timelineCountMap = new Map<string, number>()
  for (const row of timelineRows) {
    if (row.created_by) {
      timelineCountMap.set(row.created_by, (timelineCountMap.get(row.created_by) ?? 0) + 1)
    }
  }

  const stats = members.map((member) => {
    const profile = profileMap.get(member.user_id)
    const email = emailMap.get(member.user_id) ?? ""

    const myConversations = conversations.filter((c) => c.assigned_to === member.user_id)
    const myDeals = deals.filter((d) => d.assigned_to === member.user_id)

    const inboxOpen = myConversations.filter((c) => c.status === "open").length
    const inboxTotal = myConversations.length

    const dealsActive = myDeals.filter((d) => !["won", "lost"].includes(d.stage))
    const dealsActiveCount = dealsActive.length
    const dealsActiveValue = dealsActive.reduce((s, d) => s + (d.value ?? 0), 0)

    const dealsWonMonth = myDeals.filter(
      (d) => d.stage === "won" && d.won_at && d.won_at >= monthStart
    )
    const dealsWonCount = dealsWonMonth.length
    const dealsWonValue = dealsWonMonth.reduce((s, d) => s + (d.value ?? 0), 0)

    const actionsLast30d = timelineCountMap.get(member.user_id) ?? 0

    return {
      userId: member.user_id,
      role: member.role,
      memberSince: member.created_at,
      displayName: profile?.display_name ?? null,
      jobTitle: profile?.job_title ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      email,
      inboxOpen,
      inboxTotal,
      dealsActiveCount,
      dealsActiveValue,
      dealsWonCount,
      dealsWonValue,
      actionsLast30d,
    }
  })

  const totalDealsWon = stats.reduce((s, op) => s + op.dealsWonCount, 0)
  const totalInboxOpen = stats.reduce((s, op) => s + op.inboxOpen, 0)

  return (
    <div>
      <PageHeader
        title="Equipe"
        description={`${members.length} membro${members.length !== 1 ? "s" : ""} · desempenho do mês atual`}
      />

      {/* Summary strip */}
      {members.length > 1 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Membros ativos", value: members.length, icon: Users, color: "text-[#022448]" },
            { label: "Inbox aberto (total)", value: totalInboxOpen, icon: MessageSquare, color: "text-blue-600" },
            { label: "Deals ganhos no mês", value: totalDealsWon, icon: Trophy, color: "text-amber-500" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl p-4 shadow-[0_2px_12px_rgba(2,36,72,0.05)] border border-transparent">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className={cn("w-3 h-3", color)} />
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
              </div>
              <p className={cn("text-2xl font-extrabold font-headline", color)}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Operator cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {stats.map((op) => (
          <div
            key={op.userId}
            className="bg-white border border-transparent rounded-2xl shadow-[0_2px_16px_rgba(2,36,72,0.07)] overflow-hidden"
          >
            {/* Operator header */}
            <div className="flex items-center gap-4 p-5 border-b border-slate-100">
              <UserAvatar
                avatarUrl={op.avatarUrl}
                displayName={op.displayName}
                email={op.email}
                size={48}
              />
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
                </div>
                {op.jobTitle && (
                  <p className="text-xs text-muted-foreground mt-0.5">{op.jobTitle}</p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{op.email}</p>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
                <Calendar className="w-3 h-3" />
                {new Date(op.memberSince).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}
              </div>
            </div>

            {/* KPI grid */}
            <div className="grid grid-cols-2 gap-px bg-slate-100">
              <KpiCell
                icon={MessageSquare}
                iconColor="text-blue-500"
                label="Inbox aberto"
                value={op.inboxOpen}
                sub={`${op.inboxTotal} conversa${op.inboxTotal !== 1 ? "s" : ""} atribuída${op.inboxTotal !== 1 ? "s" : ""}`}
              />
              <KpiCell
                icon={TrendingUp}
                iconColor="text-purple-500"
                label="Deals em andamento"
                value={op.dealsActiveCount}
                sub={
                  op.dealsActiveValue > 0
                    ? op.dealsActiveValue.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                        maximumFractionDigits: 0,
                      })
                    : "Sem valor registrado"
                }
              />
              <KpiCell
                icon={Trophy}
                iconColor="text-amber-500"
                label="Deals ganhos no mês"
                value={op.dealsWonCount}
                sub={
                  op.dealsWonValue > 0
                    ? op.dealsWonValue.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                        maximumFractionDigits: 0,
                      })
                    : "—"
                }
                highlight={op.dealsWonCount > 0}
              />
              <KpiCell
                icon={Target}
                iconColor="text-emerald-500"
                label="Ações últimos 30d"
                value={op.actionsLast30d}
                sub="registros de atividade"
              />
            </div>
          </div>
        ))}
      </div>

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
  sub,
  highlight,
}: {
  icon: React.ElementType
  iconColor: string
  label: string
  value: number
  sub?: string
  highlight?: boolean
}) {
  return (
    <div className={cn("bg-white p-4", highlight && "bg-amber-50/40")}>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className={cn("w-3 h-3", iconColor)} />
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      </div>
      <p className={cn(
        "text-2xl font-extrabold font-headline",
        highlight ? "text-amber-600" : "text-[#022448]"
      )}>
        {value}
      </p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  )
}
