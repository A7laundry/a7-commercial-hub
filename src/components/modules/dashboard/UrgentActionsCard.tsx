import { AlertTriangle, AlertCircle, ArrowRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
type UrgentAction = {
  id: string; type: string; title: string; subtitle: string; href: string
  severity: "critical" | "warning"
}

export function UrgentActionsCard({ actions }: { actions: UrgentAction[] }) {
  if (actions.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardContent className="flex items-center gap-3 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100">
            <AlertCircle className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-green-800">Nenhuma ação urgente</p>
            <p className="text-xs text-green-600">Todos os contratos e documentos estão em ordem.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const criticals = actions.filter((a) => a.severity === "critical")
  const warnings = actions.filter((a) => a.severity === "warning")

  return (
    <Card className={criticals.length > 0 ? "border-red-200" : "border-amber-200"}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle
            className={`h-4 w-4 ${criticals.length > 0 ? "text-red-500" : "text-amber-500"}`}
          />
          Ações urgentes
          <span
            className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${
              criticals.length > 0
                ? "bg-red-100 text-red-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {actions.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {actions.slice(0, 6).map((action) => (
          <Link
            key={action.id}
            href={action.href}
            className={`flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:opacity-80 ${
              action.severity === "critical"
                ? "bg-red-50 border border-red-100"
                : "bg-amber-50 border border-amber-100"
            }`}
          >
            <AlertTriangle
              className={`mt-0.5 h-4 w-4 shrink-0 ${
                action.severity === "critical" ? "text-red-500" : "text-amber-500"
              }`}
            />
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-medium leading-tight ${
                  action.severity === "critical" ? "text-red-900" : "text-amber-900"
                }`}
              >
                {action.title}
              </p>
              <p
                className={`text-xs mt-0.5 ${
                  action.severity === "critical" ? "text-red-600" : "text-amber-600"
                }`}
              >
                {action.subtitle}
              </p>
            </div>
            <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        ))}
        {actions.length > 6 && (
          <p className="text-xs text-muted-foreground text-center pt-1">
            +{actions.length - 6} ações adicionais
          </p>
        )}
      </CardContent>
    </Card>
  )
}
