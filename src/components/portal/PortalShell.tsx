"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { usePortalSession } from "@/components/providers/PortalProvider"
import { useTransition } from "react"
import { portalSignOutAction } from "@/app/portal/(auth)/login/actions"
import {
  LayoutDashboard,
  FileText,
  FolderOpen,
  Receipt,
  MessageCircle,
  LogOut,
} from "lucide-react"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/portal/dashboard",  label: "Início",       icon: LayoutDashboard },
  { href: "/portal/contracts",  label: "Contratos",    icon: FileText },
  { href: "/portal/documents",  label: "Documentos",   icon: FolderOpen },
  { href: "/portal/invoices",   label: "Financeiro",   icon: Receipt },
  { href: "/portal/support",    label: "Suporte",      icon: MessageCircle },
] as const

export function PortalShell({ children }: { children: React.ReactNode }) {
  const { account, tenant, portalClient } = usePortalSession()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top header */}
      <header className="h-14 border-b border-border bg-card flex items-center px-4 gap-4 shrink-0">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center shrink-0">
            <span className="text-primary-foreground text-xs font-bold">A7</span>
          </div>
          <div className="hidden sm:block">
            <p className="text-xs text-muted-foreground leading-none">{tenant.name}</p>
            <p className="text-sm font-semibold leading-tight mt-0.5">{account.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-muted-foreground">Olá,</p>
            <p className="text-xs font-medium">{portalClient.name ?? portalClient.email}</p>
          </div>
          <button
            onClick={() => startTransition(() => portalSignOutAction())}
            disabled={isPending}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-md hover:bg-muted"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sair
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar nav */}
        <aside className="w-52 shrink-0 border-r border-border bg-card hidden md:flex flex-col py-3 px-2">
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
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden border-t border-border bg-card flex items-center justify-around px-2 py-2 shrink-0">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-md transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
