import { FileX, ArrowRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DocumentStatusBadge } from "@/components/modules/documents/DocumentStatusBadge"
import Link from "next/link"
import type { DocumentSummary } from "@/hooks/dashboard/useDashboardData"

export function ExpiringDocsCard({ documents }: { documents: DocumentSummary[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <FileX className="h-4 w-4 text-muted-foreground" />
            Documentos com vencimento
          </span>
          {documents.length > 0 && (
            <Link
              href="/documents"
              className="text-xs font-normal text-primary hover:underline flex items-center gap-1"
            >
              Ver todos
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhum documento vencido ou vencendo em breve.
          </p>
        ) : (
          <div className="space-y-2">
            {documents.slice(0, 5).map((d) => (
              <Link
                key={d.id}
                href="/documents"
                className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2.5 hover:bg-muted/70 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{d.name}</p>
                  <p className="text-xs text-muted-foreground">{d.account_name ?? "—"}</p>
                </div>
                <div className="ml-3 flex items-center gap-2 shrink-0">
                  <DocumentStatusBadge expires_at={d.expires_at} />
                  <span
                    className={`text-xs font-medium whitespace-nowrap ${
                      d.status === "expired" ? "text-red-600" : "text-amber-600"
                    }`}
                  >
                    {d.daysUntilExpiry >= 0
                      ? d.daysUntilExpiry === 0
                        ? "hoje"
                        : `em ${d.daysUntilExpiry}d`
                      : `há ${Math.abs(d.daysUntilExpiry)}d`}
                  </span>
                </div>
              </Link>
            ))}
            {documents.length > 5 && (
              <Link
                href="/documents"
                className="block text-xs text-primary hover:underline text-center pt-1"
              >
                +{documents.length - 5} documentos adicionais
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
