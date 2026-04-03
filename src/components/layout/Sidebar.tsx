"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTenant } from "@/hooks/useTenant"
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
} from "lucide-react"
import { cn } from "@/lib/utils"

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
      { href: "/deals",    label: "Oportunidades",    icon: Target,   badge: "Novo" },
      { href: "/pipeline", label: "Pipeline (Carteira)", icon: Kanban },
    ],
  },
  {
    label: "Clientes",
    items: [
      { href: "/accounts",  label: "Contas",     icon: Building2 },
      { href: "/contracts", label: "Contratos",  icon: FileText },
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
      { href: "/documents",      label: "Documentos", icon: FolderOpen },
      { href: "/alerts",         label: "Alertas",    icon: Bell },
      { href: "/dashboard/daily",label: "Desempenho", icon: BarChart3 },
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

  return (
    <aside className="w-60 h-screen bg-card border-r border-border flex flex-col fixed left-0 top-0 z-30">
      {/* Brand */}
      <div className="h-14 flex items-center gap-3 px-4 border-b border-border shrink-0">
        <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center shrink-0">
          <span className="text-primary-foreground text-xs font-bold">A7</span>
        </div>
        <span className="text-sm font-semibold truncate">{tenant.name}</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto space-y-4">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon, badge }) => {
                const active = pathname === href || pathname.startsWith(`${href}/`)
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="flex-1 truncate">{label}</span>
                    {badge && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground leading-none">
                        {badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  )
}
