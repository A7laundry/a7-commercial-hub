"use client"

import { useState } from "react"
import { AlertTriangle, X, ArrowRight } from "lucide-react"
import Link from "next/link"
import { useTenant } from "@/hooks/useTenant"
import { useUnreportedYesterday } from "@/hooks/dashboard/useUnreportedYesterday"

export function PendingReportBanner() {
  const { tenant } = useTenant()
  const { data } = useUnreportedYesterday(tenant.id)
  const [dismissed, setDismissed] = useState(false)

  if (!data?.hasPending || dismissed) return null

  const { yesterdayDate, yesterdayFormatted } = data

  return (
    <div
      role="alert"
      className="mb-6 flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
          aria-hidden="true"
        />
        <div>
          <p className="text-sm font-medium text-amber-900">
            Relatório de ontem ({yesterdayFormatted}) não foi fechado. Os lançamentos ficaram sem
            registro.
          </p>
          <Link
            href={`/dashboard/daily?date=${yesterdayDate}`}
            className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-900 hover:underline transition-colors"
          >
            Fechar agora
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Fechar aviso"
        className="shrink-0 rounded p-0.5 text-amber-600 hover:bg-amber-100 hover:text-amber-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}
