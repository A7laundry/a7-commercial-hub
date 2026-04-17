"use client"

import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { DashboardMonthData } from "@/hooks/dashboard/useDashboardMonth"

// ── Types ─────────────────────────────────────────────────────────────────────

type ActivityFeedProps = {
  activities: DashboardMonthData["recentActivity"]
  isLoading: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(createdAt: string): string {
  const diffMs = Date.now() - new Date(createdAt).getTime()
  const diffMin = Math.floor(diffMs / (1000 * 60))

  if (diffMin < 1) return "agora"
  if (diffMin < 60) return `há ${diffMin}min`

  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `há ${diffH}h`

  const diffD = Math.floor(diffH / 24)
  return `há ${diffD}d`
}

function getDotColor(eventType: string): string {
  switch (eventType) {
    case "created":
      return "bg-green-400"
    case "stage_changed":
      return "bg-blue-400"
    case "contact":
      return "bg-amber-400"
    default:
      return "bg-slate-300"
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ActivityFeed({ activities, isLoading }: ActivityFeedProps) {
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3
          className="text-[13px] font-bold text-[#022448]"
          style={{ fontFamily: "Manrope, sans-serif" }}
        >
          Atividade Recente
        </h3>
        <Link
          href="/accounts"
          className="text-[11px] font-semibold text-[#3b82f6] hover:underline"
        >
          Ver tudo
        </Link>
      </div>

      {/* Feed */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 py-1">
              <Skeleton className="w-2 h-2 rounded-full mt-1.5 shrink-0" />
              <Skeleton className="flex-1 h-4" />
              <Skeleton className="w-10 h-3 shrink-0" />
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <p className="text-[13px] text-slate-400 py-4 text-center">
          Nenhuma atividade recente
        </p>
      ) : (
        <div role="feed" aria-label="Atividade recente">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-3 py-2.5 border-b border-slate-50 last:border-0"
              role="article"
            >
              <div
                className={cn(
                  "w-2 h-2 rounded-full mt-1.5 shrink-0",
                  getDotColor(activity.eventType)
                )}
                aria-hidden="true"
              />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-[#022448] font-medium truncate">
                  {activity.accountName && (
                    <span className="font-semibold">{activity.accountName}</span>
                  )}
                  {activity.accountName && " — "}
                  {activity.description ?? activity.eventType}
                </p>
              </div>
              <time
                className="text-[11px] text-slate-400 shrink-0"
                dateTime={activity.createdAt}
                title={new Date(activity.createdAt).toLocaleString("pt-BR")}
              >
                {timeAgo(activity.createdAt)}
              </time>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
