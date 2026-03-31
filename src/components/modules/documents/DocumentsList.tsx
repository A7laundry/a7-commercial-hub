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

  const { data: documents = [], isLoading } = useDocuments(tenantId, {
    accountId,
    contractId,
  })

  function handleSuccess() {
    qc.invalidateQueries({ queryKey: ["documents", tenantId] })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-muted-foreground">
          Documentos ({isLoading ? "..." : documents.length})
        </h3>
        <Button size="sm" variant="outline" onClick={() => setUploading(true)}>
          <Plus className="w-3.5 h-3.5 mr-1" />
          Enviar
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-20 w-full" />
      ) : documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center border border-dashed rounded-lg">
          <FileText className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum documento</p>
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
