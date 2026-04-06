"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, Building2, CreditCard } from "lucide-react"
import { cn } from "@/lib/utils"

const ADMIN_NAV = [
  { href: "/admin",               label: "Visão geral",   icon: LayoutDashboard },
  { href: "/admin/users",         label: "Usuários",      icon: Users },
  { href: "/admin/organizations", label: "Organizações",  icon: Building2 },
  { href: "/admin/subscriptions", label: "Assinaturas",   icon: CreditCard },
]

export function AdminSubNav() {
  const pathname = usePathname()
  return (
    <aside className="hidden md:flex flex-col w-48 shrink-0 pt-1">
      <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
        Admin
      </p>
      <nav className="space-y-0.5">
        {ADMIN_NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/admin" ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                active
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
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
