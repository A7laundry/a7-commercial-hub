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
} from "lucide-react"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/accounts",  label: "Contas",    icon: Building2 },
  { href: "/contracts", label: "Contratos", icon: FileText },
  { href: "/documents", label: "Documentos",icon: FolderOpen },
  { href: "/alerts",    label: "Alertas",   icon: Bell },
] as const

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
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon }) => {
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
              {label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
