"use client"

import Link from "next/link"
import { Lock, Zap } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type UpgradeGateProps = {
  reason: string
  className?: string
}

export function UpgradeGate({ reason, className }: UpgradeGateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 text-center",
      className
    )}>
      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
        <Lock className="w-5 h-5 text-primary" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{reason}</p>
      </div>
      <Link href="/settings/billing" className={cn(buttonVariants({ size: "sm" }), "gap-2")}>
        <Zap className="w-3.5 h-3.5" />
        Ver planos
      </Link>
    </div>
  )
}
