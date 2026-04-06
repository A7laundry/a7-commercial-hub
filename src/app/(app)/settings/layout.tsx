"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { User, Building2, CreditCard, Smartphone, Shield } from "lucide-react"
import { cn } from "@/lib/utils"

const SETTINGS_NAV = [
  { href: "/settings/profile",                  label: "Perfil",        icon: User },
  { href: "/settings/organization",             label: "Organização",   icon: Building2 },
  { href: "/settings/billing",                  label: "Assinatura",    icon: CreditCard },
  { href: "/settings/integrations/whatsapp",   label: "WhatsApp",      icon: Smartphone },
  { href: "/settings/security",                 label: "Segurança",     icon: Shield },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex gap-8 items-start">
      <aside className="hidden md:flex flex-col w-48 shrink-0 pt-1">
        <nav className="space-y-0.5">
          {SETTINGS_NAV.map(({ href, label, icon: Icon }) => {
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
