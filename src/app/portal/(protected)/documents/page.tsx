"use client"

import { useState } from "react"
import { usePortalSession } from "@/components/providers/PortalProvider"
import { usePortalDocuments } from "@/hooks/portal/usePortalDocuments"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { cn, formatFileSize } from "@/lib/utils"
import { FolderOpen, Download, FileText } from "lucide-react"

const STATUS_CONFIG = {
  valid:     { label: "Válido",       color: "bg-green-100 text-green-700" },
  expiring:  { label: "Vencendo",     color: "bg-amber-100 text-amber-700" },
  expired:   { label: "Expirado",     color: "bg-red-100 text-red-700" },
  no_expiry: { label: "Sem validade", color: "bg-slate-100 text-slate-600" },
} as const

export default function PortalDocumentsPage() {
  const { account, tenant } = usePortalSession()
  const { data: documents = [], isLoading } = usePortalDocuments(tenant.id, account.id)
  const [downloading, setDownloading] = useState<string | null>(null)

  async function handleDownload(storagePath: string, name: string, docId: string) {
    setDownloading(docId)
    try {
      const supabase = createClient()
      const { data } = await supabase.storage.from("documents").createSignedUrl(storagePath, 60)
      if (data?.signedUrl) {
        const a = document.createElement("a")
        a.href = data.signedUrl
        a.download = name
        a.click()
      }
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Documentos</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Documentos vinculados à sua conta.</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <FolderOpen className="w-10 h-10 mb-3 opacity-20" />
          <p className="text-sm">Nenhum documento disponível.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => {
            const cfg = STATUS_CONFIG[doc._status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.no_expiry
            const size = doc.size_bytes ? formatFileSize(doc.size_bytes) : null
            const expires = doc.expires_at ? new Date(doc.expires_at).toLocaleDateString("pt-BR") : null
            return (
              <div key={doc.id} className="bg-card border rounded-lg p-3 flex items-center gap-3">
                <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-muted-foreground">{doc.doc_type}</span>
                    {size && <span className="text-xs text-muted-foreground">· {size}</span>}
                    {expires && <span className="text-xs text-muted-foreground">· Validade: {expires}</span>}
                    <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", cfg.color)}>{cfg.label}</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="shrink-0 gap-1.5"
                  disabled={downloading === doc.id}
                  onClick={() => handleDownload(doc.storage_path, doc.name, doc.id)}>
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Baixar</span>
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
