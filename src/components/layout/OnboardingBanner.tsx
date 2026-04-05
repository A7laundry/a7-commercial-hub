"use client"

import { useOnboardingState } from "@/hooks/useOnboardingState"
import { useTenant } from "@/hooks/useTenant"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Sparkles, X } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

export function OnboardingBanner() {
  const { tenant } = useTenant()
  const onboarding = useOnboardingState(tenant.id)
  const pathname = usePathname()
  const [dismissed, setDismissed] = useState(false)

  // Don't show on welcome page, dashboard, or if dismissed or loading or complete
  if (
    dismissed ||
    onboarding.isLoading ||
    onboarding.allDone ||
    pathname === "/welcome" ||
    pathname === "/dashboard"
  ) {
    return null
  }

  return (
    <div className={cn(
      "flex items-center justify-between gap-3 px-4 py-2.5",
      "bg-primary/5 border-b border-primary/20 text-sm"
    )}>
      <div className="flex items-center gap-2 text-primary">
        <Sparkles className="w-3.5 h-3.5 shrink-0" />
        <span className="font-medium">
          Configure o A7X: {onboarding.completedCount}/{onboarding.totalCount} passos concluídos
        </span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <Link
          href="/welcome"
          className="text-xs font-semibold text-primary hover:underline"
        >
          Continuar configuração →
        </Link>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Fechar"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
