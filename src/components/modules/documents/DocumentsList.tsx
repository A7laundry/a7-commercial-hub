"use client"

import { useState } from "react"
import { Plus, FileText } from "lucide-react"
import { useDocuments } from "@/hooks/documents/useDocuments"
import { useQueryClient } from "@tanstack/react-query"
import { DocumentsTable } from "./DocumentsTable"
import { DocumentUploadDialog } from "./DocumentUploadDialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

type DocumentsListProps = {
  tenantId: string
  accountId?: string
  contractId?: string
}

export function DocumentsList({ tenantId, accountId, contractId }: DocumentsListProps) {
  const qc = useQueryClient()
  const [uploading, setUploading] = useState(false)

  const { data: documents = [], isPending: isLoading } = useDocuments(tenantId, {
    accountId,
    contractId,
  })

  function handleSuccess() {
    qc.invalidateQueries({ queryKey: ["documents", tenantId] })
  }

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Documentos ({isLoading ? "..." : documents.length})
        </h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setUploading(true)}
          className="h-7 text-xs border-[#022448]/20 hover:border-[#022448]/40 hover:bg-[#022448]/5 text-[#022448]"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Enviar
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-24 w-full rounded-xl" />
      ) : documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed border-[#022448]/15 rounded-xl bg-[#f8f9fa]">
          <div className="w-10 h-10 rounded-full bg-[#022448]/8 flex items-center justify-center mb-2">
            <FileText className="h-5 w-5 text-[#022448]/40" />
          </div>
          <p className="text-sm font-medium text-[#022448]/60">Nenhum documento</p>
          <p className="text-xs text-muted-foreground mt-0.5">Clique em Enviar para adicionar um arquivo.</p>
        </div>
      ) : (
        <DocumentsTable
          documents={documents}
          onDeleted={handleSuccess}
        />
      )}

      <DocumentUploadDialog
        open={uploading}
        onOpenChange={setUploading}
        tenantId={tenantId}
        accountId={accountId}
        contractId={contractId}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
