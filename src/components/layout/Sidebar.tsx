"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTenant } from "@/hooks/useTenant"
import { useOpenAlertsCount } from "@/hooks/alerts/useOpenAlertsCount"
import { useInboxUnreadCount } from "@/hooks/inbox/useInboxUnreadCount"
import {
  LayoutDashboard,
  Building2,
  FileText,
  FolderOpen,
  Bell,
  Kanban,
  Upload,
  Globe,
  Megaphone,
  MessageSquare,
  BarChart3,
  BookOpen,
  Target,
  ChevronLeft,
  ListChecks,
  Menu,
  Settings2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useSidebarCollapsed } from "./AppShell"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useState } from "react"

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
    label: "Hoje",
    highlighted: true,
    items: [
      { href: "/execution", label: "Minha Fila", icon: ListChecks },
      { href: "/inbox",     label: "Inbox",      icon: MessageSquare },
    ],
  },
  {
    label: "Clientes",
    items: [
      { href: "/accounts",  label: "Contas",     icon: Building2 },
      { href: "/campaigns", label: "Campanhas",  icon: Megaphone },
    ],
  },
  {
    label: "Negócios",
    items: [
      { href: "/deals",    label: "Oportunidades", icon: Target },
      { href: "/pipeline", label: "Carteira",      icon: Kanban },
    ],
  },
  {
    label: "Contratos",
    items: [
      { href: "/contracts", label: "Contratos",  icon: FileText },
      { href: "/documents", label: "Documentos", icon: FolderOpen },
      { href: "/alerts",    label: "Alertas",    icon: Bell },
    ],
  },
  {
    label: "Analytics",
    items: [
      { href: "/dashboard/daily", label: "Desempenho", icon: BarChart3 },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/portal-clients",                     label: "Portal B2B",  icon: Globe },
      { href: "/import",                             label: "Importar",    icon: Upload },
      { href: "/guide",                              label: "Guia",        icon: BookOpen },
      { href: "/settings",                             label: "Configurações", icon: Settings2 },
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
}

function NavContent({
  collapsed = false,
  pathname,
  openAlertsCount,
  inboxUnreadCount,
  onNavigate,
}: NavContentProps) {
  return (
    <nav className="flex-1 py-3 px-2 overflow-y-auto">
      {NAV_GROUPS.map((group, gi) => (
        <div key={gi}>
          {/* Separator between groups (skip before first) */}
          {gi > 0 && (
            <div className="mx-3 my-2 border-t border-sidebar-border/60" />
          )}

          {/* Group label */}
          {group.label && !collapsed && (
            <p
              className={cn(
                "px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest",
                group.highlighted
                  ? "text-primary"
                  : "text-sidebar-foreground/40"
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
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  title={collapsed ? label : undefined}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    collapsed && "justify-center px-2",
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 truncate">{label}</span>
                      {alertBadge && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-500 text-white leading-none">
                          {alertBadge > 99 ? "99+" : alertBadge}
                        </span>
                      )}
                      {inboxBadge && !alertBadge && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-500 text-white leading-none">
                          {inboxBadge > 99 ? "99+" : inboxBadge}
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
  const { tenant } = useTenant()
  const { data: openAlertsCount = 0 } = useOpenAlertsCount(tenant.id)
  const { data: inboxUnreadCount = 0 } = useInboxUnreadCount(tenant.id)

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
      <SheetContent side="left" className="w-[240px] p-0 bg-sidebar border-sidebar-border flex flex-col">
        <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
        <div className="h-14 flex items-center px-4 border-b border-sidebar-border shrink-0">
          <span className="text-base font-bold text-sidebar-primary-foreground tracking-tight font-heading">
            A7X
          </span>
        </div>
        <NavContent
          pathname={pathname}
          openAlertsCount={openAlertsCount}
          inboxUnreadCount={inboxUnreadCount}
          onNavigate={() => setOpen(false)}
        />
        <div className="px-4 py-3 border-t border-sidebar-border shrink-0">
          <p className="text-xs text-sidebar-foreground/60 truncate">{tenant.name}</p>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ── Desktop sidebar ───────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname()
  const { tenant } = useTenant()
  const { collapsed, toggle } = useSidebarCollapsed()
  const { data: openAlertsCount = 0 } = useOpenAlertsCount(tenant.id)
  const { data: inboxUnreadCount = 0 } = useInboxUnreadCount(tenant.id)

  return (
    <aside
      className={cn(
        "hidden lg:flex h-screen bg-sidebar border-r border-sidebar-border flex-col fixed left-0 top-0 z-30 transition-all duration-300",
        collapsed ? "w-[68px]" : "w-60"
      )}
    >
      {/* Brand */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-sidebar-border shrink-0">
        {!collapsed && (
          <span className="text-base font-bold text-sidebar-primary-foreground tracking-tight font-heading truncate">
            A7X
          </span>
        )}
        <button
          onClick={toggle}
          className={cn(
            "flex items-center justify-center w-7 h-7 rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition-colors shrink-0",
            collapsed && "mx-auto"
          )}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          <ChevronLeft
            className={cn("w-4 h-4 transition-transform duration-300", collapsed && "rotate-180")}
          />
        </button>
      </div>

      <NavContent
        collapsed={collapsed}
        pathname={pathname}
        openAlertsCount={openAlertsCount}
        inboxUnreadCount={inboxUnreadCount}
      />

      {/* Footer: tenant name */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-sidebar-border shrink-0">
          <p className="text-xs text-sidebar-foreground/60 truncate">{tenant.name}</p>
        </div>
      )}
    </aside>
  )
}
