import { ArrowRight, Zap, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { cn } from "@/lib/utils"
import type { Recommendation } from "@/lib/account-summary"

// Static priority config — outside component
const PRIORITY_CONFIG = {
  urgent: {
    badge: "bg-red-100 text-red-700 ring-1 ring-red-200",
    label: "Urgente",
    dot: "bg-red-500",
    rowBorder: "border-red-100",
    rowBg: "bg-red-50/60",
    accentBar: "bg-red-500",
    btnClass: "bg-red-600 hover:bg-red-700 text-white border-transparent",
  },
  recommended: {
    badge: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
    label: "Recomendado",
    dot: "bg-amber-400",
    rowBorder: "border-amber-100",
    rowBg: "bg-amber-50/60",
    accentBar: "bg-amber-400",
    btnClass: "border-amber-300 text-amber-800 hover:bg-amber-50",
  },
} as const

type RecommendationsBlockProps = {
  recommendations: Recommendation[]
}

export function RecommendationsBlock({ recommendations }: RecommendationsBlockProps) {
  if (recommendations.length === 0) {
    return (
      <div className="crm-card bg-white rounded-xl border border-transparent shadow-[0_2px_16px_rgba(2,36,72,0.06)] overflow-hidden">
        <div className="h-1 w-full bg-emerald-500" />
        <div className="flex items-center gap-3 p-5">
          <div className="p-2 rounded-lg bg-green-100 shrink-0">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#022448]">Nenhuma ação necessária</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Esta conta não possui pendências ou itens para revisar.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const urgentRecs     = recommendations.filter((r) => r.priority === "urgent")
  const recommendedRecs = recommendations.filter((r) => r.priority === "recommended")

  return (
    <div className="bg-white rounded-xl border border-transparent shadow-[0_2px_16px_rgba(2,36,72,0.07)] overflow-hidden">
      {/* Card header */}
      <div className="flex items-center gap-2 px-5 py-4 border-b bg-[#f8f9fa]">
        <div className="p-1.5 rounded-lg bg-amber-100">
          <Zap className="h-4 w-4 text-amber-600" />
        </div>
        <h3 className="text-sm font-extrabold font-headline text-[#022448]">Ações recomendadas</h3>
        <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-white ring-1 ring-[#022448]/15 text-[#022448]">
          {recommendations.length}
        </span>
      </div>

      <div className="p-4 space-y-4">
        {urgentRecs.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Urgente
            </p>
            {urgentRecs.map((rec) => (
              <RecommendationRow key={rec.id} rec={rec} />
            ))}
          </div>
        )}

        {urgentRecs.length > 0 && recommendedRecs.length > 0 && (
          <div className="border-t border-[#022448]/8" />
        )}

        {recommendedRecs.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Recomendado
            </p>
            {recommendedRecs.map((rec) => (
              <RecommendationRow key={rec.id} rec={rec} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function RecommendationRow({ rec }: { rec: Recommendation }) {
  const cfg = PRIORITY_CONFIG[rec.priority]

  return (
    <div className={cn(
      "flex items-start justify-between gap-4 rounded-xl border p-3.5 overflow-hidden relative",
      cfg.rowBorder, cfg.rowBg
    )}>
      {/* left accent bar */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-0.5", cfg.accentBar)} />

      <div className="flex items-start gap-3 min-w-0 flex-1 pl-2">
        <span className={cn("mt-2 h-2 w-2 shrink-0 rounded-full", cfg.dot)} />
        <div className="min-w-0">
          <p className="text-sm font-bold text-[#022448] leading-tight">{rec.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{rec.description}</p>
        </div>
      </div>

      <Link href={rec.href} className="shrink-0">
        <Button
          size="sm"
          className={cn("h-7 text-xs px-3 whitespace-nowrap font-bold", cfg.btnClass)}
        >
          {rec.cta}
          <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      </Link>
    </div>
  )
}
