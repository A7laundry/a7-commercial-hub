"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { User, Building2, CreditCard, Smartphone, Shield, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTenantContext } from "@/components/providers/TenantProvider"

const BASE_NAV = [
  { href: "/settings/profile",                label: "Perfil",        icon: User,       adminOnly: false },
  { href: "/settings/organization",           label: "Organização",   icon: Building2,  adminOnly: false },
  { href: "/settings/team",                   label: "Equipe",        icon: Users,      adminOnly: true  },
  { href: "/settings/billing",                label: "Assinatura",    icon: CreditCard, adminOnly: false },
  { href: "/settings/integrations/whatsapp", label: "WhatsApp",      icon: Smartphone, adminOnly: false },
  { href: "/settings/security",               label: "Segurança",     icon: Shield,     adminOnly: false },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { currentUser } = useTenantContext()
  const isAdmin = ["owner", "admin"].includes(currentUser.role)

  const nav = BASE_NAV.filter((item) => !item.adminOnly || isAdmin)

  return (
    <div className="flex gap-8 items-start">
      <aside className="hidden md:flex flex-col w-48 shrink-0 pt-1">
        <nav className="space-y-0.5">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`)
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
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}
