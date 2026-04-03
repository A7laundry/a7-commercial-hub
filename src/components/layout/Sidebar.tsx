"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTenant } from "@/hooks/useTenant"
import { useOpenAlertsCount } from "@/hooks/alerts/useOpenAlertsCount"
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
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useSidebarCollapsed } from "./AppShell"

type NavItem = {
  href: string
  label: string
  icon: React.ElementType
  badge?: string
}

type NavGroup = {
  label?: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Operações",
    items: [
      { href: "/deals",    label: "Oportunidades",     icon: Target,   badge: "Novo" },
      { href: "/pipeline", label: "Pipeline (Carteira)", icon: Kanban },
    ],
  },
  {
    label: "Clientes",
    items: [
      { href: "/accounts",  label: "Contas",    icon: Building2 },
      { href: "/contracts", label: "Contratos", icon: FileText },
    ],
  },
  {
    label: "Comunicação",
    items: [
      { href: "/inbox",     label: "Inbox",     icon: MessageSquare },
      { href: "/campaigns", label: "Campanhas", icon: Megaphone },
    ],
  },
  {
    label: "Gestão",
    items: [
      { href: "/documents",       label: "Documentos", icon: FolderOpen },
      { href: "/alerts",          label: "Alertas",    icon: Bell },
      { href: "/dashboard/daily", label: "Desempenho", icon: BarChart3 },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/portal-clients", label: "Portal B2B", icon: Globe },
      { href: "/import",         label: "Importar",   icon: Upload },
      { href: "/guide",          label: "Guia",       icon: BookOpen },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { tenant } = useTenant()
  const { collapsed, toggle } = useSidebarCollapsed()
  const { data: openAlertsCount = 0 } = useOpenAlertsCount(tenant.id)

  return (
    <aside
      className={cn(
        "h-screen bg-sidebar border-r border-sidebar-border flex flex-col fixed left-0 top-0 z-30 transition-all duration-300",
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

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto space-y-4">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi}>
            {group.label && !collapsed && (
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon, badge }) => {
                const active = pathname === href || pathname.startsWith(`${href}/`)
                const alertBadge = href === "/alerts" && openAlertsCount > 0 ? openAlertsCount : null
                return (
                  <Link
                    key={href}
                    href={href}
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
                        {badge && !alertBadge && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-sidebar-primary text-sidebar-primary-foreground leading-none">
                            {badge}
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

      {/* Footer: tenant name */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-sidebar-border shrink-0">
          <p className="text-xs text-sidebar-foreground/60 truncate">{tenant.name}</p>
        </div>
      )}
    </aside>
  )
}
