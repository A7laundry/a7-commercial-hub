import { FileX, ArrowRight } from "lucide-react"
import { DocumentStatusBadge } from "@/components/modules/documents/DocumentStatusBadge"
import Link from "next/link"
import { cn } from "@/lib/utils"
type DocumentSummary = {
  id: string; name: string; account_id: string | null; account_name: string | null
  contract_id: string | null; expires_at: string; status: string; daysUntilExpiry: number
}

export function ExpiringDocsCard({ documents }: { documents: DocumentSummary[] }) {
  return (
    <div className="bg-white rounded-xl border border-transparent shadow-[0_2px_16px_rgba(2,36,72,0.07)] overflow-hidden h-full flex flex-col">
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-[#f8f9fa]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-red-100">
            <FileX className="h-3.5 w-3.5 text-red-600" />
          </div>
          <h3 className="text-sm font-extrabold font-headline text-[#022448]">Documentos com vencimento</h3>
        </div>
        {documents.length > 0 && (
          <Link
            href="/documents"
            className="text-[10px] font-semibold text-muted-foreground hover:text-[#F5A623] flex items-center gap-1 transition-colors"
          >
            Ver todos
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      {/* Card body */}
      <div className="p-4 flex-1">
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhum documento vencido ou vencendo em breve.
          </p>
        ) : (
          <div className="space-y-1.5">
            {documents.slice(0, 5).map((d) => (
              <Link
                key={d.id}
                href="/documents"
                className="crm-card flex items-center justify-between rounded-lg bg-[#f8f9fa] px-3 py-2.5 hover:bg-red-50/60 transition-colors border border-transparent hover:border-red-100"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#022448] truncate">{d.name}</p>
                  <p className="text-xs text-muted-foreground">{d.account_name ?? "—"}</p>
                </div>
                <div className="ml-3 flex items-center gap-2 shrink-0">
                  <DocumentStatusBadge expires_at={d.expires_at} />
                  <span className={cn(
                    "text-xs font-bold whitespace-nowrap",
                    d.status === "expired" ? "text-red-600" : "text-amber-600"
                  )}>
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
                className="block text-xs font-semibold text-[#022448] hover:text-[#F5A623] text-center pt-2 transition-colors"
              >
                +{documents.length - 5} documentos adicionais
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
