"use client"

import { useState } from "react"
import { Plus, FileText } from "lucide-react"
import { useTenant } from "@/hooks/useTenant"
import { useDocuments } from "@/hooks/documents/useDocuments"
import { useQueryClient } from "@tanstack/react-query"
import { DocumentsTable } from "@/components/modules/documents/DocumentsTable"
import { DocumentUploadDialog } from "@/components/modules/documents/DocumentUploadDialog"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const DOC_TYPES = [
  { value: "all", label: "Todos" },
  { value: "contract", label: "Contratos" },
  { value: "invoice", label: "Faturas" },
  { value: "certificate", label: "Certificados" },
  { value: "proposal", label: "Propostas" },
  { value: "other", label: "Outros" },
]

export default function DocumentsPage() {
  const { tenant } = useTenant()
  const qc = useQueryClient()
  const [docTypeFilter, setDocTypeFilter] = useState("all")
  const [uploading, setUploading] = useState(false)

  const { data: allDocuments = [], isPending: isLoading, error } = useDocuments(tenant.id, {
    docType: docTypeFilter !== "all" ? docTypeFilter : undefined,
  })

  function handleSuccess() {
    setUploading(false)
    qc.invalidateQueries({ queryKey: ["documents", tenant.id] })
  }

  return (
    <div>
      <PageHeader
        title="Documentos"
        description="Gerencie documentos e arquivos"
        actions={
          <Button onClick={() => setUploading(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Enviar documento
          </Button>
        }
      />

      <div className="flex items-center gap-3 mb-5">
        <Select value={docTypeFilter} onValueChange={(v) => setDocTypeFilter(v ?? "all")}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Todos os tipos" />
          </SelectTrigger>
          <SelectContent>
            {DOC_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {allDocuments.length} documento{allDocuments.length !== 1 ? "s" : ""}
        </span>
      </div>

      {error ? (
        <p className="text-sm text-destructive">Erro ao carregar documentos.</p>
      ) : !isLoading && allDocuments.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhum documento encontrado"
          description={
            docTypeFilter !== "all"
              ? "Nenhum documento com esse tipo."
              : "Envie seu primeiro documento para começar."
          }
          action={
            docTypeFilter === "all" ? (
              <Button size="sm" onClick={() => setUploading(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Enviar documento
              </Button>
            ) : undefined
          }
        />
      ) : (
        <DocumentsTable
          documents={allDocuments}
          isLoading={isLoading}
          onDeleted={() => qc.invalidateQueries({ queryKey: ["documents", tenant.id] })}
        />
      )}

      <DocumentUploadDialog
        open={uploading}
        onOpenChange={setUploading}
        tenantId={tenant.id}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
