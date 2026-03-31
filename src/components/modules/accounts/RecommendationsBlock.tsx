import { ArrowRight, Zap, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import type { Recommendation } from "@/lib/account-summary"

const PRIORITY_CONFIG = {
  urgent: {
    badge: "bg-red-100 text-red-700 border border-red-200",
    label: "Urgente",
    dot: "bg-red-500",
    cardBorder: "border-red-100",
    cardBg: "bg-red-50/40",
    btnVariant: "default" as const,
    btnClass: "bg-red-600 hover:bg-red-700 text-white",
  },
  recommended: {
    badge: "bg-amber-100 text-amber-700 border border-amber-200",
    label: "Recomendado",
    dot: "bg-amber-400",
    cardBorder: "border-amber-100",
    cardBg: "bg-amber-50/40",
    btnVariant: "outline" as const,
    btnClass: "border-amber-300 text-amber-800 hover:bg-amber-50",
  },
} as const

type RecommendationsBlockProps = {
  recommendations: Recommendation[]
}

export function RecommendationsBlock({ recommendations }: RecommendationsBlockProps) {
  if (recommendations.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50/30">
        <CardContent className="flex items-center gap-3 py-5">
          <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">Nenhuma ação necessária</p>
            <p className="text-xs text-green-600 mt-0.5">
              Esta conta não possui pendências ou itens para revisar.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const urgentRecs = recommendations.filter((r) => r.priority === "urgent")
  const recommendedRecs = recommendations.filter((r) => r.priority === "recommended")

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Zap className="h-4 w-4 text-amber-500" />
          Ações recomendadas
          <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {recommendations.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {urgentRecs.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Urgente
            </p>
            {urgentRecs.map((rec) => (
              <RecommendationRow key={rec.id} rec={rec} />
            ))}
          </div>
        )}

        {urgentRecs.length > 0 && recommendedRecs.length > 0 && (
          <div className="border-t my-1" />
        )}

        {recommendedRecs.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Recomendado
            </p>
            {recommendedRecs.map((rec) => (
              <RecommendationRow key={rec.id} rec={rec} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function RecommendationRow({ rec }: { rec: Recommendation }) {
  const cfg = PRIORITY_CONFIG[rec.priority]

  return (
    <div
      className={`flex items-start justify-between gap-4 rounded-lg border p-3 ${cfg.cardBorder} ${cfg.cardBg}`}
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${cfg.dot}`} />
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight">{rec.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{rec.description}</p>
        </div>
      </div>
      <Link href={rec.href} className="shrink-0">
        <Button
          size="sm"
          variant={cfg.btnVariant}
          className={`h-7 text-xs px-3 whitespace-nowrap ${cfg.btnClass}`}
        >
          {rec.cta}
          <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      </Link>
    </div>
  )
}
