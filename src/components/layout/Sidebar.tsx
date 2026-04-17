"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTenantContext } from "@/components/providers/TenantProvider"
import { useOpenAlertsCount } from "@/hooks/alerts/useOpenAlertsCount"
import { useInboxUnreadCount } from "@/hooks/inbox/useInboxUnreadCount"
import { useExecutionQueue } from "@/hooks/dashboard/useExecutionQueue"
import { useUserProfile } from "@/hooks/useUserProfile"
import { UserAvatar } from "@/components/shared/UserAvatar"
import {
  LayoutDashboard,
  Building2,
  FileText,
  FolderOpen,
  Bell,
  Kanban,
  Megaphone,
  MessageSquare,
  FileBarChart2,
  ChevronLeft,
  ListChecks,
  Menu,
  Settings2,
  ShieldAlert,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useSidebarCollapsed } from "./AppShell"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useState } from "react"

const ROLE_LABEL: Record<string, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  member: "Membro",
  viewer: "Visualizador",
}

type NavItem = {
  href: string
  label: string
  icon: React.ElementType
  badge?: string
}

type NavGroup = {
  label?: string
  highlighted?: boolean   // renders label in primary color
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Ação Diária",
    highlighted: true,
    items: [
      { href: "/execution", label: "Minha Fila", icon: ListChecks },
      { href: "/inbox",     label: "Inbox",      icon: MessageSquare },
    ],
  },
  {
    label: "Comercial",
    items: [
      { href: "/accounts",  label: "Clientes",  icon: Building2 },
      { href: "/pipeline",  label: "Pipeline",  icon: Kanban },
      { href: "/campaigns", label: "Campanhas", icon: Megaphone },
    ],
  },
  {
    label: "Gestão",
    items: [
      { href: "/contracts", label: "Contratos",  icon: FileText },
      { href: "/documents", label: "Documentos", icon: FolderOpen },
      { href: "/alerts",    label: "Alertas",    icon: Bell },
    ],
  },
  {
    items: [
      { href: "/relatorios", label: "Relatórios",    icon: FileBarChart2 },
      { href: "/settings",   label: "Configurações", icon: Settings2 },
    ],
  },
]

// ── Nav content (shared between desktop sidebar and mobile sheet) ─────────────

type NavContentProps = {
  collapsed?: boolean
  pathname: string
  openAlertsCount: number
  inboxUnreadCount: number
  executionUrgentCount?: number
  onNavigate?: () => void
  isAdmin?: boolean
}

function NavContent({
  collapsed = false,
  pathname,
  openAlertsCount,
  inboxUnreadCount,
  executionUrgentCount = 0,
  onNavigate,
  isAdmin = false,
}: NavContentProps) {

  const groups: NavGroup[] = [
    ...NAV_GROUPS,
    ...(isAdmin
      ? [{ label: "Admin", items: [{ href: "/admin", label: "Admin Panel", icon: ShieldAlert }] }]
      : []),
  ]

  return (
    <nav className="flex-1 py-3 px-2 overflow-y-auto">
      {groups.map((group, gi) => (
        <div key={gi}>
          {/* Separator between groups (skip before first) */}
          {gi > 0 && (
            <div className="mx-3 my-2 border-t border-white/8" />
          )}

          {/* Group label */}
          {group.label && !collapsed && (
            <p
              className={cn(
                "px-3 mb-1 text-[9px] font-bold uppercase tracking-[0.12em]",
                group.highlighted
                  ? "text-[#F5A623]"
                  : "text-white/30"
              )}
            >
              {group.label}
            </p>
          )}

          <div className="space-y-0.5">
            {group.items.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`)
              const alertBadge = href === "/alerts" && openAlertsCount > 0 ? openAlertsCount : null
              const inboxBadge = href === "/inbox" && inboxUnreadCount > 0 ? inboxUnreadCount : null
              const executionBadge = href === "/execution" && executionUrgentCount > 0 ? executionUrgentCount : null
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  title={collapsed ? label : undefined}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 text-sm font-medium transition-all duration-150",
                    collapsed ? "justify-center px-2 rounded-lg" : "rounded-lg",
                    active
                      ? collapsed
                        ? "bg-amber-500/15 text-amber-400"
                        : "border-l-4 border-amber-500 bg-white/5 text-amber-400 font-bold rounded-l-none pl-[0.625rem]"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Icon className={cn("w-4 h-4 shrink-0", active ? "text-amber-400" : "text-slate-400")} />
                  {!collapsed && (
                    <>
                      <span className="flex-1 truncate">{label}</span>
                      {alertBadge && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-500 text-white leading-none">
                          {alertBadge > 99 ? "99+" : alertBadge}
                        </span>
                      )}
                      {inboxBadge && !alertBadge && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-400 text-white leading-none">
                          {inboxBadge > 99 ? "99+" : inboxBadge}
                        </span>
                      )}
                      {executionBadge && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-500 text-white leading-none">
                          {executionBadge > 99 ? "99+" : executionBadge}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}

// ── Mobile sidebar trigger (hamburger → Sheet) ────────────────────────────────

export function MobileSidebarTrigger() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const { tenant, currentUser, isSuperAdmin } = useTenantContext()
  const { data: openAlertsCount = 0 } = useOpenAlertsCount(tenant.id)
  const { data: inboxUnreadCount = 0 } = useInboxUnreadCount(tenant.id)
  const { data: executionItems = [] } = useExecutionQueue(tenant.id)
  const { data: profile } = useUserProfile(currentUser.user_id)

  const executionUrgentCount = executionItems.filter((i) => i.urgency === "urgent").length
  const displayName = profile?.display_name ?? null
  const avatarUrl = profile?.avatar_url ?? null
  const roleLabel = ROLE_LABEL[currentUser.role] ?? currentUser.role

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <button
            className="lg:hidden flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Abrir menu"
          />
        }
      >
        <Menu className="w-5 h-5" />
      </SheetTrigger>
      <SheetContent
        side="left"
        style={{ background: "linear-gradient(to bottom, #022448, #0a3060)" }}
        className="w-[240px] p-0 border-white/8 flex flex-col"
      >
        <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
        <div className="h-14 flex items-center px-4 border-b border-white/8 shrink-0">
          <span className="text-base font-extrabold text-white tracking-tight font-headline">A7X</span>
          <span className="text-[10px] font-semibold text-[#F5A623]/80 uppercase tracking-widest ml-2">CRM</span>
        </div>
        {/* Profile card */}
        <div className="px-6 py-5 flex flex-col items-center border-b border-white/8 shrink-0">
          <div className="relative mb-2">
            <div className="p-0.5 rounded-full border-2 border-amber-500">
              <UserAvatar avatarUrl={avatarUrl} displayName={displayName} email={currentUser.email} size={64} />
            </div>
            <span className="absolute bottom-1 right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0a3060]" />
          </div>
          <p className="font-headline font-bold text-white text-sm text-center truncate w-full">
            {displayName ?? currentUser.email}
          </p>
          <p className="text-slate-300 text-xs mt-0.5">{roleLabel}</p>
        </div>
        {/* Nova Lead button */}
        <div className="px-4 py-3 shrink-0">
          <Link
            href="/accounts?action=new"
            onClick={() => setOpen(false)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-headline font-bold text-sm text-white shadow-lg active:scale-95 transition-transform"
            style={{ background: "linear-gradient(to right, #F5A623, #D48C1D)" }}
          >
            <span className="text-lg leading-none">+</span>
            Nova Lead
          </Link>
        </div>
        <NavContent
          pathname={pathname}
          openAlertsCount={openAlertsCount}
          inboxUnreadCount={inboxUnreadCount}
          executionUrgentCount={executionUrgentCount}
          onNavigate={() => setOpen(false)}
          isAdmin={isSuperAdmin || currentUser.role === "owner" || currentUser.role === "admin"}
        />
      </SheetContent>
    </Sheet>
  )
}

// ── Desktop sidebar ───────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname()
  const { tenant, currentUser, isSuperAdmin } = useTenantContext()
  const { collapsed, toggle } = useSidebarCollapsed()
  const { data: openAlertsCount = 0 } = useOpenAlertsCount(tenant.id)
  const { data: inboxUnreadCount = 0 } = useInboxUnreadCount(tenant.id)
  const { data: executionItems = [] } = useExecutionQueue(tenant.id)
  const { data: profile } = useUserProfile(currentUser.user_id)

  const executionUrgentCount = executionItems.filter((i) => i.urgency === "urgent").length
  const displayName = profile?.display_name ?? null
  const avatarUrl = profile?.avatar_url ?? null
  const roleLabel = ROLE_LABEL[currentUser.role] ?? currentUser.role

  return (
    <aside
      style={{ background: "linear-gradient(to bottom, #022448, #0a3060)" }}
      className={cn(
        "hidden lg:flex h-screen border-r border-white/8 flex-col fixed left-0 top-0 z-30 transition-all duration-300",
        collapsed ? "w-[68px]" : "w-60"
      )}
    >
      {/* Brand */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-white/8 shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base font-extrabold text-white tracking-tight font-headline truncate">
              A7X
            </span>
            <span className="text-[10px] font-semibold text-[#F5A623]/80 uppercase tracking-widest hidden xl:block">
              CRM
            </span>
          </div>
        )}
        <button
          onClick={toggle}
          className={cn(
            "flex items-center justify-center w-7 h-7 rounded-md text-white/50 hover:bg-white/8 hover:text-white transition-colors shrink-0",
            collapsed && "mx-auto"
          )}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          <ChevronLeft
            className={cn("w-4 h-4 transition-transform duration-300", collapsed && "rotate-180")}
          />
        </button>
      </div>

      {/* ── User profile card (Stitch design) — expanded only ── */}
      {!collapsed && (
        <div className="px-6 py-6 flex flex-col items-center border-b border-white/8 shrink-0">
          <div className="relative mb-3">
            <div className="p-0.5 rounded-full border-2 border-amber-500">
              <UserAvatar
                avatarUrl={avatarUrl}
                displayName={displayName}
                email={currentUser.email}
                size={72}
              />
            </div>
            {/* Online presence dot */}
            <span className="absolute bottom-1 right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0a3060]" />
          </div>
          <p className="font-headline font-bold text-white text-base leading-tight text-center truncate w-full">
            {displayName ?? currentUser.email}
          </p>
          <p className="text-slate-300 text-xs font-medium mt-0.5">{roleLabel}</p>
        </div>
      )}

      {/* ── Nova Lead button ── */}
      {!collapsed && (
        <div className="px-4 py-4 shrink-0">
          <Link
            href="/accounts?action=new"
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-headline font-bold text-sm text-white shadow-lg shadow-amber-900/20 active:scale-95 transition-transform"
            style={{ background: "linear-gradient(to right, #F5A623, #D48C1D)" }}
          >
            <span className="text-lg leading-none">+</span>
            Nova Lead
          </Link>
        </div>
      )}

      <NavContent
        collapsed={collapsed}
        pathname={pathname}
        openAlertsCount={openAlertsCount}
        inboxUnreadCount={inboxUnreadCount}
        executionUrgentCount={executionUrgentCount}
        isAdmin={isSuperAdmin || currentUser.role === "owner" || currentUser.role === "admin"}
      />

      {/* Footer: collapsed = small avatar only */}
      {collapsed && (
        <div className="px-2 py-3 border-t border-white/8 flex justify-center shrink-0">
          <div className="relative">
            <UserAvatar
              avatarUrl={avatarUrl}
              displayName={displayName}
              email={currentUser.email}
              size={32}
            />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0a3060]" />
          </div>
        </div>
      )}
    </aside>
  )
}
