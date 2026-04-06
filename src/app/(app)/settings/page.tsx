"use client"

import Link from "next/link"
import { useTenant } from "@/hooks/useTenant"
import { usePlan } from "@/hooks/usePlan"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User, Building2, CreditCard, Smartphone, Shield, ChevronRight } from "lucide-react"

export default function SettingsPage() {
  const { tenant, currentUser } = useTenant()
  const planState = usePlan(tenant.id)

  const cards = [
    {
      href: "/settings/profile",
      icon: User,
      title: "Perfil",
      description: "Nome, email e senha da sua conta",
      badge: currentUser.email,
    },
    {
      href: "/settings/organization",
      icon: Building2,
      title: "Organização",
      description: "Nome, logo e dados do tenant",
      badge: tenant.name,
    },
    {
      href: "/settings/billing",
      icon: CreditCard,
      title: "Assinatura",
      description: "Plano, cobrança e upgrade",
      badge: planState.isLoading ? null : planState.planName,
      badgeVariant: planState.isTrial ? "secondary" : "default",
    },
    {
      href: "/settings/integrations/whatsapp",
      icon: Smartphone,
      title: "WhatsApp",
      description: "Integração com WhatsApp Business",
      badge: null,
    },
    {
      href: "/settings/security",
      icon: Shield,
      title: "Segurança",
      description: "Senha e sessões ativas",
      badge: null,
    },
  ] as const

  return (
    <>
      <PageHeader
        title="Configurações"
        description="Gerencie seu perfil, organização, billing e integrações"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
        {cards.map(({ href, icon: Icon, title, description, badge }) => (
          <Link key={href} href={href}>
            <Card className="h-full cursor-pointer hover:shadow-md transition-shadow hover:border-muted-foreground/30">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
                <CardTitle className="text-sm font-semibold mt-2">{title}</CardTitle>
                <CardDescription className="text-xs">{description}</CardDescription>
              </CardHeader>
              {badge && (
                <CardContent className="pt-0">
                  <Badge variant="secondary" className="text-[10px] truncate max-w-full font-normal">
                    {badge}
                  </Badge>
                </CardContent>
              )}
            </Card>
          </Link>
        ))}
      </div>
    </>
  )
}
